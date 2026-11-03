import {
  AlertCircle,
  AlertTriangle,
  Braces,
  CheckCircle2,
  Download,
  LayoutList,
  RotateCcw,
  Save,
  Upload
} from "./icons"
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <div
          className="inline-flex rounded-lg border border-line bg-surface2 p-0.5"
          role="group"
          aria-label="Rule editor mode">
          <button
            className={`ss-btn ss-btn-sm ${
              mode === "visual" ? "ss-btn-accent" : "ss-btn-ghost"
            }`}
            type="button"
            aria-pressed={mode === "visual"}
            onClick={() => switchMode("visual")}>
            <LayoutList className="h-3.5 w-3.5" aria-hidden="true" />
            Visual
          </button>
          <button
            className={`ss-btn ss-btn-sm ${mode === "json" ? "ss-btn-accent" : "ss-btn-ghost"}`}
            type="button"
            aria-pressed={mode === "json"}
            onClick={() => switchMode("json")}>
            <Braces className="h-3.5 w-3.5" aria-hidden="true" />
            JSON
          </button>
        </div>

        <span className="ss-badge tabular-nums">{draft.lists.length} / 32 lists</span>
        <span className="ss-badge">{draft.private ? "Private" : "Public"} new lists</span>
      </div>

      {mode === "visual" ? (
        <VisualRulesEditor draft={draft} repos={repos} onChange={setDraft} />
      ) : (
        <>
          <p className="text-[11px] leading-relaxed text-muted">
            Rules run top to bottom and the first match wins. Keys:{" "}
            <code className="rounded bg-surface2 px-1 py-0.5 text-[10.5px]">topics</code>,{" "}
            <code className="rounded bg-surface2 px-1 py-0.5 text-[10.5px]">languages</code>,{" "}
            <code className="rounded bg-surface2 px-1 py-0.5 text-[10.5px]">keywords</code>,{" "}
            <code className="rounded bg-surface2 px-1 py-0.5 text-[10.5px]">owners</code>,{" "}
            <code className="rounded bg-surface2 px-1 py-0.5 text-[10.5px]">exclude</code>.
          </p>
          <textarea
            className="ss-textarea"
            value={text}
            rows={16}
            spellCheck={false}
            aria-label="Rules JSON"
            onChange={(event) => setText(event.target.value)}
          />
        </>
      )}

      {errors.length > 0 && (
        <div className="ss-alert ss-alert-error">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Fix these first
          </div>
          <ul className="mt-1 space-y-0.5 pl-5 text-[11.5px]">
            {errors.slice(0, 8).map((error) => (
              <li key={error} className="list-disc">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === "visual" && errors.length === 0 && liveErrors.length > 0 && (
        <div className="ss-alert ss-alert-warn flex items-start gap-1.5 text-[11.5px]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {liveErrors.length} issue{liveErrors.length === 1 ? "" : "s"} to fix before saving —{" "}
            {liveErrors[0]}
          </span>
        </div>
      )}

      {notice && (
        <div className="ss-alert ss-alert-success flex items-start gap-1.5 text-[11.5px]">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <button className="ss-btn ss-btn-sm ss-btn-primary" type="button" onClick={handleSave} disabled={busy}>
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {busy ? "Saving…" : "Save rules"}
        </button>
        <button
          className="ss-btn ss-btn-sm"
          type="button"
          onClick={() => {
            const defaults = clone(DEFAULT_RULES)
            setDraft(defaults)
            setText(DEFAULT_RULES_JSON)
            setErrors([])
            setNotice("Default rules loaded. Press Save rules to apply them.")
          }}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>
        <button className="ss-btn ss-btn-sm" type="button" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export
        </button>
        <button className="ss-btn ss-btn-sm" type="button" onClick={() => fileInput.current?.click()}>
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
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
