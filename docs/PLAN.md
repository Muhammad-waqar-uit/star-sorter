# Plan

Milestones follow the original specification. Status reflects the repository as built.

## M0 — Spike (done)

- Confirm a classic token with the `user` scope can call `createUserList` and
  `updateUserListsForItem`.
- Confirm the merge semantics: `updateUserListsForItem` replaces the full set, so existing
  list ids must be preserved.
- Result: encoded in `desiredListIds()` and documented in `ARCHITECTURE.md`.

## M1 — Core (done)

- Plasmo project, strict TypeScript, React 18, Tailwind CSS in a shadow root.
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

## M4 — Management (done)

- Lists tab: create, rename, privacy toggle, delete, counts.
- JSON rules editor with per-list match counts, import/export and reset.
- Visual rule builder: add, rename, drag reorder, delete, chip inputs for every signal.
- Virtualized preview table for large collections.
- Per-repo native menu (F10) — **remaining, v1.1 stretch**.

## M5 — Polish (done)

- Tailwind design tokens, Lucide icons and a component layer shared by the panel and pages.
- Light/dark themes from GitHub, plus manual override.
- ARIA labels, focus states, keyboard-operable controls.
- Popup and options pages.
- Brand icon source plus generated icon set.

## M6 — Release (partially done)

- Store listing copy, screenshots and privacy policy: privacy policy drafted
  ([PRIVACY.md](PRIVACY.md)); screenshots and submission **remaining**.
- Firefox build: `pnpm build:firefox` produces a valid MV3 package; runtime smoke test **remaining**.
- CI: typecheck, tests and production build on every push.
- Release automation: every push to `main` typechecks, tests, builds both targets, bumps the
  version, tags it and publishes a GitHub Release with ready-to-load zips (see
  [RELEASING.md](RELEASING.md)). **Done.**

## Next up

1. Manual end-to-end run against a throwaway account with ~50 stars: scan → apply → undo,
   cancel mid-run, expired token, offline, both themes, SPA navigation.
2. Optional Firefox target and store submissions (copy is ready in STORE_LISTING.md).
3. Native per-repo “Move to list” menu (F10, v1.1 stretch).
4. Score-based suggestions and an “Archive” list for archived/stale repos (spec §12).
