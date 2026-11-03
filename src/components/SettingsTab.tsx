import { useState } from "react"

import { clearAllData, removeToken, SorterError } from "../lib/client"
import type { Session, Settings } from "../lib/types"

type Props = {
  session: Session | null
  settings: Settings
  onSettings: (settings: Settings) => void | Promise<void>
  onChanged: () => void | Promise<void>
}

export function SettingsTab({ session, settings, onSettings, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const update = async (patch: Partial<Settings>) => {
    await onSettings({ ...settings, ...patch })
  }

  const handleDisconnect = async () => {
    setBusy("token")
    setMessage(null)
    try {
      await removeToken()
      await onChanged()
      setMessage("Token removed.")
    } catch (error) {
      setMessage(error instanceof SorterError ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  const handleClear = async () => {
    if (!window.confirm("Clear the token, rules, settings and undo history from this browser?")) {
      return
    }
    setBusy("clear")
    setMessage(null)
    try {
      await clearAllData()
      await onChanged()
      setMessage("All Star Sorter data cleared.")
    } catch (error) {
      setMessage(error instanceof SorterError ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="ss-row">
        <button
          className="ss-btn"
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}>
          Open full options
        </button>
      </div>

      <h3 style={{ marginTop: 12 }}>Appearance</h3>
      <div className="ss-row">
        <label className="ss-hint" htmlFor="ss-theme">
          Theme
        </label>
        <select
          id="ss-theme"
          value={settings.theme}
          onChange={(event) => void update({ theme: event.target.value as Settings["theme"] })}>
          <option value="auto">Match GitHub</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      <h3>Defaults</h3>
      <label className="ss-check">
        <input
          type="checkbox"
          checked={settings.includeSorted}
          onChange={(event) => void update({ includeSorted: event.target.checked })}
        />
        Show repos that are already in a list after scanning
      </label>

      <h3 style={{ marginTop: 16 }}>Account</h3>
      <p className="ss-hint">
        {session?.connected
          ? `Connected as ${session.account?.login ?? "your account"}.`
          : "No token stored."}
      </p>
      <div className="ss-row">
        <button
          className="ss-btn danger"
          type="button"
          onClick={() => void handleDisconnect()}
          disabled={!session?.connected || busy !== null}>
          Remove token
        </button>
        <button
          className="ss-btn danger"
          type="button"
          onClick={() => void handleClear()}
          disabled={busy !== null}>
          Clear all extension data
        </button>
      </div>

      {message && <div className="ss-alert">{message}</div>}

      <p className="ss-hint" style={{ marginTop: 16 }}>
        Star Sorter keeps the token, rules and undo log in chrome.storage.local. No analytics,
        no backend, no requests outside api.github.com.
      </p>
    </div>
  )
}
