import { useState } from "react"

type Props = {
  id: string
  label: string
  values: string[]
  placeholder: string
  onChange: (next: string[]) => void
}

/**
 * Comma/Enter separated chip input used by the visual rule editor. Values are
 * de-duplicated case insensitively, matching how the engine compares them.
 */
export function ChipInput({ id, label, values, placeholder, onChange }: Props) {
  const [text, setText] = useState("")

  const add = () => {
    const parts = text
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)

    if (parts.length === 0) return

    const next = [...values]
    for (const part of parts) {
      if (!next.some((value) => value.toLowerCase() === part.toLowerCase())) next.push(part)
    }
    onChange(next)
    setText("")
  }

  return (
    <div className="ss-field">
      <label className="ss-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="ss-chips">
        {values.map((value) => (
          <span className="ss-chip" key={value}>
            {value}
            <button
              type="button"
              aria-label={`Remove ${value} from ${label}`}
              onClick={() => onChange(values.filter((entry) => entry !== value))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          placeholder={placeholder}
          aria-label={label}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault()
              add()
            } else if (event.key === "Backspace" && !text && values.length > 0) {
              onChange(values.slice(0, -1))
            }
          }}
        />
      </div>
    </div>
  )
}
