import { DEFAULT_RULES } from "../lib/defaults"
import { getRules, getSettings, setRules, setSettings } from "../lib/storage"

/**
 * Background service worker entry.
 *
 * All GitHub traffic and the personal access token live here: the content
 * script never sees the token and never calls api.github.com directly.
 * The individual operations are @plasmohq/messaging handlers in ./messages.
 */

async function ensureDefaults(): Promise<void> {
  const rules = await getRules()
  if (!rules?.lists?.length) await setRules(DEFAULT_RULES)
  const settings = await getSettings()
  await setSettings(settings)
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureDefaults()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureDefaults()
})
