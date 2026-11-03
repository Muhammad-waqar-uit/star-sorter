/**
 * Shared types for Star Sorter.
 *
 * The types in this file are intentionally free of browser APIs so the rules
 * engine and the planning helpers can be unit tested in plain Node.
 */

export type MatchSpec = {
  /** Exact GitHub topic names (case insensitive). */
  topics?: string[]
  /** Exact primary language names (case insensitive). */
  languages?: string[]
  /** Case insensitive substrings matched against name, description and topics. */
  keywords?: string[]
  /** Repository owner logins, e.g. "microsoft". */
  owners?: string[]
  /** Keywords that veto a match for this rule. */
  exclude?: string[]
}

export type Rule = {
  /** Target list name. GitHub caps list names at 32 characters. */
  name: string
  description?: string
  match: MatchSpec
}

export type RuleSet = {
  /** Create new lists as private. */
  private: boolean
  /** How many lists a single repo may be filed into (first matches win). */
  maxListsPerRepo: number
  /** Evaluated top to bottom. */
  lists: Rule[]
}

export type StarredRepo = {
  id: string
  nameWithOwner: string
  owner: string
  description: string
  language: string
  topics: string[]
  stargazerCount: number
  isArchived: boolean
  updatedAt: string
}

export type GitHubList = {
  id: string
  name: string
  description: string
  isPrivate: boolean
  repoIds: string[]
}

export type Account = {
  login: string
  name?: string
  avatarUrl?: string
}

export type ScanResult = {
  at: number
  account: Account
  stars: StarredRepo[]
  lists: GitHubList[]
}

/** `null` means the repo will be skipped. */
export type PlanTarget = string | null

export type PlanItem = {
  repoId: string
  nameWithOwner: string
  description: string
  language: string
  topics: string[]
  suggested: PlanTarget
  target: PlanTarget
  alreadyInSuggested: boolean
  inAnyList: boolean
}

export type PlanSummary = {
  moves: number
  skips: number
  unchanged: number
  listsTouched: number
}

export type Settings = {
  /** Show repos that already live in a list. */
  includeSorted: boolean
  theme: "auto" | "light" | "dark"
}

export type ApplyItem = {
  repoId: string
  nameWithOwner: string
  /** Target list name; the worker creates it when missing. */
  targetList: string
}

export type ApplyFailure = {
  repoId: string
  nameWithOwner: string
  error: string
}

export type RunStatus = "idle" | "running" | "done" | "cancelled" | "error"

export type RunState = {
  id: string
  status: RunStatus
  total: number
  completed: number
  current: string | null
  createdLists: string[]
  failed: ApplyFailure[]
  skipped: number
  startedAt: number
  finishedAt?: number
  message?: string
}

export type UndoLog = {
  at: number
  /** repo node id -> list ids the repo belonged to before the run. */
  previous: Record<string, string[]>
  createdListIds: string[]
  /** Repo names for the undo summary. */
  names: Record<string, string>
}

export type ScanSummary = {
  at: number
  starCount: number
  listCount: number
  login: string
}

export type Session = {
  connected: boolean
  account: Account | null
  lastScan: ScanSummary | null
  undoAvailable: boolean
}

export type ErrorCode =
  | "auth"
  | "scope"
  | "rate-limit"
  | "network"
  | "graphql"
  | "list-limit"
  | "no-token"
  | "validation"
  | "unknown"

export type MessageResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ErrorCode }
