import { useMemo, useState } from "react"

import { groupPlan, isRepoInList, normalizeListName } from "../lib/plan"
import type { GitHubList, PlanItem, PlanSummary } from "../lib/types"

type Filter = "all" | "moves" | "suggested" | "unsorted" | "already"

type Props = {
  items: PlanItem[]
  lists: GitHubList[]
  listNames: string[]
  includeSorted: boolean
  summary: PlanSummary
  onIncludeSorted: (value: boolean) => void
  onSetTarget: (repoId: string, target: string | null) => void
  onSetMany: (repoIds: string[], target: string | null) => void
}

const SKIP = "__skip__"
const NEW = "__new__"

export function PlanTable({
  items,
  lists,
  listNames,
  includeSorted,
  summary,
  onIncludeSorted,
  onSetTarget,
  onSetMany
}: Props) {
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [grouped, setGrouped] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTarget, setBulkTarget] = useState("")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const options = useMemo(() => {
    const map = new Map<string, string>()
    for (const name of [...listNames, ...lists.map((list) => list.name)]) {
      const key = normalizeListName(name)
      if (key && !map.has(key)) map.set(key, name)
    }
    return [...map.values()].sort((a, b) => a.localeCompare(b))
  }, [listNames, lists])

  const preFiltered = useMemo(
    () => (includeSorted ? items : items.filter((item) => !item.inAnyList)),
    [items, includeSorted]
  )

  const counts = useMemo(
    () => ({
      all: preFiltered.length,
      moves: preFiltered.filter(
        (item) => item.target && !isRepoInList(item.repoId, item.target, lists)
      ).length,
      suggested: preFiltered.filter((item) => item.suggested && item.target === item.suggested)
        .length,
      unsorted: preFiltered.filter((item) => !item.suggested).length,
      already: preFiltered.filter((item) => item.inAnyList).length
    }),
    [preFiltered, lists]
  )

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()

    return preFiltered.filter((item) => {
      if (filter === "moves" && !(item.target && !isRepoInList(item.repoId, item.target, lists))) {
        return false
      }
      if (filter === "suggested" && !(item.suggested && item.target === item.suggested)) return false
      if (filter === "unsorted" && item.suggested) return false
      if (filter === "already" && !item.inAnyList) return false

      if (!query) return true
      return (
        item.nameWithOwner.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.language.toLowerCase().includes(query)
      )
    })
  }, [preFiltered, filter, search, lists])

  const groups = useMemo(() => groupPlan(visible), [visible])
  const allSelected = visible.length > 0 && visible.every((item) => selected.has(item.repoId))

  const toggleSelected = (repoId: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(repoId)) next.delete(repoId)
      else next.add(repoId)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(visible.map((item) => item.repoId)))
  }

  const applyBulk = (target: string | null) => {
    if (selected.size === 0) return
    onSetMany([...selected], target)
    setSelected(new Set())
    setBulkTarget("")
  }

  const renderRow = (item: PlanItem) => (
    <div className="ss-tr" key={item.repoId}>
      <input
        type="checkbox"
        checked={selected.has(item.repoId)}
        aria-label={`Select ${item.nameWithOwner}`}
        onChange={() => toggleSelected(item.repoId)}
      />
      <div className="ss-repo">
        <a href={`https://github.com/${item.nameWithOwner}`} target="_blank" rel="noreferrer">
          {item.nameWithOwner}
        </a>
        <small title={item.description}>{item.description || "No description"}</small>
      </div>
      <div className="ss-lang" title={item.description}>
        {item.topics.slice(0, 3).join(" · ") || "—"}
      </div>
      <div className="ss-lang">{item.language || "—"}</div>
      <select
        aria-label={`Target list for ${item.nameWithOwner}`}
        value={item.target ?? SKIP}
        onChange={(event) => {
          const value = event.target.value
          if (value === NEW) {
            const name = window.prompt("New list name (max 32 characters)")
            if (name?.trim()) onSetTarget(item.repoId, name.trim())
            return
          }
          onSetTarget(item.repoId, value === SKIP ? null : value)
        }}>
        <option value={SKIP}>Skip</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        <option value={NEW}>+ New list…</option>
      </select>
    </div>
  )

  return (
    <div>
      <div className="ss-toolbar">
        <select
          aria-label="Filter repos"
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="all">All ({counts.all})</option>
          <option value="moves">To move ({counts.moves})</option>
          <option value="suggested">Suggested ({counts.suggested})</option>
          <option value="unsorted">Unsorted ({counts.unsorted})</option>
          <option value="already">Already filed ({counts.already})</option>
        </select>
        <input
          type="search"
          value={search}
          placeholder="Search name or description"
          aria-label="Search repos"
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          className="ss-btn"
          type="button"
          aria-pressed={grouped}
          onClick={() => setGrouped((value) => !value)}>
          {grouped ? "Ungroup" : "Group"}
        </button>
      </div>

      <div className="ss-toolbar">
        <label className="ss-check">
          <input
            type="checkbox"
            checked={includeSorted}
            onChange={(event) => onIncludeSorted(event.target.checked)}
          />
          Include repos already in a list
        </label>
      </div>

      {selected.size > 0 && (
        <div className="ss-toolbar">
          <span className="ss-badge">{selected.size} selected</span>
          <select
            aria-label="Set list for selected repos"
            value={bulkTarget}
            onChange={(event) => {
              const value = event.target.value
              if (!value) return
              applyBulk(value === SKIP ? null : value)
            }}>
            <option value="">Set list…</option>
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={SKIP}>Skip all</option>
          </select>
          <button className="ss-btn" type="button" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="ss-empty">
          <strong>No repos here</strong>
          {items.length === 0
            ? "Scan your stars to build a plan."
            : "Try another filter or include repos that are already filed."}
        </div>
      ) : (
        <div className="ss-table">
          <div className="ss-thead">
            <input
              type="checkbox"
              checked={allSelected}
              aria-label="Select all visible repos"
              onChange={toggleAll}
            />
            <span>Repository</span>
            <span>Topics</span>
            <span>Lang</span>
            <span>Target list</span>
          </div>

          {grouped ? (
            groups.map((group) => {
              const isCollapsed = collapsed.has(group.name)
              return (
                <div key={group.name}>
                  <button
                    type="button"
                    className="ss-group"
                    aria-expanded={!isCollapsed}
                    onClick={() =>
                      setCollapsed((current) => {
                        const next = new Set(current)
                        if (next.has(group.name)) next.delete(group.name)
                        else next.add(group.name)
                        return next
                      })
                    }>
                    <span aria-hidden>{isCollapsed ? "▸" : "▾"}</span>
                    <span>{group.name}</span>
                    <span className="count">{group.items.length}</span>
                  </button>
                  {!isCollapsed && group.items.map(renderRow)}
                </div>
              )
            })
          ) : (
            visible.map(renderRow)
          )}
        </div>
      )}

      <p className="ss-hint">
        {summary.moves} move{summary.moves === 1 ? "" : "s"} · {summary.unchanged} already filed ·{" "}
        {summary.skips} skipped · {summary.listsTouched} list
        {summary.listsTouched === 1 ? "" : "s"} touched
      </p>
    </div>
  )
}
