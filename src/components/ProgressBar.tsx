import { AlertTriangle, Ban, CheckCircle2, Loader2 } from "./icons"

import type { RunState } from "../lib/types"

type Props = {
  run: RunState
  onCancel: () => void
}

const statusCopy: Record<RunState["status"], string> = {
  idle: "Ready",
  running: "Filing repos…",
  done: "Run complete",
  cancelled: "Run cancelled",
  error: "Run stopped"
}

export function ProgressBar({ run, onCancel }: Props) {
  const pct = run.total > 0 ? Math.min(100, Math.round((run.completed / run.total) * 100)) : 0
  const active = run.status === "running"
  const StatusIcon =
    run.status === "running"
      ? Loader2
      : run.status === "done"
        ? CheckCircle2
        : run.status === "cancelled"
          ? Ban
          : AlertTriangle

  return (
    <div className="mb-2.5 rounded-xl border border-line bg-surface2/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        <StatusIcon
          className={`h-3.5 w-3.5 ${active ? "animate-spin text-accent" : "text-muted"}`}
          aria-hidden="true"
        />
        <strong className="text-[12px] font-semibold text-ink">{statusCopy[run.status]}</strong>
        <span className="ml-auto text-[11px] tabular-nums text-muted">
          {run.completed} / {run.total}
          {run.failed.length > 0 ? ` · ${run.failed.length} failed` : ""}
        </span>
        {active && (
          <button className="ss-btn ss-btn-sm" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      <div
        className="ss-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={run.total}
        aria-valuenow={run.completed}
        aria-label="Sorting progress">
        <i className="ss-progress-bar" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {run.message ?? run.current ?? "Working…"}
        {run.createdLists.length > 0 ? ` · Created: ${run.createdLists.join(", ")}` : ""}
      </p>

      {run.failed.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-[11px] font-medium text-danger">
            {run.failed.length} repo(s) failed
          </summary>
          <ul className="mt-1 space-y-0.5 pl-4 text-[11px] text-muted">
            {run.failed.slice(0, 12).map((failure) => (
              <li key={failure.repoId || failure.nameWithOwner}>
                <span className="font-medium text-ink">{failure.nameWithOwner}</span>:{" "}
                {failure.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
