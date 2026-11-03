/**
 * Cancellation is intentionally in-memory: a service worker restart ends the
 * run anyway, so persisting the flag would only block the next attempt.
 */
let cancelRequested = false

export function requestCancel(): void {
  cancelRequested = true
}

export function resetCancel(): void {
  cancelRequested = false
}

export function isCancelRequested(): boolean {
  return cancelRequested
}

export const APPLY_DELAY_MS = 250
