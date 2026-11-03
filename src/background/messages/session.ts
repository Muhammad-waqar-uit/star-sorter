import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getAccount, getLastScan, getToken, getUndoLog } from "../../lib/storage"
import type { MessageResponse, Session } from "../../lib/types"
import { fail, ok } from "../utils"

/** Connection state for the panel, popup and options page. Never returns the token. */
const handler: PlasmoMessaging.MessageHandler<Record<string, never>, MessageResponse<Session>> =
  async (_req, res) => {
    try {
      const [token, account, lastScan, undo] = await Promise.all([
        getToken(),
        getAccount(),
        getLastScan(),
        getUndoLog()
      ])

      res.send(
        ok({
          connected: Boolean(token),
          account: token ? (account ?? null) : null,
          lastScan: lastScan ?? null,
          undoAvailable: Boolean(undo)
        })
      )
    } catch (error) {
      res.send(fail(error))
    }
  }

export default handler
