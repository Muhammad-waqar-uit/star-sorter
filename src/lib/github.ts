import type {
  Account,
  ErrorCode,
  GitHubList,
  StarredRepo
} from "./types"

const ENDPOINT = "https://api.github.com/graphql"

/**
 * Indirections so tests can stub network and timers without touching timers
 * globally (Vitest fake timers plus awaits are awkward).
 */
export const githubDeps = {
  fetch: (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    globalThis.fetch(input, init),
  sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
  now: (): number => Date.now()
}

export type GitHubErrorCode = ErrorCode

export class GitHubError extends Error {
  readonly code: GitHubErrorCode
  readonly status?: number
  readonly retryable: boolean
  readonly retryAfterSeconds?: number

  constructor(
    message: string,
    options: {
      code?: GitHubErrorCode
      status?: number
      retryable?: boolean
      retryAfterSeconds?: number
    } = {}
  ) {
    super(message)
    this.name = "GitHubError"
    this.code = options.code ?? "unknown"
    this.status = options.status
    this.retryable = options.retryable ?? false
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}

type GraphQLPayload<T> = {
  data?: T
  errors?: { message: string; type?: string }[]
  message?: string
}

const MAX_ATTEMPTS = 4

function retryDelay(attempt: number, retryAfterSeconds?: number): number {
  const backoff = 600 * 2 ** attempt
  const hint = retryAfterSeconds ? retryAfterSeconds * 1000 : 0
  return Math.max(backoff, hint, 600)
}

function rateLimitHint(response: Response): number | undefined {
  const retryAfter = response.headers.get("retry-after")
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds > 0) return seconds
  }

  const reset = response.headers.get("x-ratelimit-reset")
  if (reset) {
    const seconds = Number(reset) - Math.floor(githubDeps.now() / 1000)
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 60)
  }

  return undefined
}

function isRateLimitedGraphQLError(errors: { message: string; type?: string }[]): boolean {
  return errors.some(
    (error) =>
      error.type === "RATE_LIMITED" ||
      /rate limit|secondary rate/i.test(error.message)
  )
}

function isScopeGraphQLError(errors: { message: string; type?: string }[]): boolean {
  return errors.some(
    (error) =>
      error.type === "FORBIDDEN" ||
      /not accessible|resource not accessible|missing.*scope|must have.*scope/i.test(error.message)
  )
}

function mapHttpError(response: Response, payload: GraphQLPayload<unknown>): GitHubError {
  const status = response.status
  const detail = payload.message || (payload.errors ?? []).map((error) => error.message).join("; ")

  if (status === 401) {
    return new GitHubError("GitHub rejected the token. Create a new classic token with the `user` scope.", {
      code: "auth",
      status
    })
  }

  if (status === 403 || status === 429) {
    const retryAfterSeconds = rateLimitHint(response)
    if (retryAfterSeconds || response.headers.get("x-ratelimit-remaining") === "0") {
      return new GitHubError(
        `GitHub rate limit reached${retryAfterSeconds ? `, retry in about ${retryAfterSeconds}s` : ""}.`,
        { code: "rate-limit", status, retryable: true, retryAfterSeconds }
      )
    }
    return new GitHubError(
      "The token is missing a required scope. Use a classic token with the `user` scope.",
      { code: "scope", status }
    )
  }

  if (status >= 500) {
    return new GitHubError(`GitHub is having trouble (HTTP ${status}). Try again in a moment.`, {
      code: "network",
      status,
      retryable: true
    })
  }

  return new GitHubError(detail || `GitHub request failed (HTTP ${status}).`, {
    code: "graphql",
    status
  })
}

/**
 * POST a GraphQL operation. Retries network errors, 5xx and rate limits with
 * exponential backoff, and maps every failure to a human readable GitHubError.
 */
