import logoUrl from "data-base64:../../assets/brand/icons/icon-48.png"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Info,
  ListFilter,
  Loader2,
  Play,
  RefreshCw,
  RotateCw,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  X
} from "./icons"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  applyPlan,
  cancelRun,
  getProgress,
  getScanProgress,
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

type Notice = {
  kind: "info" | "error" | "success" | "warn"
  text: string
  fixToken?: boolean
}

const tabs: { key: Tab; label: string; icon: typeof ListFilter }[] = [
  { key: "sort", label: "Sort", icon: ListFilter },
  { key: "lists", label: "Lists", icon: FolderOpen },
  { key: "rules", label: "Rules", icon: SlidersHorizontal },
  { key: "settings", label: "Settings", icon: SettingsIcon }
]

const noticeStyles: Record<Notice["kind"], string> = {
  info: "",
  error: "ss-alert-error",
  success: "ss-alert-success",
  warn: "ss-alert-warn"
}

const noticeIcons: Record<Notice["kind"], typeof Info> = {
  info: Info,
  error: AlertCircle,
  success: CheckCircle2,
  warn: AlertTriangle
}

export function Panel({ theme, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("sort")
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [rules, setRules] = useState<RuleSet>(DEFAULT_RULES)
  const [settings, setSettings] = useState<Settings>({ includeSorted: false, theme: "auto", tokenPolicy: "keep" })
  const [stars, setStars] = useState<StarredRepo[] | null>(null)
  const [lists, setLists] = useState<GitHubList[]>([])
  const [overrides, setOverrides] = useState<Record<string, string | null>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [run, setRun] = useState<RunState | null>(null)
  const [scanNote, setScanNote] = useState<string | null>(null)

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

  // Live scan counter, polled while the worker pages through stars and lists.
  useEffect(() => {
    if (busy !== "scan") {
      setScanNote(null)
      return
    }

    let stopped = false
    const tick = async () => {
      try {
        const progress = await getScanProgress()
        if (stopped || !progress) return

        setScanNote(
          progress.phase === "stars"
            ? `Fetched ${progress.stars} stars…`
            : progress.listsTotal > 0
              ? `Reading lists ${progress.listsLoaded}/${progress.listsTotal}…`
              : `Loaded ${progress.stars} stars, reading lists…`
        )
      } catch {
        // Progress is best effort; the scan itself reports the real result.
      }
    }

    void tick()
    const timer = window.setInterval(() => void tick(), 500)

    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [busy])

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
    setScanNote(null)
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
        text: error instanceof SorterError ? error.message : String(error),
        fixToken:
          error instanceof SorterError && (error.code === "auth" || error.code === "scope")
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
        text: error instanceof SorterError ? error.message : String(error),
        fixToken:
          error instanceof SorterError && (error.code === "auth" || error.code === "scope")
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
  const NoticeIcon = notice ? noticeIcons[notice.kind] : Info

  return (
    <div
      className={`ss-panel ${theme === "dark" ? "ss-theme-dark" : "ss-theme-light"}`}
      role="dialog"
      aria-label="Star Sorter">
      <header className="ss-panel-header">
        <span className="flex min-w-0 items-center gap-2">
          <img
            src={logoUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-lg ring-1 ring-line"
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13px] font-bold tracking-tight">Star Sorter</span>
            <span className="truncate text-[9.5px] uppercase tracking-[0.16em] text-muted">
              GitHub stars
            </span>
          </span>
        </span>

        <span className="ml-auto flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              connected ? "bg-success" : "bg-muted/60"
            }`}
          />
          <span className="truncate">
            {running
              ? "Run in progress…"
              : connected
                ? `@${session?.account?.login ?? "connected"}`
                : "Not connected"}
          </span>
        </span>

        <button
          className="ss-btn ss-btn-icon ss-btn-ghost shrink-0"
          type="button"
          aria-label="Close panel"
          title="Close"
          onClick={onClose}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {connected && (
        <nav className="flex gap-0.5 border-b border-line px-2" aria-label="Sections">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className="ss-tab"
              data-active={tab === key ? "true" : "false"}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      )}

      <div className="ss-panel-body space-y-3">
        {!sessionLoaded ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading…
          </div>
        ) : !connected ? (
          <div className="space-y-2">
            {session?.lastRun && (
              <div
                className={`ss-alert ${
                  session.lastRun.failed > 0 ? "ss-alert-warn" : "ss-alert-success"
                } flex items-start gap-2`}>
                {session.lastRun.failed > 0 ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <strong className="block text-[12px]">Last run</strong>
                  <span>
                    {session.lastRun.message ||
                      `${session.lastRun.completed} of ${session.lastRun.total} processed.`}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] text-muted">
                    No token is stored in this browser.
                  </span>
                </div>
              </div>
            )}
            <TokenForm
              connected={false}
              onChanged={async () => {
                await refreshSession()
                setNotice(null)
              }}
            />
            <p className="px-1 text-[11px] leading-relaxed text-muted">
              Star Sorter reads your stars only after you scan, and nothing is changed on GitHub
              until you press Apply.
            </p>
          </div>
        ) : tab === "sort" ? (
          <>
            {notice && (
              <div className={`ss-alert ${noticeStyles[notice.kind]} flex items-start gap-2`}>
                <NoticeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  {busy === "scan" ? (scanNote ?? notice.text) : notice.text}
                  {notice.fixToken && (
                    <div className="mt-1">
                      <button className="ss-btn ss-btn-sm" type="button" onClick={() => setTab("settings")}>
                        Fix token
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!stars ? (
              <div className="rounded-xl border border-dashed border-line bg-surface2/40 px-5 py-8 text-center">
                <span className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <strong className="block text-[13px] font-bold text-ink">Scan your stars</strong>
                <p className="mx-auto mt-1 max-w-[340px] text-[11.5px] leading-relaxed text-muted">
                  Star Sorter reads every starred repo and your existing lists, then proposes a
                  list for each repo. Nothing changes until you press Apply.
                </p>
                <button
                  className="ss-btn ss-btn-primary mt-3"
                  type="button"
                  onClick={() => void handleScan()}
                  disabled={busy !== null}>
                  {busy === "scan" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {busy === "scan" ? "Scanning…" : "Scan and preview"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted">
                    <span className="font-semibold text-ink">{stars.length}</span> stars ·{" "}
                    <span className="font-semibold text-ink">{lists.length}</span> lists ·{" "}
                    {new Date(session?.lastScan?.at ?? Date.now()).toLocaleString()}
                  </span>
                  <button
                    className="ss-btn ss-btn-sm ml-auto"
                    type="button"
                    onClick={() => void handleScan()}
                    disabled={busy !== null || running}>
                    {busy === "scan" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Rescan
                  </button>
                </div>

                <PlanTable
                  items={plan}
                  lists={lists}
                  listNames={ruleListNames(rules)}
                  includeSorted={settings.includeSorted}
                  summary={summary}
                  onIncludeSorted={(value) =>
                    void handleSettings({ ...settings, includeSorted: value })
                  }
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
        <footer className="ss-panel-footer">
          {run && <ProgressBar run={run} onCancel={() => void handleCancel()} />}

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] tabular-nums text-muted">
              <span className="font-semibold text-ink">{summary.moves}</span> move
              {summary.moves === 1 ? "" : "s"} ready
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <button
                className="ss-btn ss-btn-primary"
                type="button"
                onClick={() => void handleApply()}
                disabled={busy !== null || running || summary.moves === 0}>
                {running ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Apply {summary.moves} move{summary.moves === 1 ? "" : "s"}
              </button>

              <button
                className="ss-btn"
                type="button"
                title="Undo the last run"
                onClick={() => void handleUndo()}
                disabled={busy !== null || running || !session?.undoAvailable}>
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                Undo
              </button>

              {!running && retryItems.length > 0 && (
                <button
                  className="ss-btn"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void handleApply(retryItems)}>
                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry failed ({retryItems.length})
                </button>
              )}

              {run?.status === "done" && (
                <button className="ss-btn" type="button" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Refresh
                </button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
