# Plan

Milestones follow the original specification. Status reflects the repository as built.

## M0 — Spike (done)

- Confirm a classic token with the `user` scope can call `createUserList` and
  `updateUserListsForItem`.
- Confirm the merge semantics: `updateUserListsForItem` replaces the full set, so existing
  list ids must be preserved.
- Result: encoded in `desiredListIds()` and documented in `ARCHITECTURE.md`.

## M1 — Core (done)

- Plasmo project, strict TypeScript, React 18, plain CSS in a shadow root.
- Background worker owns the token and all GraphQL traffic.
- Token form with validation.
- Star and list scan with pagination.
- Rules engine with bundled defaults.
- Simple preview and apply with membership merge.

## M2 — Control (done)

- Editable dropdowns incl. Skip and “New list”.
- Filters, search, grouping, bulk assignment, include-already-filed.
- Progress bar, cancel, failed-row reporting.
- Per-repo overrides never mutate the underlying suggestions.

## M3 — Safety (done)

- Undo log and restore, including deletion of empty lists created by the run.
- Rule-set validation with readable errors.
- Error mapping for auth, scope, rate limit, network, GraphQL and the 32-list cap.
- Retry with exponential backoff and `retry-after` awareness.
- 32-list pre-flight check.

## M4 — Management (done, except visual builder)

- Lists tab: create, rename, privacy toggle, delete, counts.
- JSON rules editor with per-list match counts, import/export and reset.
- Visual rule builder (drag to reorder, chip inputs) — **remaining**.
- Per-repo native menu (F10) — **remaining, v1.1**.

## M5 — Polish (done)

- Light/dark themes from GitHub, plus manual override.
- ARIA labels, focus states, keyboard-operable controls.
- Popup and options pages.
- Brand icon source plus generated icon set.

## M6 — Release (partially done)

- Store listing copy, screenshots and privacy policy: privacy policy drafted
  ([PRIVACY.md](PRIVACY.md)); screenshots and submission **remaining**.
- Firefox build: optional, **not started**.
- CI: typecheck, tests and production build on every push.

## Next up

1. Virtualize the plan table for 5,000+ rows (NFR2).
2. Visual rule builder on top of the existing validation and counts.
3. Manual end-to-end run against a throwaway account with ~50 stars: scan → apply → undo,
   cancel mid-run, expired token, offline, both themes, SPA navigation.
4. Optional Firefox target and store submissions.
5. Score-based suggestions and an “Archive” list for archived/stale repos (spec §12).
