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
    void run(list.id, () =>
      listAction({ action: "update", listId: list.id, name: next.trim() })
    )
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
    <div>
      <div className="ss-row">
        <h3 style={{ margin: 0 }}>Your lists</h3>
        <span className="ss-badge">{lists.length} / 32</span>
        <button
          className="ss-btn"
          type="button"
          style={{ marginLeft: "auto" }}
          onClick={() => void refresh()}
          disabled={busy !== null}>
          {busy === "refresh" ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <div className="ss-alert error">{error}</div>}
      {lists.length > 23 && (
        <div className="ss-alert warn">You are close to GitHub's 32 list limit.</div>
      )}

      {lists.length === 0 && !busy && (
        <div className="ss-empty">
          <strong>No lists yet</strong>
          Scan and apply, or create one below.
        </div>
      )}

      {lists.map((list) => (
        <div className="ss-list-row" key={list.id}>
          <span className="ss-list-name" title={list.description || list.name}>
            {list.name}
          </span>
          <span className="ss-badge">{list.repoIds.length} repos</span>
          <span className="ss-badge">{list.isPrivate ? "Private" : "Public"}</span>
          <button className="ss-btn" type="button" disabled={busy !== null} onClick={() => rename(list)}>
            Rename
          </button>
          <button
            className="ss-btn"
            type="button"
            disabled={busy !== null}
            onClick={() => togglePrivacy(list)}>
            {list.isPrivate ? "Make public" : "Make private"}
          </button>
          <button
            className="ss-btn danger"
            type="button"
            disabled={busy !== null}
            onClick={() => remove(list)}>
            Delete
          </button>
        </div>
      ))}

      <div className="ss-row" style={{ marginTop: 12 }}>
        <input
          className="ss-grow"
          value={name}
          maxLength={32}
          placeholder="New list name"
          aria-label="New list name"
          onChange={(event) => setName(event.target.value)}
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
          className="ss-btn primary"
          type="button"
          onClick={() => void create()}
          disabled={busy !== null || !name.trim()}>
          Create list
        </button>
      </div>
    </div>
  )
}
