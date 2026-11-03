import type { RunState } from "../lib/types"

type Props = {
  run: RunState
  onCancel: () => void
}

export function ProgressBar({ run, onCancel }: Props) {
  const pct = run.total > 0 ? Math.min(100, Math.round((run.completed / run.total) * 100)) : 0
  const active = run.status === "running"

  return (
    <div className="ss-progress">
      <div className="ss-row">
        <strong style={{ fontSize: 12 }}>
          {active ? "Filing repos…" : statusLabel(run.status)}
        </strong>
        <span className="ss-hint" style={{ marginLeft: "auto" }}>
          {run.completed} / {run.total}
          {run.failed.length > 0 ? ` · ${run.failed.length} failed` : ""}
        </span>
        {active && (
          <button className="ss-btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      <div
        className="ss-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={run.total}
        aria-valuenow={run.completed}
        aria-label="Sorting progress">
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className="ss-hint">
        {run.message ?? run.current ?? "Working…"}
        {run.createdLists.length > 0 ? ` · Created: ${run.createdLists.join(", ")}` : ""}
      </p>
      {run.failed.length > 0 && (
        <details>
          <summary className="ss-hint">{run.failed.length} repo(s) failed</summary>
          <ul className="ss-hint" style={{ paddingLeft: 18, margin: "4px 0 0" }}>
            {run.failed.slice(0, 12).map((failure) => (
              <li key={failure.repoId || failure.nameWithOwner}>
                {failure.nameWithOwner}: {failure.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function statusLabel(status: RunState["status"]): string {
  if (status === "done") return "Run complete"
  if (status === "cancelled") return "Run cancelled"
  if (status === "error") return "Run stopped"
  return "Run finished"
}
