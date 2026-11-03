import { ExternalLink, Palette, ShieldCheck, SlidersHorizontal, Trash2 } from "./icons"
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

function SectionTitle({
  icon: Icon,
  children
}: {
  icon: typeof Palette
  children: string
}) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-ink">
      <Icon className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
      {children}
    </h3>
  )
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
    <div className="space-y-4">
      <TokenForm
        connected={Boolean(session?.connected)}
        login={session?.account?.login}
        onChanged={onChanged}
      />

      <section>
        <SectionTitle icon={Palette}>Appearance</SectionTitle>
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-muted" htmlFor="ss-theme">
            Theme
          </label>
          <select
            id="ss-theme"
            className="ss-select w-auto"
            value={settings.theme}
            onChange={(event) => void update({ theme: event.target.value as Settings["theme"] })}>
            <option value="auto">Match GitHub</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </section>

      <section>
        <SectionTitle icon={SlidersHorizontal}>Defaults</SectionTitle>
        <label className="ss-check">
          <input
            type="checkbox"
            checked={settings.includeSorted}
            onChange={(event) => void update({ includeSorted: event.target.checked })}
          />
          Show repos that are already in a list after scanning
        </label>
      </section>

      <section className="rounded-xl border border-line bg-surface2/50 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            className="ss-btn ss-btn-sm"
            type="button"
            onClick={() => chrome.runtime.openOptionsPage()}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open full options
          </button>
          <button
            className="ss-btn ss-btn-sm ss-btn-danger"
            type="button"
            onClick={() => void handleClear()}
            disabled={busy !== null}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear all data
          </button>
        </div>
        {message && <div className="ss-alert mt-2">{message}</div>}
      </section>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Star Sorter keeps the token, rules and undo log in chrome.storage.local. No analytics, no
        backend, no requests outside api.github.com.
      </p>
    </div>
  )
}
