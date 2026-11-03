import { useMemo, useState } from "react"

import { matchesRule } from "../lib/rules"
import type { MatchSpec, Rule, RuleSet, StarredRepo } from "../lib/types"
import { ChipInput } from "./ChipInput"

type Props = {
  draft: RuleSet
  repos: StarredRepo[]
  onChange: (next: RuleSet) => void
}

type MatchKey = keyof MatchSpec

/**
 * Visual editor: add, rename, drag-reorder and delete rules, with chip inputs
 * for every signal. Validation and saving are owned by the container so both
 * modes share one source of truth.
 */
export function VisualRulesEditor({ draft, repos, onChange }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const matchCounts = useMemo(
    () => draft.lists.map((rule) => repos.filter((repo) => matchesRule(repo, rule)).length),
    [draft.lists, repos]
  )

  const updateRule = (index: number, patch: Partial<Rule>) => {
    const lists = draft.lists.map((rule, at) => (at === index ? { ...rule, ...patch } : rule))
    onChange({ ...draft, lists })
  }

  const updateMatch = (index: number, key: MatchKey, values: string[]) => {
    const rule = draft.lists[index]
    if (!rule) return
    updateRule(index, { match: { ...rule.match, [key]: values } })
  }

  const moveRule = (from: number, to: number) => {
    if (from === to || to < 0 || to >= draft.lists.length) return
    const lists = [...draft.lists]
    const [moved] = lists.splice(from, 1)
    if (!moved) return
    lists.splice(to, 0, moved)
    onChange({ ...draft, lists })
  }

  const removeRule = (index: number) => {
    const rule = draft.lists[index]
    if (!rule) return
    if (!window.confirm(`Delete the rule “${rule.name || "Untitled"}”?`)) return
    onChange({ ...draft, lists: draft.lists.filter((_, at) => at !== index) })
  }

  const addRule = () => {
    const names = new Set(draft.lists.map((rule) => rule.name.trim().toLowerCase()))
    let name = "New list"
    let counter = 2
    while (names.has(name.toLowerCase())) {
      name = `New list ${counter++}`
    }

    onChange({
      ...draft,
      lists: [...draft.lists, { name, description: "", match: { topics: [] } }]
    })
  }

  return (
    <div>
      <div className="ss-row">
        <label className="ss-check">
          <input
            type="checkbox"
            checked={draft.private}
            onChange={(event) => onChange({ ...draft, private: event.target.checked })}
          />
          Create new lists as private
        </label>

        <label className="ss-inline-field">
          Lists per repo
          <input
            type="number"
            min={1}
            max={32}
            value={draft.maxListsPerRepo}
            aria-label="Maximum lists per repo"
            onChange={(event) => {
              const value = Number(event.target.value)
              onChange({
                ...draft,
                maxListsPerRepo: Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1
              })
            }}
          />
        </label>
      </div>

      <p className="ss-hint">
        Drag the handle to reorder. Rules run top to bottom and the first match wins.
      </p>

      {draft.lists.map((rule, index) => (
        <article
          className={`ss-rule-edit ${dragIndex === index ? "dragging" : ""}`}
          key={index}
          onDragOver={(event) => {
            if (dragIndex === null || dragIndex === index) return
            event.preventDefault()
            moveRule(dragIndex, index)
            setDragIndex(index)
          }}>
          <div className="ss-rule-head">
            <button
              type="button"
              className="ss-drag"
              draggable
              aria-label={`Reorder ${rule.name || "rule"}`}
              title="Drag to reorder"
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}>
              ⠿
            </button>
            <input
              className="ss-grow"
              value={rule.name}
              maxLength={32}
              aria-label="List name"
              placeholder="List name"
              onChange={(event) => updateRule(index, { name: event.target.value })}
            />
            <span className="ss-badge">{matchCounts[index] ?? 0} stars</span>
            <button
              type="button"
              className="ss-icon-btn"
              aria-label={`Move ${rule.name || "rule"} up`}
              disabled={index === 0}
              onClick={() => moveRule(index, index - 1)}>
              ↑
            </button>
            <button
              type="button"
              className="ss-icon-btn"
              aria-label={`Move ${rule.name || "rule"} down`}
              disabled={index === draft.lists.length - 1}
              onClick={() => moveRule(index, index + 1)}>
              ↓
            </button>
            <button
              type="button"
              className="ss-icon-btn"
              aria-label={`Delete ${rule.name || "rule"}`}
              onClick={() => removeRule(index)}>
              ×
            </button>
          </div>

          <div className="ss-row">
            <input
              className="ss-grow"
              value={rule.description ?? ""}
              aria-label="List description"
              placeholder="List description (optional)"
              onChange={(event) => updateRule(index, { description: event.target.value })}
            />
          </div>

          <ChipInput
            id={`rule-topics-${index}`}
            label="Topics"
            values={rule.match.topics ?? []}
            placeholder="e.g. cli, react"
            onChange={(values) => updateMatch(index, "topics", values)}
          />
          <ChipInput
            id={`rule-languages-${index}`}
            label="Languages"
            values={rule.match.languages ?? []}
            placeholder="e.g. Rust, TypeScript"
            onChange={(values) => updateMatch(index, "languages", values)}
          />
          <ChipInput
            id={`rule-keywords-${index}`}
            label="Keywords"
            values={rule.match.keywords ?? []}
            placeholder="Matched in name + description"
            onChange={(values) => updateMatch(index, "keywords", values)}
          />
          <ChipInput
            id={`rule-owners-${index}`}
            label="Owners"
            values={rule.match.owners ?? []}
            placeholder="e.g. microsoft, google"
            onChange={(values) => updateMatch(index, "owners", values)}
          />
          <ChipInput
            id={`rule-exclude-${index}`}
            label="Exclude keywords"
            values={rule.match.exclude ?? []}
            placeholder="Blocks a match for this rule"
            onChange={(values) => updateMatch(index, "exclude", values)}
          />
        </article>
      ))}

      <div className="ss-row">
        <button className="ss-btn" type="button" onClick={addRule}>
          + Add rule
        </button>
        <span className="ss-hint">
          {draft.lists.length} of 32 lists · {repos.length} stars evaluated
        </span>
      </div>
    </div>
  )
}
