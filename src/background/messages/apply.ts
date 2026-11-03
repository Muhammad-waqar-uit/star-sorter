import type { PlasmoMessaging } from "@plasmohq/messaging"

import { beginRun, executeRun } from "../apply-runner"
import type { ApplyItem, MessageResponse } from "../../lib/types"
import { fail, ok } from "../utils"

export type ApplyRequest = {
  items: ApplyItem[]
}

export type ApplyResponse = {
  runId: string
  total: number
}

/**
 * Answers as soon as the run is recorded, then files repos in the background.
 * The panel polls `progress` so it can close, reopen and still see live state.
 */
const handler: PlasmoMessaging.MessageHandler<ApplyRequest, MessageResponse<ApplyResponse>> = async (
  req,
  res
) => {
  try {
    const items = (req.body?.items ?? []).filter(
      (item): item is ApplyItem =>
        typeof item?.repoId === "string" &&
        item.repoId.length > 0 &&
        typeof item?.nameWithOwner === "string" &&
        typeof item?.targetList === "string" &&
        item.targetList.trim().length > 0
    )

    if (items.length === 0) {
      res.send(fail(new Error("Nothing to apply: pick at least one repo to move.")))
      return
    }

    const started = await beginRun(items)
    res.send(ok(started))

    void executeRun(started.runId, items).catch((error) => {
      console.error("[Star Sorter] apply run crashed", error)
    })
  } catch (error) {
    res.send(fail(error))
  }
}

export default handler
