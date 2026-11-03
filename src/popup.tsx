import logoUrl from "data-base64:../assets/brand/icons/icon-128.png"
import { ExternalLink, Settings, Star, Undo2 } from "./components/icons"
import { useEffect, useState } from "react"

import "./style.css"

import { getSession } from "./lib/client"
import type { Session } from "./lib/types"

const TOKEN_GUIDE_URL =
  "https://github.com/Muhammad-waqar-uit/star-sorter/blob/main/docs/TOKEN_SETUP.md"

function Popup() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    void getSession()
      .then(setSession)
      .catch(() => undefined)
  }, [])

  const login = session?.account?.login
  const lastScan = session?.lastScan
  const lastRun = session?.lastRun

  return (
    <div className="ss-page ss-popup">
      <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <img
          src={logoUrl}
          alt=""
          className="h-9 w-9 rounded-xl ring-1 ring-line"
        />
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-bold tracking-tight text-ink">Star Sorter</h1>
          <p className="truncate text-[11px] text-muted">
            {session?.connected ? `@${login}` : "Not connected"}
          </p>
        </div>
        <span
          className={`ml-auto h-2 w-2 shrink-0 rounded-full ${
            session?.connected ? "bg-success" : "bg-muted/50"
          }`}
          aria-hidden="true"
        />
      </header>

      <div className="p-3">
        <div className="rounded-xl border border-line bg-surface2/60 p-3">
          <div className="ss-kv">
            <span>Stars scanned</span>
            <span className="tabular-nums">{lastScan ? lastScan.starCount : "—"}</span>
          </div>
          <div className="ss-kv">
            <span>Lists</span>
            <span className="tabular-nums">{lastScan ? lastScan.listCount : "—"}</span>
          </div>
          <div className="ss-kv">
            <span>Last scan</span>
            <span className="truncate text-[11px]">
              {lastScan ? new Date(lastScan.at).toLocaleString() : "Never"}
            </span>
          </div>
          <div className="ss-kv">
            <span>Last run</span>
            <span
              className="max-w-[168px] truncate text-[10.5px]"
              title={lastRun?.message || undefined}>
              {lastRun
                ? lastRun.status === "running"
                  ? "In progress…"
                  : lastRun.message || `${lastRun.completed} / ${lastRun.total} processed`
                : "—"}
            </span>
          </div>
          <div className="ss-kv">
            <span className="flex items-center gap-1.5">
              <Undo2 className="h-3 w-3" aria-hidden="true" />
              Undo available
            </span>
            <span>{session?.undoAvailable ? "Yes" : "No"}</span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-1.5">
          <button
            className="ss-btn ss-btn-primary w-full"
            type="button"
            disabled={!login}
            onClick={() =>
              login && chrome.tabs.create({ url: `https://github.com/${login}?tab=stars` })
            }>
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            Open my Stars
          </button>
          <button
            className="ss-btn w-full"
            type="button"
            onClick={() => chrome.runtime.openOptionsPage()}>
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            Options
          </button>
        </div>

        {!session?.connected ? (
          <div className="mt-2.5 text-[11px] leading-relaxed text-muted">
            <p>
              Add a classic token with the <code className="text-[10.5px]">user</code> scope in
              Options to start sorting. Fine-grained tokens cannot manage Lists.
            </p>
            <a
              className="mt-1 inline-flex items-center gap-1 font-medium text-accent hover:underline"
              href={TOKEN_GUIDE_URL}
              target="_blank"
              rel="noreferrer">
              How to create the token
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <a
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
            href={`https://github.com/${login}?tab=stars`}
            target="_blank"
            rel="noreferrer">
            Stars page
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  )
}

export default Popup
