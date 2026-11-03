import {
  createList,
  deleteList,
  fetchLists,
  GitHubError,
  updateListsForItem
} from "../lib/github"
import { buildUndoLog } from "../lib/history"
import { desiredListIds, findListByName, normalizeListName } from "../lib/plan"
import {
  getRules,
  getRunState,
  getToken,
  setRunState,
  setUndoLog
} from "../lib/storage"
import type {
  ApplyFailure,
  ApplyItem,
  GitHubList,
  RunState,
  UndoLog
} from "../lib/types"
import { describeError } from "./utils"
import {
  APPLY_DELAY_MS,
  isCancelRequested,
  resetCancel
} from "./run-control"

const MAX_GITHUB_LISTS = 32
const STALE_RUN_MS = 10 * 60 * 1000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export type BeginRunResult = {
  runId: string
  total: number
}

/** Validate, record a fresh running state and let the caller answer the UI. */
export async function beginRun(items: ApplyItem[]): Promise<BeginRunResult> {
  if (items.length === 0) {
    throw new Error("Nothing to do: pick at least one repo to move.")
  }

  const token = await getToken()
  if (!token) {
    throw new GitHubError("Add a GitHub token first.", { code: "no-token" })
  }

  const previous = await getRunState()
  if (
    previous?.status === "running" &&
    Date.now() - previous.startedAt < STALE_RUN_MS
  ) {
    throw new Error("A run is already in progress. Wait for it to finish or cancel it.")
  }

  const runId = createRunId()
  resetCancel()
  await setRunState({
    id: runId,
    status: "running",
    total: items.length,
    completed: 0,
    current: null,
    createdLists: [],
    failed: [],
    skipped: 0,
    startedAt: Date.now(),
    message: "Preparing…"
  })

  return { runId, total: items.length }
}

/**
 * Create missing lists, then file repos one at a time. The 250 ms gap keeps
 * mutation bursts under GitHub's secondary rate limits.
 */
export async function executeRun(runId: string, items: ApplyItem[]): Promise<RunState> {
  const state = makeState(runId, items.length)
  let lists: GitHubList[] = []

  try {
    const token = await getToken()
    if (!token) throw new GitHubError("Add a GitHub token first.", { code: "no-token" })

    await setRunState({ ...state, message: "Reading your lists…" })
    lists = await fetchLists(token)

    const rules = await getRules()
    const names = uniqueTargets(items)
    const missing = names.filter((name) => !findListByName(lists, name))

    if (lists.length + missing.length > MAX_GITHUB_LISTS) {
      throw new GitHubError(
        `GitHub allows at most ${MAX_GITHUB_LISTS} lists. This plan needs ${lists.length + missing.length}. Merge some rules or skip some repos.`,
        { code: "list-limit" }
      )
    }

    const previous: Record<string, string[]> = {}
    const repoNames: Record<string, string> = {}
    for (const item of items) {
      previous[item.repoId] = listIdsForRepo(item.repoId, lists)
      repoNames[item.repoId] = item.nameWithOwner
    }

    let undoLog: UndoLog = buildUndoLog({
      previous,
      createdListIds: [],
      names: repoNames
    })

    await setUndoLog(undoLog)

    for (const name of missing) {
      if (isCancelRequested()) break
      const rule = rules.lists.find(
        (entry) => normalizeListName(entry.name) === normalizeListName(name)
      )
      const created = await createList(token, {
        name,
        description: rule?.description ?? "",
        isPrivate: rules.private
      })
      const list: GitHubList = {
        id: created.id,
        name: created.name,
        description: rule?.description ?? "",
        isPrivate: rules.private,
        repoIds: []
      }
      lists = [...lists, list]
      state.createdLists.push(created.name)
      undoLog = { ...undoLog, createdListIds: [...undoLog.createdListIds, created.id] }
      await setUndoLog(undoLog)
      await setRunState({ ...state, current: `Created list “${created.name}”`, message: "Filing repos…" })
      await sleep(APPLY_DELAY_MS)
    }

    if (isCancelRequested()) {
      return finish(state, "cancelled", "Cancelled before any repo was moved.")
    }

    state.total = items.length
    await setRunState({ ...state, message: "Filing repos…" })

    for (const item of items) {
      if (isCancelRequested()) break

      const targetList = findListByName(lists, item.targetList)
      if (!targetList) {
        state.completed++
        state.failed.push({
          repoId: item.repoId,
          nameWithOwner: item.nameWithOwner,
          error: `List “${item.targetList}” was not created.`
        })
        await setRunState({ ...state })
        continue
      }

      const current = previous[item.repoId] ?? []
      const wanted = desiredListIds(current, targetList.id)

      if (wanted.length === current.length && current.includes(targetList.id)) {
        state.skipped++
        state.completed++
        await setRunState({ ...state, current: item.nameWithOwner })
        continue
      }

      try {
        await updateListsForItem(token, item.repoId, wanted)
        state.completed++
      } catch (error) {
        state.completed++
        state.failed.push({
          repoId: item.repoId,
          nameWithOwner: item.nameWithOwner,
          error: describeError(error)
        })

        if (error instanceof GitHubError && error.code === "rate-limit") {
          await setRunState({
            ...state,
            current: null,
            message: error.message
          })
          return finish(state, "error", error.message)
        }
      }

      await setRunState({ ...state, current: item.nameWithOwner })

      if (!isCancelRequested()) await sleep(APPLY_DELAY_MS)
    }

    if (isCancelRequested()) {
      return finish(
        state,
        "cancelled",
        `Cancelled after ${state.completed} of ${state.total}. Undo restores what changed.`
      )
    }

    const message =
      state.failed.length > 0
        ? `${state.completed} processed, ${state.failed.length} failed. Retry the failed rows or use Undo.`
        : `${state.completed} repo${state.completed === 1 ? "" : "s"} filed, ${state.createdLists.length} list${state.createdLists.length === 1 ? "" : "s"} created.`

    return finish(state, "done", message)
  } catch (error) {
    const failed = error instanceof GitHubError && error.code === "list-limit"
    return finish(
      state,
      "error",
      failed ? error.message : `Run failed: ${describeError(error)}`
    )
  }
}

