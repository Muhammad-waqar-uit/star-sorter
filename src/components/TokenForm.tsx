import { CheckCircle2, ExternalLink, KeyRound, Loader2, Trash2 } from "./icons"
import { useState } from "react"

import { removeToken, saveToken, SorterError } from "../lib/client"

const TOKEN_URL =
  "https://github.com/settings/tokens/new?scopes=user&description=Star%20Sorter%20for%20GitHub"
const TOKEN_GUIDE_URL =
  "https://github.com/Muhammad-waqar-uit/star-sorter/blob/main/docs/TOKEN_SETUP.md"
const MANAGE_TOKENS_URL = "https://github.com/settings/tokens"

type Props = {
  connected: boolean
  login?: string | null
  onChanged: () => void | Promise<void>
}

/**
 * Token entry. The token goes straight to the background worker; it is never
 * read back into this component, so the input is always empty after saving.
 */
export function TokenForm({ connected, login, onChanged }: Props) {
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replacing, setReplacing] = useState(false)

  const showForm = !connected || replacing

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveToken(token)
      setToken("")
      setReplacing(false)
      await onChanged()
    } catch (err) {
      setError(err instanceof SorterError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    setBusy(true)
    setError(null)
    try {
      await removeToken()
      await onChanged()
    } catch (err) {
      setError(err instanceof SorterError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface2/60 p-3.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <h3 className="text-[13px] font-bold text-ink">GitHub token</h3>
        {connected && (
          <span className="ss-badge-success ss-badge ml-auto">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Connected
          </span>
        )}
      </div>

      <p className="mb-3 text-[11.5px] leading-relaxed text-muted">
        Star Sorter needs a <strong className="font-semibold text-ink">classic</strong> personal
        access token with the <code className="rounded bg-surface px-1 py-0.5 text-[11px]">user</code>{" "}
        scope. Fine-grained tokens cannot manage Lists. It is stored only in this browser and
        only sent to api.github.com. Choose whether to keep it or delete it after each apply run
        in Settings.
      </p>

      {connected && !replacing && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="ss-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {login ?? "your account"}
          </span>
          <button className="ss-btn ss-btn-sm" type="button" onClick={() => setReplacing(true)}>
            Replace token
          </button>
          <button
            className="ss-btn ss-btn-sm ss-btn-danger"
            type="button"
            onClick={handleRemove}
            disabled={busy}>
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Remove
          </button>
        </div>
      )}

      {showForm && (
        <>
          <div className="flex items-center gap-2">
            <input
              className="ss-input flex-1 font-mono"
              type="password"
              value={token}
              autoComplete="off"
              aria-label="GitHub personal access token"
              placeholder="ghp_…"
              onChange={(event) => setToken(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && token.trim()) void handleSave()
              }}
            />
            <button
              className="ss-btn ss-btn-primary shrink-0"
              type="button"
              onClick={handleSave}
              disabled={busy || !token.trim()}>
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              {busy ? "Checking…" : "Save token"}
            </button>
            {replacing && (
              <button
                className="ss-btn ss-btn-sm shrink-0"
                type="button"
                onClick={() => {
                  setReplacing(false)
                  setToken("")
                  setError(null)
                }}>
                Cancel
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href={TOKEN_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline">
              Open the pre-filled classic token form
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            <a
              href={TOKEN_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline">
              Full setup guide
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            <a
              href={MANAGE_TOKENS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline">
              Manage tokens
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>

          <details className="mt-2 rounded-lg border border-line bg-surface/60 px-2.5 py-2">
            <summary className="cursor-pointer text-[11px] font-medium text-accent">
              How to create the token: settings and scopes
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-muted">
              <li>
                Open the link above. It opens GitHub's <strong>classic</strong> token form with
                the <code>user</code> scope already selected. If you start from GitHub instead,
                use <strong>Settings → Developer settings → Personal access tokens → Tokens
                (classic) → Generate new token (classic)</strong>.
              </li>
              <li>
                <strong>Note:</strong> <code>Star Sorter for GitHub</code>.{" "}
                <strong>Expiration:</strong> 30, 60 or 90 days. Avoid no expiration.
              </li>
              <li>
                <strong>Select scopes:</strong> tick <strong>only</strong>{" "}
                <code>user</code>. Leave <code>repo</code>, <code>workflow</code>,{" "}
                <code>admin:*</code> and <code>read:user</code> unchecked.{" "}
                <code>read:user</code> is read-only and cannot create or update Lists.
              </li>
              <li>
                Click <strong>Generate token</strong>, copy the <code>ghp_…</code> value (shown
                once), paste it above, and press <strong>Save token</strong>.
              </li>
            </ol>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Fine-grained tokens are not supported for Lists. To rotate or revoke a token later,
              use <strong>Manage tokens</strong> above, then <strong>Replace token</strong> here.
            </p>
          </details>
        </>
      )}

      {error && <div className="ss-alert ss-alert-error mt-2">{error}</div>}
    </section>
  )
}
