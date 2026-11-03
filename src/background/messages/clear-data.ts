import type { PlasmoMessaging } from "@plasmohq/messaging"

import { clearAllData } from "../../lib/storage"
import type { MessageResponse } from "../../lib/types"
import { resetCancel } from "../run-control"
import { fail, ok } from "../utils"

/** Danger zone: token, rules, settings, undo log and run state. */
const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  MessageResponse<{ cleared: boolean }>
> = async (_req, res) => {
  try {
    resetCancel()
    await clearAllData()
    res.send(ok({ cleared: true }))
  } catch (error) {
    res.send(fail(error))
  }
}

export default handler
