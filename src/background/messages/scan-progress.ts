import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getScanProgress } from "../../lib/storage"
import type { MessageResponse, ScanProgress } from "../../lib/types"
import { fail, ok } from "../utils"

/** Polled by the panel while a scan is running. */
const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  MessageResponse<ScanProgress | null>
> = async (_req, res) => {
  try {
    res.send(ok((await getScanProgress()) ?? null))
  } catch (error) {
    res.send(fail(error))
  }
}

export default handler
