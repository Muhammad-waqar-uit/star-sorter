import { useEffect, useRef, useState } from "react"

import { DEFAULT_RULES_JSON } from "../lib/defaults"
import {
  countAssignments,
  parseRuleSetJson,
  RuleValidationError
} from "../lib/rules"
import type { RuleSet, StarredRepo } from "../lib/types"

type Props = {
  rules: RuleSet
  repos: StarredRepo[]
  onSaved: (rules: RuleSet) => void | Promise<void>
}

/**
 * JSON rule editor with validation, live match counts, import/export and reset.
 * The visual builder lives on the roadmap; JSON keeps the whole rule surface
 * available today (topics, languages, keywords, owners, excludes, ordering).
 */
export function RulesEditor({ rules, repos, onSaved }: Props) {
  const [text, setText] = useState(() => JSON.stringify(rules, null, 2))
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(JSON.stringify(rules, null, 2))
  }, [rules])

  const counts = countAssignments(repos, rules)

  const handleSave = async () => {
    setErrors([])
    setNotice(null)
    try {
      const parsed = parseRuleSetJson(text)
      setBusy(true)
      await onSaved(parsed)
      setText(JSON.stringify(parsed, null, 2))
      setNotice(`Saved ${parsed.lists.length} rules.`)
    } catch (error) {
      if (error instanceof RuleValidationError) setErrors(error.errors)
      else setErrors([error instanceof Error ? error.message : String(error)])
    } finally {
      setBusy(false)
    }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: "application/json" })
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
      parseRuleSetJson(value)
      setText(value)
      setNotice(`Loaded ${file.name}. Press Save rules to apply it.`)
    } catch (error) {
      if (error instanceof RuleValidationError) setErrors(error.errors)
      else setErrors([error instanceof Error ? error.message : String(error)])
    }
  }

  return (
    <div>
      <div className="ss-row">
        <span className="ss-badge">{rules.lists.length} / 32 lists</span>
        <span className="ss-badge">Max {rules.maxListsPerRepo} per repo</span>
        <span className="ss-badge">{rules.private ? "Private" : "Public"} new lists</span>
      </div>

      {repos.length > 0 && (
        <div className="ss-rule-list" aria-label="Rule preview">
          {rules.lists.map((rule) => (
            <div className="ss-rule" key={rule.name}>
              <div className="ss-rule-head">
                <strong>{rule.name}</strong>
                <span className="ss-badge">{counts[rule.name] ?? 0} stars</span>
              </div>
              <p>
                {[
                  rule.match.topics?.length ? `topics: ${rule.match.topics.join(", ")}` : "",
                  rule.match.languages?.length ? `languages: ${rule.match.languages.join(", ")}` : "",
                  rule.match.owners?.length ? `owners: ${rule.match.owners.join(", ")}` : "",
                  rule.match.keywords?.length ? `keywords: ${rule.match.keywords.join(", ")}` : ""
                ]
                  .filter(Boolean)
                  .join(" · ") || "No signals configured"}
              </p>
            </div>
          ))}
        </div>
      )}

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
      {notice && <div className="ss-alert success">{notice}</div>}

      <div className="ss-row" style={{ marginTop: 8 }}>
        <button className="ss-btn primary" type="button" onClick={handleSave} disabled={busy}>
          {busy ? "Saving…" : "Save rules"}
        </button>
        <button
          className="ss-btn"
          type="button"
          onClick={() => {
            setText(DEFAULT_RULES_JSON)
            setNotice("Default rules loaded. Press Save rules to apply them.")
            setErrors([])
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
