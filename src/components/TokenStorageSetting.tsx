import { useId } from "react"

import type { TokenPolicy } from "../lib/types"

type Props = {
  value: TokenPolicy
  onChange: (value: TokenPolicy) => void
}

const options: {
  value: TokenPolicy
  title: string
  description: string
}[] = [
  {
    value: "keep",
    title: "Keep until I remove it",
    description:
      "Stored in chrome.storage.local. You are responsible for removing it with Remove token, Clear all data, or by uninstalling the extension."
  },
  {
    value: "delete-after-run",
    title: "Delete after each apply run",
    description:
      "Removes the token and cached account when an apply run finishes — including cancelled or failed runs. Scans, list edits and undo do not delete it. You will need to paste it again for the next apply or an undo."
  }
]

/**
 * Token retention choice shared by the panel settings and the options page.
 * Keeping the token is the default; automatic deletion is opt-in.
 */
export function TokenStorageSetting({ value, onChange }: Props) {
  const name = useId()

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const selected = value === option.value
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors ${
              selected
                ? "border-accent/40 bg-accent-soft"
                : "border-line bg-surface2/40 hover:bg-hover"
            }`}>
            <input
              type="radio"
              className="mt-0.5"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-ink">{option.title}</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                {option.description}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
