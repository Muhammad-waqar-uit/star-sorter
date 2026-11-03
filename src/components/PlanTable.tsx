import { ChevronDown, ChevronRight, Inbox, LayoutGrid, List, Search } from "./icons"
import { useEffect, useMemo, useRef, useState } from "react"

import { groupPlan, isRepoInList, normalizeListName } from "../lib/plan"
import type { GitHubList, PlanItem, PlanSummary } from "../lib/types"
import { measureRows, visibleRange } from "../lib/virtual"

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

const ITEM_HEIGHT = 50
const GROUP_HEIGHT = 38
const VIEWPORT_HEIGHT = 420
const OVERSCAN = 4

type RenderRow =
  | { kind: "group"; key: string; name: string; count: number; collapsed: boolean }
  | { kind: "item"; key: string; item: PlanItem }

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
  const [scrollTop, setScrollTop] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)

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

  const rows: RenderRow[] = useMemo(() => {
    if (!grouped) {
      return visible.map((item) => ({ kind: "item" as const, key: item.repoId, item }))
    }

    const next: RenderRow[] = []
    for (const group of groups) {
      const isCollapsed = collapsed.has(group.name)
      next.push({
        kind: "group",
        key: `group:${group.name}`,
        name: group.name,
        count: group.items.length,
        collapsed: isCollapsed
      })
      if (!isCollapsed) {
        for (const item of group.items) {
          next.push({ kind: "item", key: item.repoId, item })
        }
      }
    }
    return next
  }, [grouped, groups, visible, collapsed])

  const heights = useMemo(
    () => rows.map((row) => (row.kind === "group" ? GROUP_HEIGHT : ITEM_HEIGHT)),
    [rows]
  )
  const metrics = useMemo(() => measureRows(heights), [heights])
  const range = useMemo(
    () => visibleRange(metrics.offsets, heights, scrollTop, VIEWPORT_HEIGHT, OVERSCAN),
    [metrics, heights, scrollTop]
  )

  // A new filter starts at the top, otherwise the window can point past the end.
  useEffect(() => {
    setScrollTop(0)
    scroller.current?.scrollTo({ top: 0 })
  }, [filter, search, grouped, includeSorted, collapsed])

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

  const toggleGroup = (name: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const applyBulk = (target: string | null) => {
    if (selected.size === 0) return
    onSetMany([...selected], target)
    setSelected(new Set())
    setBulkTarget("")
  }

  const renderRow = (item: PlanItem) => (
    <div className="ss-tr">
      <input
        type="checkbox"
        className="accent-accent"
        checked={selected.has(item.repoId)}
        aria-label={`Select ${item.nameWithOwner}`}
        onChange={() => toggleSelected(item.repoId)}
      />
      <div className="ss-repo min-w-0">
        <a href={`https://github.com/${item.nameWithOwner}`} target="_blank" rel="noreferrer">
          {item.nameWithOwner}
        </a>
        <small title={item.description}>{item.description || "No description"}</small>
      </div>
      <div className="ss-lang">{item.topics.slice(0, 3).join(" · ") || "—"}</div>
      <div className="ss-lang">{item.language || "—"}</div>
      <select
        className="ss-select ss-select-sm"
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

  const viewport = Math.min(VIEWPORT_HEIGHT, metrics.totalHeight)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          className="ss-select ss-select-sm w-auto"
          aria-label="Filter repos"
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="all">All ({counts.all})</option>
          <option value="moves">To move ({counts.moves})</option>
          <option value="suggested">Suggested ({counts.suggested})</option>
          <option value="unsorted">Unsorted ({counts.unsorted})</option>
          <option value="already">Already filed ({counts.already})</option>
        </select>

        <div className="relative min-w-[130px] flex-1">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            className="ss-input py-1 pl-7 text-[11.5px]"
            value={search}
            placeholder="Search repos"
            aria-label="Search repos"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <button
          className="ss-btn ss-btn-sm"
          type="button"
          aria-pressed={grouped}
          title={grouped ? "Show a flat list" : "Group by suggested list"}
          onClick={() => setGrouped((value) => !value)}>
          {grouped ? (
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <List className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {grouped ? "Flat" : "Group"}
        </button>
      </div>

      <label className="ss-check">
        <input
          type="checkbox"
          checked={includeSorted}
          onChange={(event) => onIncludeSorted(event.target.checked)}
        />
        Include repos already in a list
      </label>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-accent/25 bg-accent-soft px-2 py-1.5">
          <span className="ss-badge ss-badge-accent tabular-nums">{selected.size} selected</span>
          <select
            className="ss-select ss-select-sm w-auto"
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
          <button
            className="ss-btn ss-btn-sm ss-btn-ghost ml-auto"
            type="button"
            onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="ss-empty">
          <Inbox className="mx-auto mb-2 h-6 w-6 text-muted/70" aria-hidden="true" />
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
              className="accent-accent"
              checked={allSelected}
              aria-label="Select all visible repos"
              onChange={toggleAll}
            />
            <span>Repository</span>
            <span>Topics</span>
            <span>Lang</span>
            <span>Target list</span>
          </div>

          <div
            className="ss-vscroll"
            ref={scroller}
            style={{ height: viewport }}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
            <div style={{ height: metrics.totalHeight, position: "relative" }}>
              {rows.slice(range.start, range.end + 1).map((row, index) => {
                const absoluteIndex = range.start + index
                const top = metrics.offsets[absoluteIndex] ?? 0

                return (
                  <div
                    key={row.key}
                    className="ss-vrow"
                    style={{
                      transform: `translateY(${top}px)`,
                      height: row.kind === "group" ? GROUP_HEIGHT : ITEM_HEIGHT
                    }}>
                    {row.kind === "group" ? (
                      <button
                        type="button"
                        className="ss-group"
                        aria-expanded={!row.collapsed}
                        onClick={() => toggleGroup(row.name)}>
                        {row.collapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                        )}
                        <span className="truncate">{row.name}</span>
                        <span className="ss-badge ml-auto tabular-nums">{row.count}</span>
                      </button>
                    ) : (
                      renderRow(row.item)
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] tabular-nums text-muted">
        {summary.moves} move{summary.moves === 1 ? "" : "s"} · {summary.unchanged} already filed ·{" "}
        {summary.skips} skipped · {summary.listsTouched} list
        {summary.listsTouched === 1 ? "" : "s"} touched
      </p>
    </div>
  )
}
