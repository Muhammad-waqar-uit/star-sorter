import type { PlasmoMessaging } from "@plasmohq/messaging"

import { runUndo } from "../apply-runner"
import { clearUndoLog, getUndoLog } from "../../lib/storage"
import type { ApplyFailure, MessageResponse } from "../../lib/types"
import { fail, ok } from "../utils"

export type UndoResponse = {
  restored: number
  deletedLists: number
  failures: ApplyFailure[]
}

/** Restore memberships from the single most recent run. */
const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  MessageResponse<UndoResponse>
> = async (_req, res) => {
  try {
    const log = await getUndoLog()
    if (!log) {
      res.send(fail(new Error("There is no run to undo.")))
      return
    }

    const result = await runUndo(log)
    // Keep the log when part of the undo failed so the user can retry it.
    if (result.failures.length === 0) await clearUndoLog()
    res.send(ok(result))
  } catch (error) {
    res.send(fail(error))
  }
}

export default handler
