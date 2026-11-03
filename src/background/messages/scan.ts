import type { PlasmoMessaging } from "@plasmohq/messaging"

import { fetchAllStars, fetchLists, getViewer, GitHubError } from "../../lib/github"
import { getToken, setAccount, setLastScan } from "../../lib/storage"
import type { MessageResponse, ScanResult, StarredRepo } from "../../lib/types"
import { fail, ok } from "../utils"

export type ScanRequest = Record<string, never>

/**
 * Read every star and every list. The scan can take a while for large
 * collections, so the UI shows the count from `onProgress` only after the
 * response lands; the fetch itself keeps the worker alive.
 */
const handler: PlasmoMessaging.MessageHandler<ScanRequest, MessageResponse<ScanResult>> = async (
  _req,
  res
) => {
  try {
    const token = await getToken()
    if (!token) {
      throw new GitHubError("Add a GitHub token first.", { code: "no-token" })
    }

    const account = await getViewer(token)
    const stars: StarredRepo[] = await fetchAllStars(token)
    const lists = await fetchLists(token)

    await setAccount(account)
    await setLastScan({
      at: Date.now(),
      starCount: stars.length,
      listCount: lists.length,
      login: account.login
    })

    res.send(
      ok({
        at: Date.now(),
        account,
        stars,
        lists
      })
    )
  } catch (error) {
    res.send(fail(error))
  }
}

export default handler
