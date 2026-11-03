import { useState } from "react"

import { removeToken, saveToken, SorterError } from "../lib/client"

const TOKEN_URL =
  "https://github.com/settings/tokens/new?scopes=user&description=Star%20Sorter%20for%20GitHub"

type Props = {
  connected: boolean
  login?: string | null
  onChanged: () => void | Promise<void>
}

/**
 * Token entry. The token goes straight to the background worker; it is never
 * read back into this component, so the input is always empty after saving.
 */
export function TokenForm({ connected, login, onChanged }: Props) {
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replacing, setReplacing] = useState(false)

  const showForm = !connected || replacing

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveToken(token)
      setToken("")
      setReplacing(false)
      await onChanged()
    } catch (err) {
      setError(err instanceof SorterError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    setBusy(true)
    setError(null)
    try {
      await removeToken()
      await onChanged()
    } catch (err) {
      setError(err instanceof SorterError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h3>GitHub token</h3>
      <p className="ss-hint">
        Star Sorter needs a <strong>classic</strong> personal access token with the{" "}
        <code>user</code> scope. It is stored only in this browser and only sent to
        api.github.com.
      </p>

      {connected && !replacing && (
        <div className="ss-row">
          <span className="ss-badge">Connected as {login ?? "your account"}</span>
          <button className="ss-btn" type="button" onClick={() => setReplacing(true)}>
            Use a different token
          </button>
          <button className="ss-btn danger" type="button" onClick={handleRemove} disabled={busy}>
            Remove token
          </button>
        </div>
      )}

      {showForm && (
        <>
          <div className="ss-row">
            <input
              className="ss-grow"
              type="password"
              value={token}
              autoComplete="off"
              aria-label="GitHub personal access token"
              placeholder="ghp_…"
              onChange={(event) => setToken(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && token.trim()) void handleSave()
              }}
            />
            <button
              className="ss-btn primary"
              type="button"
              onClick={handleSave}
              disabled={busy || !token.trim()}>
              {busy ? "Checking…" : "Save token"}
            </button>
            {replacing && (
              <button
                className="ss-btn"
                type="button"
                onClick={() => {
                  setReplacing(false)
                  setToken("")
                  setError(null)
                }}>
                Cancel
              </button>
            )}
          </div>
          <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="ss-hint">
            Create a token with the right scope →
          </a>
        </>
      )}

      {error && <div className="ss-alert error">{error}</div>}
    </div>
  )
}