function createRunId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  )
}

function uniqueTargets(items: ApplyItem[]): string[] {
  const seen = new Map<string, string>()
  for (const item of items) {
    const key = normalizeListName(item.targetList)
    if (!seen.has(key)) seen.set(key, item.targetList.trim())
  }
  return [...seen.values()]
}

function listIdsForRepo(repoId: string, lists: GitHubList[]): string[] {
  return lists.filter((list) => list.repoIds.includes(repoId)).map((list) => list.id)
}

function makeState(runId: string, total: number): RunState {
  return {
    id: runId,
    status: "running",
    total,
    completed: 0,
    current: null,
    createdLists: [],
    failed: [] as ApplyFailure[],
    skipped: 0,
    startedAt: Date.now(),
    message: "Starting…"
  }
}

async function finish(
  state: RunState,
  status: RunState["status"],
  message: string
): Promise<RunState> {
  const finished: RunState = {
    ...state,
    status,
    current: null,
    finishedAt: Date.now(),
    message
  }
  await setRunState(finished)
  return finished
}

/** Undo: restore previous memberships, then drop lists this run created if empty. */
export async function runUndo(log: UndoLog): Promise<{
  restored: number
  deletedLists: number
  failures: ApplyFailure[]
}> {
  const token = await getToken()
  if (!token) throw new GitHubError("Add a GitHub token first.", { code: "no-token" })

  const failures: ApplyFailure[] = []
  let restored = 0

  for (const [repoId, listIds] of Object.entries(log.previous)) {
    try {
      await updateListsForItem(token, repoId, listIds)
      restored++
    } catch (error) {
      failures.push({
        repoId,
        nameWithOwner: log.names[repoId] ?? repoId,
        error: describeError(error)
      })
    }
    await sleep(APPLY_DELAY_MS)
  }

  let deletedLists = 0
  if (log.createdListIds.length > 0) {
    try {
      const lists = await fetchLists(token)
      for (const listId of log.createdListIds) {
        const list = lists.find((entry) => entry.id === listId)
        if (list && list.repoIds.length === 0) {
          await deleteList(token, listId)
          deletedLists++
          await sleep(APPLY_DELAY_MS)
        }
      }
    } catch (error) {
      failures.push({
        repoId: "",
        nameWithOwner: "Delete empty lists",
        error: describeError(error)
      })
    }
  }

  return { restored, deletedLists, failures }
}


