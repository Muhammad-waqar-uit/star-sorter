import { useEffect, useRef, useState } from "react"

import { DEFAULT_RULES, DEFAULT_RULES_JSON } from "../lib/defaults"
import {
  parseRuleSet,
  parseRuleSetJson,
  RuleValidationError,
  validateRuleSet
} from "../lib/rules"
import type { RuleSet, StarredRepo } from "../lib/types"
import { VisualRulesEditor } from "./VisualRulesEditor"

type Props = {
  rules: RuleSet
  repos: StarredRepo[]
  onSaved: (rules: RuleSet) => void | Promise<void>
}

type Mode = "visual" | "json"

const clone = (value: RuleSet): RuleSet => JSON.parse(JSON.stringify(value)) as RuleSet

/**
 * Two editors over one draft: a visual builder (add, rename, drag-reorder,
 * delete, chip inputs) and a JSON editor for power users. Both validate with
 * the same schema before saving, and both can import/export/reset.
 */
export function RulesEditor({ rules, repos, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>("visual")
  const [draft, setDraft] = useState<RuleSet>(() => clone(rules))
  const [text, setText] = useState(() => JSON.stringify(rules, null, 2))
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(clone(rules))
    setText(JSON.stringify(rules, null, 2))
  }, [rules])

  const liveErrors = validateRuleSet(draft)

  const switchMode = (next: Mode) => {
    setNotice(null)
    setErrors([])

    if (next === "json") {
      setText(JSON.stringify(draft, null, 2))
      setMode("json")
      return
    }

    try {
      setDraft(parseRuleSetJson(text))
      setMode("visual")
    } catch (error) {
      setErrors(
        error instanceof RuleValidationError
          ? error.errors
          : [error instanceof Error ? error.message : String(error)]
      )
    }
  }

  const handleSave = async () => {
    setErrors([])
    setNotice(null)
    try {
      const parsed = mode === "json" ? parseRuleSetJson(text) : parseRuleSet(draft)
      setBusy(true)
      await onSaved(parsed)
      setDraft(clone(parsed))
      setText(JSON.stringify(parsed, null, 2))
      setNotice(`Saved ${parsed.lists.length} rules.`)
    } catch (error) {
      setErrors(
        error instanceof RuleValidationError
          ? error.errors
          : [error instanceof Error ? error.message : String(error)]
      )
    } finally {
      setBusy(false)
    }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "star-sorter-rules.json"
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    setErrors([])
    setNotice(null)
    try {
      const value = await file.text()
      const parsed = parseRuleSetJson(value)
      setText(value)
      setDraft(parsed)
      setNotice(`Loaded ${file.name}. Press Save rules to apply it.`)
    } catch (error) {
      setErrors(
        error instanceof RuleValidationError
          ? error.errors
          : [error instanceof Error ? error.message : String(error)]
      )
    }
  }

  return (
    <div>
      <div className="ss-row">
        <div className="ss-mode-switch" role="group" aria-label="Rule editor mode">
          <button
            className={`ss-btn ${mode === "visual" ? "primary" : ""}`}
            type="button"
            aria-pressed={mode === "visual"}
            onClick={() => switchMode("visual")}>
            Visual
          </button>
          <button
            className={`ss-btn ${mode === "json" ? "primary" : ""}`}
            type="button"
            aria-pressed={mode === "json"}
            onClick={() => switchMode("json")}>
            JSON
          </button>
        </div>
        <span className="ss-badge">{draft.lists.length} / 32 lists</span>
        <span className="ss-badge">{draft.private ? "Private" : "Public"} new lists</span>
      </div>

      {mode === "visual" ? (
        <VisualRulesEditor draft={draft} repos={repos} onChange={setDraft} />
      ) : (
        <>
          <p className="ss-hint">
            Rules run top to bottom and the first match wins. Keys: <code>topics</code>,{" "}
            <code>languages</code>, <code>keywords</code>, <code>owners</code>,{" "}
            <code>exclude</code>.
          </p>
          <textarea
            value={text}
            rows={18}
            spellCheck={false}
            aria-label="Rules JSON"
            onChange={(event) => setText(event.target.value)}
          />
        </>
      )}

      {errors.length > 0 && (
        <div className="ss-alert error">
          <strong>Fix these first:</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {errors.slice(0, 8).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {mode === "visual" && errors.length === 0 && liveErrors.length > 0 && (
        <div className="ss-alert warn">
          {liveErrors.length} issue{liveErrors.length === 1 ? "" : "s"} to fix before saving —{" "}
          {liveErrors[0]}
        </div>
      )}

      {notice && <div className="ss-alert success">{notice}</div>}

      <div className="ss-row" style={{ marginTop: 8 }}>
        <button className="ss-btn primary" type="button" onClick={handleSave} disabled={busy}>
          {busy ? "Saving…" : "Save rules"}
        </button>
        <button
          className="ss-btn"
          type="button"
          onClick={() => {
            const defaults = clone(DEFAULT_RULES)
            setDraft(defaults)
            setText(DEFAULT_RULES_JSON)
            setErrors([])
            setNotice("Default rules loaded. Press Save rules to apply them.")
          }}>
          Reset
        </button>
        <button className="ss-btn" type="button" onClick={handleExport}>
          Export
        </button>
        <button className="ss-btn" type="button" onClick={() => fileInput.current?.click()}>
          Import
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
      </div>
    </div>
  )
}
