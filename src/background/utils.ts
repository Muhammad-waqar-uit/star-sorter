import { GitHubError } from "../lib/github"
import type { MessageResponse } from "../lib/types"

export function ok<T>(data: T): MessageResponse<T> {
  return { ok: true, data }
}

export function fail(error: unknown): MessageResponse<never> {
  if (error instanceof GitHubError) {
    return { ok: false, error: error.message, code: error.code }
  }

  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    code: "unknown"
  }
}

/** Human readable text for the run log and failed rows. */
export function describeError(error: unknown): string {
  if (error instanceof GitHubError) return error.message
  return error instanceof Error ? error.message : String(error)
}
