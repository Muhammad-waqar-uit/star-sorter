import type { PlasmoMessaging } from "@plasmohq/messaging"

import type { MessageResponse } from "../../lib/types"
import { requestCancel } from "../run-control"
import { ok } from "../utils"

export type CancelResponse = {
  cancelling: boolean
}

/** Stops after the in-flight GraphQL call, never mid-request. */
const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  MessageResponse<CancelResponse>
> = async (_req, res) => {
  requestCancel()
  res.send(ok({ cancelling: true }))
}

export default handler
