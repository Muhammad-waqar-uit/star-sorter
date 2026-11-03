import { useState } from "react"

import { clearAllData, SorterError } from "../lib/client"
import type { Session, Settings } from "../lib/types"
import { TokenForm } from "./TokenForm"

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
      <TokenForm
        connected={Boolean(session?.connected)}
        login={session?.account?.login}
        onChanged={onChanged}
      />

      <h3 style={{ marginTop: 16 }}>Appearance</h3>
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

      <div className="ss-row" style={{ marginTop: 16 }}>
        <button className="ss-btn" type="button" onClick={() => chrome.runtime.openOptionsPage()}>
          Open full options
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
