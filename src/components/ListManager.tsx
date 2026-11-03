import {
  AlertTriangle,
  Folder,
  FolderOpen,
  Globe,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2
} from "./icons"
import { useCallback, useEffect, useState } from "react"

import { listAction, SorterError } from "../lib/client"
import type { GitHubList } from "../lib/types"

type Props = {
  lists: GitHubList[]
  onChanged: (lists: GitHubList[]) => void
}

/** Create, rename, change privacy and delete GitHub Lists. */
export function ListManager({ lists, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)

  const refresh = useCallback(async () => {
    setBusy("refresh")
    setError(null)
    try {
      const result = await listAction({ action: "refresh" })
      onChanged(result.lists)
    } catch (err) {
      setError(err instanceof SorterError ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [onChanged])

  useEffect(() => {
    void refresh()
    // Refresh once when the tab mounts.
  }, [])

  const run = async (key: string, task: () => Promise<{ lists: GitHubList[] }>) => {
    setBusy(key)
    setError(null)
    try {
      const result = await task()
      onChanged(result.lists)
    } catch (err) {
      setError(err instanceof SorterError ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const create = () =>
    run("create", async () => {
      if (!name.trim()) throw new Error("Enter a list name.")
      const result = await listAction({ action: "create", name: name.trim(), isPrivate })
      setName("")
      return result
    })

  const rename = (list: GitHubList) => {
    const next = window.prompt("List name", list.name)
    if (!next?.trim() || next.trim() === list.name) return
    void run(list.id, () => listAction({ action: "update", listId: list.id, name: next.trim() }))
  }

  const togglePrivacy = (list: GitHubList) =>
    void run(list.id, () =>
      listAction({ action: "update", listId: list.id, isPrivate: !list.isPrivate })
    )

  const remove = (list: GitHubList) => {
    if (
      !window.confirm(
        `Delete “${list.name}”? The repos stay starred, they are only removed from this list.`
      )
    ) {
      return
    }
    void run(list.id, () => listAction({ action: "delete", listId: list.id }))
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent">
          <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <h3 className="text-[13px] font-bold text-ink">Your lists</h3>
        <span className="ss-badge tabular-nums">{lists.length} / 32</span>
        <button
          className="ss-btn ss-btn-sm ml-auto"
          type="button"
          onClick={() => void refresh()}
          disabled={busy !== null}>
          {busy === "refresh" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="ss-alert ss-alert-error flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {lists.length > 23 && (
        <div className="ss-alert ss-alert-warn flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          You are close to GitHub&apos;s 32 list limit.
        </div>
      )}

      {lists.length === 0 && !busy && (
        <div className="ss-empty rounded-xl border border-dashed border-line">
          <Folder className="mx-auto mb-2 h-6 w-6 text-muted/70" aria-hidden="true" />
          <strong>No lists yet</strong>
          Scan and apply, or create one below.
        </div>
      )}

      {lists.length > 0 && (
        <div className="rounded-xl border border-line bg-surface2/50 px-2.5">
          {lists.map((list) => (
            <div className="ss-list-row" key={list.id}>
              <Folder className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
              <span
                className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink"
                title={list.description || list.name}>
                {list.name}
              </span>
              <span className="ss-badge tabular-nums">{list.repoIds.length} repos</span>
              <span className="ss-badge">
                {list.isPrivate ? (
                  <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                ) : (
                  <Globe className="h-2.5 w-2.5" aria-hidden="true" />
                )}
                {list.isPrivate ? "Private" : "Public"}
              </span>
              <button
                className="ss-btn ss-btn-icon ss-btn-ghost"
                type="button"
                title="Rename list"
                aria-label={`Rename ${list.name}`}
                disabled={busy !== null}
                onClick={() => rename(list)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                className="ss-btn ss-btn-icon ss-btn-ghost"
                type="button"
                title={list.isPrivate ? "Make public" : "Make private"}
                aria-label={`Make ${list.name} ${list.isPrivate ? "public" : "private"}`}
                disabled={busy !== null}
                onClick={() => togglePrivacy(list)}>
                {list.isPrivate ? (
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
              <button
                className="ss-btn ss-btn-icon ss-btn-ghost hover:text-danger"
                type="button"
                title="Delete list"
                aria-label={`Delete ${list.name}`}
                disabled={busy !== null}
                onClick={() => remove(list)}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-line bg-surface2/40 p-2">
        <input
          className="ss-input min-w-[130px] flex-1"
          value={name}
          maxLength={32}
          placeholder="New list name"
          aria-label="New list name"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) void create()
          }}
        />
        <label className="ss-check">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
          />
          Private
        </label>
        <button
          className="ss-btn ss-btn-primary"
          type="button"
          onClick={() => void create()}
          disabled={busy !== null || !name.trim()}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Create
        </button>
      </div>
    </div>
  )
}
