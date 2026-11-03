import logoUrl from "data-base64:../assets/brand/icons/icon-128.png"
import { useEffect, useState } from "react"

import "./style.css"

import { getSession } from "./lib/client"
import type { Session } from "./lib/types"

function Popup() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    void getSession()
      .then(setSession)
      .catch(() => undefined)
  }, [])

  const login = session?.account?.login
  const lastScan = session?.lastScan

  return (
    <div className="ss-page ss-popup">
      <header className="ss-page-head">
        <img src={logoUrl} alt="Star Sorter" />
        <div>
          <h1>Star Sorter</h1>
          <p>{session?.connected ? `Connected as ${login}` : "Not connected"}</p>
        </div>
      </header>

      <div className="ss-card">
        <div className="ss-kv">
          <span>Stars scanned</span>
          <span>{lastScan ? lastScan.starCount : "—"}</span>
        </div>
        <div className="ss-kv">
          <span>Lists</span>
          <span>{lastScan ? lastScan.listCount : "—"}</span>
        </div>
        <div className="ss-kv">
          <span>Last scan</span>
          <span>{lastScan ? new Date(lastScan.at).toLocaleString() : "Never"}</span>
        </div>
        <div className="ss-kv">
          <span>Undo available</span>
          <span>{session?.undoAvailable ? "Yes" : "No"}</span>
        </div>

        <div className="ss-actions">
          <button
            className="ss-btn primary"
            type="button"
            disabled={!login}
            onClick={() =>
              login && chrome.tabs.create({ url: `https://github.com/${login}?tab=stars` })
            }>
            Open my Stars
          </button>
          <button
            className="ss-btn"
            type="button"
            onClick={() => chrome.runtime.openOptionsPage()}>
            Options
          </button>
        </div>

        {!session?.connected && (
          <p className="ss-muted" style={{ marginBottom: 0 }}>
            Add a classic personal access token with the <code>user</code> scope in Options to
            start sorting.
          </p>
        )}
      </div>
    </div>
  )
}

export default Popup