export async function gql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  if (!token) {
    throw new GitHubError("Add a GitHub token first.", { code: "no-token" })
  }

  let lastError: GitHubError | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await githubDeps.sleep(retryDelay(attempt - 1, lastError?.retryAfterSeconds))
    }

    let response: Response
    try {
      response = await githubDeps.fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ query, variables })
      })
    } catch (error) {
      lastError = new GitHubError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        { code: "network", retryable: true }
      )
      continue
    }

    let payload: GraphQLPayload<T> = {}
    try {
      payload = (await response.json()) as GraphQLPayload<T>
    } catch {
      // A non JSON body (proxy, rate limit page) still carries a status code.
    }

    if (!response.ok) {
      lastError = mapHttpError(response, payload)
      if (lastError.retryable) continue
      throw lastError
    }

    if (payload.errors && payload.errors.length > 0) {
      const message = payload.errors.map((error) => error.message).join("; ")
      if (isRateLimitedGraphQLError(payload.errors)) {
        lastError = new GitHubError(`GitHub rate limit: ${message}`, {
          code: "rate-limit",
          retryable: true,
          retryAfterSeconds: rateLimitHint(response)
        })
        continue
      }
      if (isScopeGraphQLError(payload.errors)) {
        throw new GitHubError(
          "The token cannot change lists. Use a classic token with the `user` scope.",
          { code: "scope" }
        )
      }
      throw new GitHubError(message, { code: "graphql" })
    }

    if (!payload.data) {
      lastError = new GitHubError("GitHub returned an empty response.", {
        code: "network",
        retryable: true
      })
      continue
    }

    return payload.data
  }

  throw lastError ?? new GitHubError("GitHub request failed.", { code: "unknown" })
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

export const VIEWER_QUERY = `
  query Viewer {
    viewer {
      login
      name
      avatarUrl
    }
  }
`

export const STARS_QUERY = `
  query Stars($after: String) {
    viewer {
      starredRepositories(first: 100, after: $after, orderBy: { field: STARRED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          nameWithOwner
          description
          isArchived
          stargazerCount
          updatedAt
          owner { login }
          primaryLanguage { name }
          repositoryTopics(first: 10) { nodes { topic { name } } }
        }
      }
    }
  }
`

export const LISTS_QUERY = `
  query Lists {
    viewer {
      lists(first: 50) {
        totalCount
        nodes { id name description isPrivate }
      }
    }
  }
`

export const LIST_ITEMS_QUERY = `
  query ListItems($id: ID!, $after: String) {
    node(id: $id) {
      ... on UserList {
        items(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { ... on Repository { id } }
        }
      }
    }
  }
`

export const CREATE_LIST_MUTATION = `
  mutation CreateList($input: CreateUserListInput!) {
    createUserList(input: $input) { list { id name } }
  }
`

export const UPDATE_LIST_MUTATION = `
  mutation UpdateList($input: UpdateUserListInput!) {
    updateUserList(input: $input) { list { id name } }
  }
`

export const DELETE_LIST_MUTATION = `
  mutation DeleteList($input: DeleteUserListInput!) {
    deleteUserList(input: $input) { clientMutationId }
  }
`

export const UPDATE_ITEM_LISTS_MUTATION = `
  mutation UpdateItemLists($input: UpdateUserListsForItemInput!) {
    updateUserListsForItem(input: $input) { clientMutationId }
  }
`

/* -------------------------------------------------------------------------- */
/* Read                                                                       */
/* -------------------------------------------------------------------------- */

type ViewerResponse = {
  viewer: { login: string; name?: string | null; avatarUrl?: string | null }
}

export async function getViewer(token: string): Promise<Account> {
  const data = await gql<ViewerResponse>(token, VIEWER_QUERY)
  return {
    login: data.viewer.login,
    name: data.viewer.name ?? undefined,
    avatarUrl: data.viewer.avatarUrl ?? undefined
  }
}

