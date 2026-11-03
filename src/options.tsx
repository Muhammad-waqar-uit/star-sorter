import logoUrl from "data-base64:../assets/brand/icons/icon-128.png"
import { useCallback, useEffect, useState } from "react"

import "./style.css"

import { RulesEditor } from "./components/RulesEditor"
import { TokenForm } from "./components/TokenForm"
import { clearAllData, getSession, SorterError } from "./lib/client"
import { DEFAULT_RULES } from "./lib/defaults"
import {
  getRules,
  getSettings,
  setRules as persistRules,
  setSettings as persistSettings
} from "./lib/storage"
import type { RuleSet, Session, Settings } from "./lib/types"

function OptionsPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [rules, setRules] = useState<RuleSet>(DEFAULT_RULES)
  const [settings, setSettings] = useState<Settings>({ includeSorted: false, theme: "auto" })
  const [message, setMessage] = useState<{
    kind: "success" | "error"
    text: string
  } | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refreshSession = useCallback(async () => {
    try {
      setSession(await getSession())
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof SorterError ? error.message : String(error)
      })
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
    void Promise.all([getRules(), getSettings()])
      .then(([nextRules, nextSettings]) => {
        setRules(nextRules)
        setSettings(nextSettings)
      })
      .catch(() => undefined)
  }, [refreshSession])

  const updateSettings = async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    await persistSettings(next)
  }

  const saveRules = async (next: RuleSet) => {
    await persistRules(next)
    setRules(next)
  }

  const handleClear = async () => {
    if (!window.confirm("Clear the token, rules, settings and undo history from this browser?")) {
      return
    }
    try {
      await clearAllData()
      await refreshSession()
      setRules(DEFAULT_RULES)
      setSettings({ includeSorted: false, theme: "auto" })
      setMessage({ kind: "success", text: "All Star Sorter data cleared." })
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof SorterError ? error.message : String(error)
      })
    }
  }

  return (
    <div className="ss-page">
      <div className="ss-wrap">
        <header className="ss-page-head">
          <img src={logoUrl} alt="Star Sorter" />
          <div>
            <h1>Star Sorter</h1>
            <p>Organize your GitHub stars into Lists — locally, with rules you control.</p>
          </div>
        </header>

        {message && <div className={`ss-alert ${message.kind}`}>{message.text}</div>}

        <section className="ss-card">
          <h2>GitHub connection</h2>
          {loaded ? (
            <TokenForm
              connected={Boolean(session?.connected)}
              login={session?.account?.login}
              onChanged={async () => {
                await refreshSession()
                setMessage(null)
              }}
            />
          ) : (
            <p className="ss-muted">Loading…</p>
          )}
        </section>

        <section className="ss-card">
          <h2>Classification rules</h2>
          <RulesEditor rules={rules} repos={[]} onSaved={saveRules} />
        </section>

        <section className="ss-card">
          <h2>Preferences</h2>
          <div className="ss-row">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              value={settings.theme}
              onChange={(event) => void updateSettings({ theme: event.target.value as Settings["theme"] })}>
              <option value="auto">Match GitHub</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <label className="ss-check">
            <input
              type="checkbox"
              checked={settings.includeSorted}
              onChange={(event) => void updateSettings({ includeSorted: event.target.checked })}
            />
            Show repos that are already in a list after scanning
          </label>
        </section>

        <section className="ss-card">
          <h2>Privacy</h2>
          <p className="ss-muted">
            Star Sorter stores your token, rules, settings and undo log in{" "}
            <code>chrome.storage.local</code>. The only network destination is{" "}
            <code>api.github.com</code>. There is no backend, no analytics and no remote code.
          </p>
        </section>

        <section className="ss-card">
          <h2>Danger zone</h2>
          <p className="ss-muted">
            Removing the token disconnects the extension. Clearing data also resets rules and the
            undo log.
          </p>
          <button className="ss-btn danger" type="button" onClick={() => void handleClear()}>
            Clear all extension data
          </button>
        </section>

        <section className="ss-card">
          <h2>About</h2>
          <p className="ss-muted">
            Star Sorter v1.0.0 · Built with Plasmo, React and TypeScript.{" "}
            <a
              href="https://github.com/Muhammad-waqar-uit/star-sorter"
              target="_blank"
              rel="noreferrer">
              Source and documentation
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}

export default OptionsPage
