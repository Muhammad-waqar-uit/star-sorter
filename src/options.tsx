import logoUrl from "data-base64:../assets/brand/icons/icon-128.png"
import {
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Trash2
} from "./components/icons"
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

function SectionTitle({
  icon: Icon,
  children
}: {
  icon: typeof KeyRound
  children: string
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink">
      <span className="grid h-6 w-6 place-items-center rounded-lg bg-accent-soft text-accent">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      {children}
    </h2>
  )
}

function OptionsPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [rules, setRules] = useState<RuleSet>(DEFAULT_RULES)
  const [settings, setSettings] = useState<Settings>({ includeSorted: false, theme: "auto" })
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null)
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
        <header className="mb-5 flex flex-wrap items-center gap-3">
          <img
            src={logoUrl}
            alt="Star Sorter"
            className="h-12 w-12 rounded-xl shadow-float ring-1 ring-line"
          />
          <div className="min-w-0">
            <h1 className="ss-page-title">Star Sorter</h1>
            <p className="text-[12px] text-muted">
              Organize your GitHub stars into Lists — locally, with rules you control.
            </p>
          </div>
          <a
            className="ss-btn ss-btn-sm ml-auto"
            href="https://github.com/Muhammad-waqar-uit/star-sorter"
            target="_blank"
            rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Source
          </a>
        </header>

        {message && (
          <div
            className={`ss-alert ${message.kind === "error" ? "ss-alert-error" : "ss-alert-success"} flex items-start gap-2`}>
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {message.text}
          </div>
        )}

        <div className="space-y-3">
          <section className="ss-card">
            <SectionTitle icon={KeyRound}>GitHub connection</SectionTitle>
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
              <p className="text-[12px] text-muted">Loading…</p>
            )}
          </section>

          <section className="ss-card">
            <SectionTitle icon={SlidersHorizontal}>Classification rules</SectionTitle>
            <RulesEditor rules={rules} repos={[]} onSaved={saveRules} />
          </section>

          <section className="ss-card">
            <SectionTitle icon={Palette}>Preferences</SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[12px] text-muted" htmlFor="theme">
                Theme
              </label>
              <select
                id="theme"
                className="ss-select w-auto"
                value={settings.theme}
                onChange={(event) =>
                  void updateSettings({ theme: event.target.value as Settings["theme"] })
                }>
                <option value="auto">Match GitHub</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <label className="ss-check mt-2">
              <input
                type="checkbox"
                checked={settings.includeSorted}
                onChange={(event) => void updateSettings({ includeSorted: event.target.checked })}
              />
              Show repos that are already in a list after scanning
            </label>
          </section>

          <section className="ss-card">
            <SectionTitle icon={ShieldCheck}>Privacy</SectionTitle>
            <p className="text-[12px] leading-relaxed text-muted">
              Star Sorter stores your token, rules, settings and undo log in{" "}
              <code className="rounded bg-surface2 px-1 py-0.5 text-[11px]">
                chrome.storage.local
              </code>
              . The only network destination is{" "}
              <code className="rounded bg-surface2 px-1 py-0.5 text-[11px]">api.github.com</code>.
              There is no backend, no analytics and no remote code.
            </p>
          </section>

          <section className="ss-card border-danger/30">
            <SectionTitle icon={AlertOctagon}>Danger zone</SectionTitle>
            <p className="mb-2 text-[12px] leading-relaxed text-muted">
              Removing the token disconnects the extension. Clearing data also resets rules and
              the undo log.
            </p>
            <button
              className="ss-btn ss-btn-sm ss-btn-danger"
              type="button"
              onClick={() => void handleClear()}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear all extension data
            </button>
          </section>
        </div>

        <footer className="mt-6 text-center text-[11px] text-muted">
          Star Sorter v1.0.0 · Built with Plasmo, React and TypeScript ·{" "}
          <a
            className="text-accent hover:underline"
            href="https://github.com/Muhammad-waqar-uit/star-sorter"
            target="_blank"
            rel="noreferrer">
            documentation
          </a>
        </footer>
      </div>
    </div>
  )
}

export default OptionsPage
