# Architecture

Star Sorter is a Plasmo (Manifest V3) extension built with React and TypeScript. It has no
backend, no build-time server and no remote code. The design goal is a small trusted core:
**all network traffic and the GitHub token live in one place**, and every decision that can
go wrong is previewable and reversible.

## Components

| Component | Path | Responsibility |
| --- | --- | --- |
| Content script UI | `src/contents/stars-panel.tsx` | Detects Stars pages (including Turbo navigation), renders the floating button and panel inside a shadow DOM, follows GitHub's light/dark mode. |
| Panel | `src/components/Panel.tsx` | Owns scan/plan/override state, polls run progress, orchestrates the tabs. |
| Background worker | `src/background/index.ts` | Service-worker entry; initializes defaults. Owns the token, all GitHub calls and long-running applies. |
| Message handlers | `src/background/messages/*.ts` | One operation per file, registered by Plasmo for `@plasmohq/messaging`. |
| Apply runner | `src/background/apply-runner.ts` | Creates missing lists, merges memberships, paces writes, records the undo log, restores it on undo. |
| Core library | `src/lib/*.ts` | Pure rules engine, planning and merge helpers, GraphQL client, storage access. Unit tested. |
| Options page | `src/options.tsx` | Token, full rules editor, preferences, privacy and data reset. |
| Popup | `src/popup.tsx` | Connection status, last scan, quick links. |

## Data flow

### Scan

1. The panel sends `scan` to the worker.
2. The worker reads the token from `chrome.storage.local` and calls `viewer` to resolve the login.
3. It pages `starredRepositories(first: 100)` until `hasNextPage` is false, then pages each
   list's `items` connection.
4. A normalized `ScanResult` goes back to the panel. Stars and lists are kept **in memory**
   only; a worker restart loses them, and the UI simply rescans.

### Preview

`buildPlan()` maps every repo to a suggested list via the rules engine. The panel layers
per-repo overrides on top, so editing suggestions never mutates the rule output. The plan is
recomputed locally when rules change — no rescan needed.

`updateUserListsForItem` is a **replace** operation, not an add. The plan therefore tracks the
repo's current list ids, and `desiredListIds()` produces `current ∪ {target}`.

### Apply

1. `beginRun()` validates the request, refuses to start while another fresh run is active,
   records a `running` RunState and returns a run id.
2. The handler answers immediately; the worker continues in a detached async task.
3. `executeRun()` refetches lists, checks the 32-list limit, creates missing lists, writes the
   undo log, then files repos one at a time with a 250 ms gap.
4. Each step rewrites `runState`, which the panel polls every 700 ms while the run is active.
   This is why closing and reopening the panel reconnects to the same run.

Polling was chosen over a long-lived port because the run must survive the panel and content
script being torn down by Turbo navigation, and because storage is already the source of truth
for progress.

### Undo

Before the first mutation the worker snapshots the previous list ids for every affected repo.
On undo it calls `updateUserListsForItem` with those exact sets, then deletes lists the run
created if they are now empty. Only the most recent run is kept.

## Messaging contracts

All messages use a `MessageResponse<T>` envelope: `{ ok: true, data }` or
`{ ok: false, error, code? }`. Errors carry a machine-readable `code` (`auth`, `scope`,
`rate-limit`, `network`, `graphql`, `list-limit`, `no-token`, `validation`, `unknown`) so the UI
can render actionable messages.

| Message | Request | Response |
| --- | --- | --- |
| `validate-token` | `{ token }` or `{ clear: true }` | `{ account, login }` / `{ cleared }` |
| `session` | — | `{ connected, account, lastScan, undoAvailable }` |
| `scan` | — | `{ at, account, stars, lists }` |
| `apply` | `{ items: [{ repoId, nameWithOwner, targetList }] }` | `{ runId, total }` |
| `progress` | — | `RunState \| null` |
| `cancel` | — | `{ cancelling: true }` |
| `undo` | — | `{ restored, deletedLists, failures }` |
| `lists` | `{ action: refresh \| create \| update \| delete, ... }` | `{ lists }` |
| `clear-data` | — | `{ cleared: true }` |

## Storage schema

Everything is `chrome.storage.local`:

| Key | Shape | Notes |
| --- | --- | --- |
| `token` | `string` | Read only by the background worker. Never returned by `session`. |
| `account` | `{ login, name?, avatarUrl? }` | Cached viewer identity. |
| `rules` | `RuleSet` | Validated on read; invalid data falls back to the bundled defaults. |
| `settings` | `{ includeSorted, theme }` | Theme is `auto` (follow GitHub) / `light` / `dark`. |
| `lastScan` | `{ at, starCount, listCount, login }` | Popup summary only; star data is never persisted. |
| `undoLog` | `{ at, previous, createdListIds, names }` | Single most recent run. |
| `runState` | `RunState` | Progress and failures, also used for reconnect. |

## GitHub API use

- One endpoint: `POST https://api.github.com/graphql`, `Authorization: bearer <token>`.
- Reads: `viewer`, `starredRepositories`, `lists` and each list's `items`, plus `viewer` for
  token validation.
- Writes: `createUserList`, `updateUserList`, `deleteUserList`, `updateUserListsForItem`.
- 250 ms between mutations, exponential backoff (600 ms → 4.8 s) with `retry-after` /
  `x-ratelimit-reset` awareness, up to four attempts. Auth and scope errors are not retried.
- Pagination uses `pageInfo.endCursor` everywhere; there is no offset assumption.

## Security boundaries

- The content script runs in page context but never receives the token. It asks the worker for
  connection state and operations.
- The token is never logged, never placed in a URL, never stored in `chrome.storage.sync`.
- Repo descriptions and list names are untrusted text: rendered as React text nodes only.
- Panel styles are injected into a shadow root, so GitHub's CSS and ours cannot collide.
- The extension requests only `storage` and `https://api.github.com/*`.

## Deliberate trade-offs

| Decision | Why |
| --- | --- |
| Poll progress instead of streaming ports | Survives panel close/reopen and content-script teardown; storage is already authoritative. |
| Keep stars in memory | Cheap to refetch, always fresh, no stale cache to invalidate. |
| First match wins | Predictable, explainable rules; multi-list membership remains available via `maxListsPerRepo`. |
| JSON rules editor first | Exposes the full rule surface (ordering, owners, excludes) with validation and no drag-and-drop bugs. |
| Cancellation in memory | A worker restart ends the run anyway; a persisted flag would only block the next attempt. |
| Case-insensitive list matching | Avoids duplicate lists with different casing. |
