import type { PlasmoMessaging } from "@plasmohq/messaging"

import {
  getAccount,
  getLastScan,
  getRunState,
  getToken,
  getUndoLog
} from "../../lib/storage"
import type { MessageResponse, Session } from "../../lib/types"
import { fail, ok } from "../utils"

/** Connection state for the panel, popup and options page. Never returns the token. */
const handler: PlasmoMessaging.MessageHandler<Record<string, never>, MessageResponse<Session>> =
  async (_req, res) => {
    try {
      const [token, account, lastScan, run, undo] = await Promise.all([
        getToken(),
        getAccount(),
        getLastScan(),
        getRunState(),
        getUndoLog()
      ])

      res.send(
        ok({
          connected: Boolean(token),
          account: token ? (account ?? null) : null,
          lastScan: lastScan ?? null,
          lastRun: run
            ? {
                status: run.status,
                message: run.message ?? "",
                completed: run.completed,
                total: run.total,
                skipped: run.skipped,
                failed: run.failed.length,
                at: run.finishedAt ?? run.startedAt
              }
            : null,
          undoAvailable: Boolean(undo)
        })
      )
    } catch (error) {
      res.send(fail(error))
    }
  }

export default handler
