import { useCallback, useEffect, useMemo, useState } from "react"

import logoUrl from "data-base64:../../assets/brand/icons/icon-48.png"

import {
  applyPlan,
  cancelRun,
  getProgress,
  getSession,
  scanStars,
  SorterError,
  undoLastRun
} from "../lib/client"
import { DEFAULT_RULES } from "../lib/defaults"
import { applyOverrides, buildPlan, planToApplyItems, summarizePlan } from "../lib/plan"
import { ruleListNames } from "../lib/rules"
import {
  getRules as loadRules,
  getSettings as loadSettings,
  setRules as persistRules,
  setSettings as persistSettings
} from "../lib/storage"
import type {
  GitHubList,
  PlanItem,
  RuleSet,
  RunState,
  ScanResult,
  Session,
  Settings,
  StarredRepo
} from "../lib/types"
import { ListManager } from "./ListManager"
import { PlanTable } from "./PlanTable"
import { ProgressBar } from "./ProgressBar"
import { RulesEditor } from "./RulesEditor"
import { SettingsTab } from "./SettingsTab"
import { TokenForm } from "./TokenForm"

type Tab = "sort" | "lists" | "rules" | "settings"

type Props = {
  theme: "dark" | "light"
  onClose: () => void
}

type Notice = { kind: "info" | "error" | "success" | "warn"; text: string }

