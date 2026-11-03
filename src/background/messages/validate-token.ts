import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getViewer } from "../../lib/github"
import {
  clearAccount,
  clearToken,
  setAccount,
  setToken
} from "../../lib/storage"
import type { Account, MessageResponse } from "../../lib/types"
import { fail, ok } from "../utils"

export type ValidateTokenRequest = {
  /** New token to validate and save. */
  token?: string
  /** Remove the stored token instead. */
  clear?: boolean
}

export type ValidateTokenResponse = {
  cleared?: boolean
  account?: Account
  login?: string
}

/**
 * The only place the token is written. Validation uses the lightest possible
 * query so an invalid or under-scoped token is caught before any scan.
 */
const handler: PlasmoMessaging.MessageHandler<
  ValidateTokenRequest,
  MessageResponse<ValidateTokenResponse>
> = async (req, res) => {
  try {
    if (req.body?.clear) {
      await clearToken()
      await clearAccount()
      res.send(ok({ cleared: true }))
      return
    }

    const token = req.body?.token?.trim()
    if (!token) {
      res.send(fail(new Error("Paste a GitHub token first.")))
      return
    }

    const account = await getViewer(token)
    await setToken(token)
    await setAccount(account)
    res.send(ok({ account, login: account.login }))
  } catch (error) {
    res.send(fail(error))
  }
}

export default handler
