import { Storage } from "@plasmohq/storage"

import { DEFAULT_RULES } from "./defaults"
import { parseRuleSet } from "./rules"
import type {
  Account,
  RuleSet,
  RunState,
  ScanSummary,
  Settings,
  UndoLog
} from "./types"

/**
 * Everything stays in chrome.storage.local. The token is only ever read by the
 * background worker; UI pages ask the worker for connection status instead.
 */
const storage = new Storage({ area: "local" })

export const KEYS = {
  token: "token",
  account: "account",
  rules: "rules",
  settings: "settings",
  lastScan: "lastScan",
  undoLog: "undoLog",
  runState: "runState"
} as const

export const DEFAULT_SETTINGS: Settings = {
  includeSorted: false,
  theme: "auto"
}

export function cloneRules(rules: RuleSet): RuleSet {
  return JSON.parse(JSON.stringify(rules)) as RuleSet
}

async function read<T>(key: string): Promise<T | undefined> {
  return storage.get<T>(key)
}

async function remove(key: string): Promise<void> {
  await storage.remove(key)
}

async function write(key: string, value: unknown): Promise<void> {
  await storage.set(key, value)
}

export const getToken = (): Promise<string | undefined> => read<string>(KEYS.token)
export const setToken = (token: string): Promise<void> => write(KEYS.token, token)
export const clearToken = (): Promise<void> => remove(KEYS.token)

export const getAccount = (): Promise<Account | undefined> => read<Account>(KEYS.account)
export const setAccount = (account: Account): Promise<void> => write(KEYS.account, account)
export const clearAccount = (): Promise<void> => remove(KEYS.account)

export async function getRules(): Promise<RuleSet> {
  const stored = await read<RuleSet>(KEYS.rules)
  if (!stored) return cloneRules(DEFAULT_RULES)
  try {
    return parseRuleSet(stored)
  } catch {
    return cloneRules(DEFAULT_RULES)
  }
}

export const setRules = (rules: RuleSet): Promise<void> => write(KEYS.rules, rules)

export async function getSettings(): Promise<Settings> {
  const stored = await read<Settings>(KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
}

export const setSettings = (settings: Settings): Promise<void> =>
  write(KEYS.settings, settings)

export const getLastScan = (): Promise<ScanSummary | undefined> =>
  read<ScanSummary>(KEYS.lastScan)
export const setLastScan = (summary: ScanSummary): Promise<void> =>
  write(KEYS.lastScan, summary)

export const getUndoLog = (): Promise<UndoLog | undefined> => read<UndoLog>(KEYS.undoLog)
export const setUndoLog = (log: UndoLog): Promise<void> => write(KEYS.undoLog, log)
export const clearUndoLog = (): Promise<void> => remove(KEYS.undoLog)

export const getRunState = (): Promise<RunState | undefined> =>
  read<RunState>(KEYS.runState)
export const setRunState = (state: RunState): Promise<void> =>
  write(KEYS.runState, state)

/** Danger zone: remove everything this extension stored. */
export async function clearAllData(): Promise<void> {
  await storage.clear()
}
