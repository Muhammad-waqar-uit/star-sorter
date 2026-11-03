import type { PlasmoMessaging } from "@plasmohq/messaging"

import { createList, deleteList, fetchLists, updateList } from "../../lib/github"
import { getToken } from "../../lib/storage"
import type { GitHubList, MessageResponse } from "../../lib/types"
import { fail, ok } from "../utils"

export type ListsAction = "refresh" | "create" | "update" | "delete"

export type ListsRequest = {
  action: ListsAction
  listId?: string
  name?: string
  description?: string
  isPrivate?: boolean
}

export type ListsResponse = {
  lists: GitHubList[]
}

const MAX_LISTS = 32

const handler: PlasmoMessaging.MessageHandler<ListsRequest, MessageResponse<ListsResponse>> = async (
  req,
  res
) => {
  try {
    const token = await getToken()
    if (!token) throw new Error("Add a GitHub token first.")

    const body = req.body ?? { action: "refresh" as const }

    if (body.action === "create") {
      const name = body.name?.trim()
      if (!name) throw new Error("A list name is required.")
      if (name.length > 32) throw new Error("List names must be 32 characters or fewer.")

      const existing = await fetchLists(token)
      if (existing.length >= MAX_LISTS) {
        throw new Error(`GitHub allows at most ${MAX_LISTS} lists. Delete one first.`)
      }

      await createList(token, {
        name,
        description: body.description?.trim() || "",
        isPrivate: Boolean(body.isPrivate)
      })
    }

    if (body.action === "update") {
      if (!body.listId) throw new Error("Missing list id.")
      const name = body.name?.trim()
      if (name && name.length > 32) throw new Error("List names must be 32 characters or fewer.")

      await updateList(token, {
        listId: body.listId,
        name: name || undefined,
        description: body.description,
        isPrivate: body.isPrivate
      })
    }

    if (body.action === "delete") {
      if (!body.listId) throw new Error("Missing list id.")
      await deleteList(token, body.listId)
    }

    res.send(ok({ lists: await fetchLists(token) }))
  } catch (error) {
    res.send(fail(error))
  }
}

export default handler