type StarsResponse = {
  viewer: {
    starredRepositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: {
        id: string
        nameWithOwner: string
        description: string | null
        isArchived: boolean
        stargazerCount: number
        updatedAt: string
        owner: { login: string }
        primaryLanguage: { name: string } | null
        repositoryTopics: { nodes: { topic: { name: string } }[] }
      }[]
    }
  }
}

/** Page through every starred repository, 100 at a time. */
export async function fetchAllStars(
  token: string,
  onProgress?: (count: number) => void
): Promise<StarredRepo[]> {
  const stars: StarredRepo[] = []
  let after: string | null = null

  do {
    const data: StarsResponse = await gql<StarsResponse>(token, STARS_QUERY, { after })
    const page = data.viewer.starredRepositories

    for (const node of page.nodes) {
      stars.push({
        id: node.id,
        nameWithOwner: node.nameWithOwner,
        owner: node.owner.login,
        description: node.description ?? "",
        language: node.primaryLanguage?.name ?? "",
        topics: node.repositoryTopics.nodes.map((entry) => entry.topic.name),
        stargazerCount: node.stargazerCount,
        isArchived: node.isArchived,
        updatedAt: node.updatedAt
      })
    }

    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
    onProgress?.(stars.length)
  } while (after)

  return stars
}

type ListsResponse = {
  viewer: {
    lists: {
      totalCount: number
      nodes: { id: string; name: string; description: string | null; isPrivate: boolean }[]
    }
  }
}

type ListItemsResponse = {
  node: {
    items: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: ({ id: string } | null)[]
    }
  } | null
}

export async function fetchListItems(token: string, listId: string): Promise<string[]> {
  const ids: string[] = []
  let after: string | null = null

  do {
    const data: ListItemsResponse = await gql<ListItemsResponse>(token, LIST_ITEMS_QUERY, {
      id: listId,
      after
    })
    const items = data.node?.items
    if (!items) break

    for (const node of items.nodes) {
      if (node?.id) ids.push(node.id)
    }

    after = items.pageInfo.hasNextPage ? items.pageInfo.endCursor : null
  } while (after)

  return ids
}

/** Read every list plus the repositories inside it. */
export async function fetchLists(
  token: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<GitHubList[]> {
  const data = await gql<ListsResponse>(token, LISTS_QUERY)
  const nodes = data.viewer.lists.nodes
  const total = nodes.length
  const lists: GitHubList[] = []

  for (const [index, node] of nodes.entries()) {
    const repoIds = await fetchListItems(token, node.id)
    lists.push({
      id: node.id,
      name: node.name,
      description: node.description ?? "",
      isPrivate: node.isPrivate,
      repoIds
    })
    onProgress?.(index + 1, total)
  }

  return lists
}

/* -------------------------------------------------------------------------- */
/* Write                                                                      */
/* -------------------------------------------------------------------------- */

export async function createList(
  token: string,
  input: { name: string; description?: string; isPrivate: boolean }
): Promise<{ id: string; name: string }> {
  const data = await gql<{ createUserList: { list: { id: string; name: string } } }>(
    token,
    CREATE_LIST_MUTATION,
    { input }
  )
  return data.createUserList.list
}

export async function updateList(
  token: string,
  input: { listId: string; name?: string; description?: string; isPrivate?: boolean }
): Promise<{ id: string; name: string }> {
  const data = await gql<{ updateUserList: { list: { id: string; name: string } } }>(
    token,
    UPDATE_LIST_MUTATION,
    { input }
  )
  return data.updateUserList.list
}

export async function deleteList(token: string, listId: string): Promise<void> {
  await gql(token, DELETE_LIST_MUTATION, { input: { listId } })
}

/**
 * Replaces the complete set of lists a repository belongs to, so callers must
 * merge the target list with the repo's current memberships.
 */
export async function updateListsForItem(
  token: string,
  itemId: string,
  listIds: string[]
): Promise<void> {
  await gql(token, UPDATE_ITEM_LISTS_MUTATION, { input: { itemId, listIds } })
}
