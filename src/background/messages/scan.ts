import type { PlasmoMessaging } from "@plasmohq/messaging"

import { fetchAllStars, fetchLists, getViewer, GitHubError } from "../../lib/github"
import {
  clearScanProgress,
  getToken,
  setAccount,
  setLastScan,
  setScanProgress
} from "../../lib/storage"
import type { MessageResponse, ScanResult, StarredRepo } from "../../lib/types"
import { fail, ok } from "../utils"

export type ScanRequest = Record<string, never>

/**
 * Read every star and every list. Progress is written to storage after each
 * page so the panel can show a live counter; it is cleared when the scan ends,
 * whether it succeeded or failed.
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

    await setScanProgress({
      phase: "stars",
      stars: 0,
      listsLoaded: 0,
      listsTotal: 0,
      at: Date.now()
    })

    const account = await getViewer(token)

    const stars: StarredRepo[] = await fetchAllStars(token, (count) => {
      void setScanProgress({
        phase: "stars",
        stars: count,
        listsLoaded: 0,
        listsTotal: 0,
        at: Date.now()
      })
    })

    await setScanProgress({
      phase: "lists",
      stars: stars.length,
      listsLoaded: 0,
      listsTotal: 0,
      at: Date.now()
    })

    const lists = await fetchLists(token, (loaded, total) => {
      void setScanProgress({
        phase: "lists",
        stars: stars.length,
        listsLoaded: loaded,
        listsTotal: total,
        at: Date.now()
      })
    })

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
  } finally {
    await clearScanProgress()
  }
}

export default handler
