import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getRunState } from "../../lib/storage"
import type { MessageResponse, RunState } from "../../lib/types"
import { fail, ok } from "../utils"

/** Polled by the panel every few hundred ms while a run is active. */
const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  MessageResponse<RunState | null>
> = async (_req, res) => {
  try {
    res.send(ok((await getRunState()) ?? null))
  } catch (error) {
    res.send(fail(error))
  }
}

export default handler
