import { afterEach, describe, expect, it, vi } from "vitest"

import {
  fetchAllStars,
  fetchListItems,
  fetchLists,
  gql,
  GitHubError,
  githubDeps
} from "./github"

const originalFetch = githubDeps.fetch
const originalSleep = githubDeps.sleep

afterEach(() => {
  githubDeps.fetch = originalFetch
  githubDeps.sleep = originalSleep
  vi.restoreAllMocks()
})

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  })

const starNode = (id: string) => ({
  id,
  nameWithOwner: `acme/${id}`,
  description: "desc",
  isArchived: false,
  stargazerCount: 5,
  updatedAt: "2026-01-01T00:00:00Z",
  owner: { login: "acme" },
  primaryLanguage: { name: "TypeScript" },
  repositoryTopics: { nodes: [{ topic: { name: "cli" } }] }
})

describe("gql", () => {
  it("maps a 401 to an auth error without retrying", async () => {
    const fetchMock = vi.fn(async () => json({ message: "Bad credentials" }, 401))
    githubDeps.fetch = fetchMock as unknown as typeof fetch
    githubDeps.sleep = async () => undefined

    await expect(gql("bad", "query { viewer { login } }")).rejects.toMatchObject({
      code: "auth"
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("retries 5xx responses and returns the eventual data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ message: "boom" }, 502))
      .mockResolvedValueOnce(json({ data: { viewer: { login: "octocat" } } }))
    githubDeps.fetch = fetchMock as unknown as typeof fetch
    const sleepMock = vi.fn(async () => undefined)
    githubDeps.sleep = sleepMock

    const data = await gql<{ viewer: { login: string } }>("t", "query { viewer { login } }")
    expect(data.viewer.login).toBe("octocat")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sleepMock).toHaveBeenCalledTimes(1)
  })

  it("surfaces GraphQL scope errors as a scope error", async () => {
    githubDeps.fetch = (async () =>
      json({
        errors: [{ message: "Resource not accessible by personal access token", type: "FORBIDDEN" }]
      })) as unknown as typeof fetch

    await expect(gql("t", "mutation {}")).rejects.toBeInstanceOf(GitHubError)
    await expect(gql("t", "mutation {}")).rejects.toMatchObject({ code: "scope" })
  })

  it("passes through plain GraphQL errors", async () => {
    githubDeps.fetch = (async () =>
      json({ errors: [{ message: "Something is off" }] })) as unknown as typeof fetch

    await expect(gql("t", "query {}")).rejects.toMatchObject({
      code: "graphql",
      message: "Something is off"
    })
  })
})

describe("fetchAllStars", () => {
  it("pages through every starred repository", async () => {
    const cursors: (string | null)[] = []
    let call = 0

    githubDeps.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { variables: { after: string | null } }
      cursors.push(body.variables.after)
      call++

      return json({
        data: {
          viewer: {
            starredRepositories: {
              pageInfo:
                call === 1
                  ? { hasNextPage: true, endCursor: "cursor-1" }
                  : { hasNextPage: false, endCursor: null },
              nodes: [starNode(`r${call}`)]
            }
          }
        }
      })
    }) as unknown as typeof fetch

    const stars = await fetchAllStars("t")
    expect(cursors).toEqual([null, "cursor-1"])
    expect(stars).toHaveLength(2)
    expect(stars[0]).toMatchObject({ id: "r1", owner: "acme", topics: ["cli"] })
  })
})

describe("lists", () => {
  it("reads list items with pagination", async () => {
    let call = 0
    githubDeps.fetch = (async () => {
      call++
      return json({
        data: {
          node: {
            items: {
              pageInfo:
                call === 1
                  ? { hasNextPage: true, endCursor: "c1" }
                  : { hasNextPage: false, endCursor: null },
              nodes: [{ id: call === 1 ? "repo-1" : "repo-2" }]
            }
          }
        }
      })
    }) as unknown as typeof fetch

    expect(await fetchListItems("t", "L1")).toEqual(["repo-1", "repo-2"])
  })

  it("reads all lists and their repos", async () => {
    githubDeps.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query: string; variables: unknown }

      if (body.query.includes("query Lists")) {
        return json({
          data: {
            viewer: {
              lists: {
                totalCount: 1,
                nodes: [
                  { id: "L1", name: "CLI", description: "tools", isPrivate: false }
                ]
              }
            }
          }
        })
      }

      return json({
        data: {
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ id: "repo-1" }]
            }
          }
        }
      })
    }) as unknown as typeof fetch

    const lists = await fetchLists("t")
    expect(lists).toHaveLength(1)
    expect(lists[0]).toMatchObject({ id: "L1", name: "CLI", repoIds: ["repo-1"] })
  })
})