export function Panel({ theme, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("sort")
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [rules, setRules] = useState<RuleSet>(DEFAULT_RULES)
  const [settings, setSettings] = useState<Settings>({ includeSorted: false, theme: "auto" })
  const [stars, setStars] = useState<StarredRepo[] | null>(null)
  const [lists, setLists] = useState<GitHubList[]>([])
  const [overrides, setOverrides] = useState<Record<string, string | null>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [run, setRun] = useState<RunState | null>(null)

  const refreshSession = useCallback(async () => {
    try {
      setSession(await getSession())
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof SorterError ? error.message : String(error)
      })
    } finally {
      setSessionLoaded(true)
    }
  }, [])

  const loadPrefs = useCallback(async () => {
    try {
      const [nextRules, nextSettings] = await Promise.all([loadRules(), loadSettings()])
      setRules(nextRules)
      setSettings(nextSettings)
    } catch {
      // Defaults are fine when storage is unavailable.
    }
  }, [])

  useEffect(() => {
    void refreshSession()
    void loadPrefs()

    void (async () => {
      try {
        const state = await getProgress()
        if (state?.status === "running") setRun(state)
      } catch {
        // A stale worker should not block the panel.
      }
    })()
  }, [refreshSession, loadPrefs])

  // Poll progress while a run is active; also survives closing and reopening.
  useEffect(() => {
    if (run?.status !== "running") return

    let stopped = false
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const next = await getProgress()
          if (stopped || !next) return
          setRun(next)
          if (next.status !== "running") void refreshSession()
        } catch {
          // Keep polling; transient worker restarts are expected.
        }
      })()
    }, 700)

    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [run?.status, refreshSession])

  const plan: PlanItem[] = useMemo(
    () => (stars ? applyOverrides(buildPlan(stars, rules, lists), overrides) : []),
    [stars, rules, lists, overrides]
  )
  const summary = useMemo(() => summarizePlan(plan, lists), [plan, lists])
  const applyItems = useMemo(() => planToApplyItems(plan, lists), [plan, lists])

  const handleSettings = async (next: Settings) => {
    setSettings(next)
    await persistSettings(next)
  }

  const handleScan = async () => {
    setBusy("scan")
    setNotice({ kind: "info", text: "Scanning your stars and lists…" })
    try {
      const result: ScanResult = await scanStars()
      setStars(result.stars)
      setLists(result.lists)
      setOverrides({})
      setNotice({
        kind: "success",
        text: `Found ${result.stars.length} stars and ${result.lists.length} lists for ${result.account.login}.`
      })
      await refreshSession()
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof SorterError ? error.message : String(error)
      })
    } finally {
      setBusy(null)
    }
  }

  const handleApply = async (items: typeof applyItems = applyItems) => {
    if (items.length === 0) {
      setNotice({ kind: "warn", text: "Every selected repo is already in its target list." })
      return
    }

    setBusy("apply")
    setNotice(null)
    try {
      const started = await applyPlan(items)
      setRun({
        id: started.runId,
        status: "running",
        total: started.total,
        completed: 0,
        current: null,
        createdLists: [],
        failed: [],
        skipped: 0,
        startedAt: Date.now(),
        message: "Starting…"
      })
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof SorterError ? error.message : String(error)
      })
    } finally {
      setBusy(null)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelRun()
      setNotice({ kind: "info", text: "Cancelling after the current request…" })
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof SorterError ? error.message : String(error)
      })
    }
  }

  const handleUndo = async () => {
    if (!window.confirm("Restore list memberships from before the last run?")) return

    setBusy("undo")
    setNotice(null)
    try {
      const result = await undoLastRun()
      setOverrides({})
      await refreshSession()

      // Refresh the preview without clobbering the undo summary.
      try {
        const refreshed = await scanStars()
        setStars(refreshed.stars)
        setLists(refreshed.lists)
      } catch {
        // The undo itself succeeded; a rescan can be triggered manually.
      }

      setNotice({
        kind: result.failures.length > 0 ? "warn" : "success",
        text: `Restored ${result.restored} repo(s); removed ${result.deletedLists} empty list(s)${
          result.failures.length ? `, ${result.failures.length} failed` : ""
        }.`
      })
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof SorterError ? error.message : String(error)
      })
    } finally {
      setBusy(null)
    }
  }

  const saveRules = async (next: RuleSet) => {
    await persistRules(next)
    setRules(next)
    setOverrides({})
  }

  const connected = Boolean(session?.connected)
  const running = run?.status === "running"
  const failedIds = new Set(run?.failed.map((failure) => failure.repoId) ?? [])
  const retryItems = applyItems.filter((item) => failedIds.has(item.repoId))

  return (
    <div className={`ss-panel ss-theme-${theme}`} role="dialog" aria-label="Star Sorter">
      <header className="ss-header">
        <span className="ss-brand">
          <img src={logoUrl} alt="" />
          Star Sorter
        </span>
        <span className="ss-status" title={session?.account?.login}>
          <i className={`ss-dot ${connected ? "on" : ""}`} />
          {running
            ? "Run in progress…"
            : connected
              ? `Connected as ${session?.account?.login ?? "you"}`
              : "Not connected"}
        </span>
        <button className="ss-icon-btn" type="button" aria-label="Close panel" onClick={onClose}>
          ×
        </button>
      </header>

      {connected && (
        <nav className="ss-tabs" aria-label="Sections">
          {(
            [
              ["sort", "Sort"],
              ["lists", "Lists"],
              ["rules", "Rules"],
              ["settings", "Settings"]
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`ss-tab ${tab === key ? "active" : ""}`}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>
      )}

      <div className="ss-body">
        {!sessionLoaded ? (
          <div className="ss-empty">Loading…</div>
        ) : !connected ? (
          <TokenForm
            connected={false}
            onChanged={async () => {
              await refreshSession()
              setNotice(null)
            }}
          />
        ) : tab === "sort" ? (
          <>
            {notice && <div className={`ss-alert ${notice.kind}`}>{notice.text}</div>}

            {!stars ? (
              <div className="ss-empty">
                <strong>Scan your stars</strong>
                Star Sorter reads every starred repo and your existing lists, then proposes a list
                for each repo. Nothing changes until you press Apply.
                <div className="ss-actions" style={{ justifyContent: "center" }}>
                  <button
                    className="ss-btn primary"
                    type="button"
                    onClick={() => void handleScan()}
                    disabled={busy !== null}>
                    {busy === "scan" ? "Scanning…" : "Scan and preview"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="ss-row">
                  <span className="ss-hint">
                    {stars.length} stars · {lists.length} lists ·{" "}
                    {new Date(session?.lastScan?.at ?? Date.now()).toLocaleString()}
                  </span>
                  <button
                    className="ss-btn"
                    type="button"
                    style={{ marginLeft: "auto" }}
                    onClick={() => void handleScan()}
                    disabled={busy !== null || running}>
                    {busy === "scan" ? "Scanning…" : "Rescan"}
                  </button>
                </div>

                <PlanTable
                  items={plan}
                  lists={lists}
                  listNames={ruleListNames(rules)}
                  includeSorted={settings.includeSorted}
                  summary={summary}
                  onIncludeSorted={(value) => void handleSettings({ ...settings, includeSorted: value })}
                  onSetTarget={(repoId, target) =>
                    setOverrides((current) => ({ ...current, [repoId]: target }))
                  }
                  onSetMany={(repoIds, target) =>
                    setOverrides((current) => {
                      const next = { ...current }
                      for (const repoId of repoIds) next[repoId] = target
                      return next
                    })
                  }
                />
              </>
            )}
          </>
        ) : tab === "lists" ? (
          <ListManager lists={lists} onChanged={setLists} />
        ) : tab === "rules" ? (
          <RulesEditor rules={rules} repos={stars ?? []} onSaved={saveRules} />
        ) : (
          <SettingsTab
            session={session}
            settings={settings}
            onSettings={handleSettings}
            onChanged={refreshSession}
          />
        )}
      </div>

      {connected && tab === "sort" && (
        <footer className="ss-footer">
          {run && <ProgressBar run={run} onCancel={() => void handleCancel()} />}

          <div className="ss-row" style={{ marginBottom: 0 }}>
            <span className="ss-hint">{summary.moves} move(s) ready</span>
            <button
              className="ss-btn primary"
              type="button"
              style={{ marginLeft: "auto" }}
              onClick={() => void handleApply()}
              disabled={busy !== null || running || summary.moves === 0}>
              Apply {summary.moves} move{summary.moves === 1 ? "" : "s"}
            </button>
            <button
              className="ss-btn"
              type="button"
              onClick={() => void handleUndo()}
              disabled={busy !== null || running || !session?.undoAvailable}>
              Undo last run
            </button>
            {!running && retryItems.length > 0 && (
              <button
                className="ss-btn"
                type="button"
                disabled={busy !== null}
                onClick={() => void handleApply(retryItems)}>
                Retry failed ({retryItems.length})
              </button>
            )}
            {run?.status === "done" && (
              <button className="ss-btn" type="button" onClick={() => window.location.reload()}>
                Refresh page
              </button>
            )}
          </div>

        </footer>
      )}
    </div>
  )
}
