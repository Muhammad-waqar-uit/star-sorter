import { sendToBackground } from "@plasmohq/messaging"

import type {
  ApplyItem,
  ApplyFailure,
  ErrorCode,
  GitHubList,
  MessageResponse,
  RunState,
  ScanProgress,
  ScanResult,
  Session
} from "./types"

export class SorterError extends Error {
  readonly code?: ErrorCode

  constructor(message: string, code?: ErrorCode) {
    super(message)
    this.name = "SorterError"
    this.code = code
  }
}

type SendFn = <B, R>(message: { name: string; body: B }) => Promise<R>

// Plasmo types message names from the generated manifest after a build; the
// cast keeps this helper usable during a clean checkout typecheck.
const send = sendToBackground as unknown as SendFn

async function call<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  let response: MessageResponse<T> | undefined

  try {
    response = await send<Record<string, unknown>, MessageResponse<T>>({ name, body })
  } catch (error) {
    throw new SorterError(
      `The extension worker is unreachable. Reload the page and try again. (${error instanceof Error ? error.message : String(error)})`
    )
  }

  if (!response) throw new SorterError("The extension worker did not respond.")
  if (!response.ok) throw new SorterError(response.error, response.code)
  return response.data
}

export const getSession = () => call<Session>("session")

export const saveToken = (token: string) =>
  call<{ login: string }>("validate-token", { token })

export const removeToken = () => call<{ cleared: true }>("validate-token", { clear: true })

export const scanStars = () => call<ScanResult>("scan")

export const getScanProgress = () => call<ScanProgress | null>("scan-progress")

export const applyPlan = (items: ApplyItem[]) =>
  call<{ runId: string; total: number }>("apply", { items })

export const getProgress = () => call<RunState | null>("progress")

export const cancelRun = () => call<{ cancelling: boolean }>("cancel")

export const undoLastRun = () =>
  call<{ restored: number; deletedLists: number; failures: ApplyFailure[] }>("undo")

export const listAction = (input: {
  action: "refresh" | "create" | "update" | "delete"
  listId?: string
  name?: string
  description?: string
  isPrivate?: boolean
}) => call<{ lists: GitHubList[] }>("lists", input)

export const clearAllData = () => call<{ cleared: true }>("clear-data")
