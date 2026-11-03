import type { UndoLog } from "./types"

/**
 * Record what the last run changed so it can be reverted: the previous list
 * memberships per repo and the lists the run created.
 */
export function buildUndoLog(input: {
  previous: Record<string, string[]>
  createdListIds: string[]
  names: Record<string, string>
  at?: number
}): UndoLog {
  return {
    at: input.at ?? Date.now(),
    previous: Object.fromEntries(
      Object.entries(input.previous).map(([repoId, listIds]) => [repoId, [...listIds]])
    ),
    createdListIds: [...input.createdListIds],
    names: { ...input.names }
  }
}

export type UndoEntry = {
  repoId: string
  nameWithOwner: string
  listIds: string[]
}

/** Stable, repo-name sorted entries for progress reporting. */
export function undoEntries(log: UndoLog): UndoEntry[] {
  return Object.entries(log.previous)
    .map(([repoId, listIds]) => ({
      repoId,
      nameWithOwner: log.names[repoId] ?? repoId,
      listIds: [...listIds]
    }))
    .sort((a, b) => a.nameWithOwner.localeCompare(b.nameWithOwner))
}

/** Only the most recent run is kept in v1. */
export function isUndoFresh(log: UndoLog | undefined, maxAgeMs = 7 * 24 * 60 * 60 * 1000): boolean {
  return Boolean(log) && Date.now() - (log as UndoLog).at < maxAgeMs
}
