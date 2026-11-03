# Progress

Snapshot: **2026-11-03**

## Summary

The repository contains a complete, buildable Plasmo extension: background worker, shadow-DOM
panel, options page, popup, typed GitHub client, rules engine, planning/merge logic, undo,
list management, documentation and a brand icon set. The UI uses Tailwind CSS with per-icon
Lucide imports. Unit tests cover the pure logic and the GraphQL client's pagination, retry and
error mapping, and a GitHub Actions workflow builds and publishes tagged releases automatically.

## Verification

| Check | Command | Result |
| --- | --- | --- |
| TypeScript (strict) | `pnpm typecheck` | Passes |
| Unit tests | `pnpm test` | 37 tests in 4 files, all passing |
| Production build | `pnpm build` | Succeeds → `build/chrome-mv3-prod` |
| Firefox build | `pnpm build:firefox` | Succeeds → `build/firefox-mv3-prod` |
| Release pipeline | `.github/workflows/release.yml` | Typecheck → test → build both targets → version bump → tag → GitHub Release with zips (see [RELEASING.md](RELEASING.md)) |
| Manifest | inspect `build/chrome-mv3-prod/manifest.json` | MV3, `storage` + `api.github.com`, service worker, content script, popup, options, generated 16–128 px icons |

> The production build on this Windows machine needed the Microsoft VC++ runtime for Parcel's
> native modules. It was supplied app-locally for verification; a normal machine should install
> the official [VC++ redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe). See
> [LIMITATIONS.md](LIMITATIONS.md#platform--runtime).

## Done

- [x] Project scaffold (Plasmo + React 18 + strict TypeScript + pnpm)
- [x] Brand assets: cleaned SVG logo/icon, 512 px icon, generated icon sizes, README logo
- [x] Typed GraphQL client with pagination, retries, backoff and error mapping
- [x] Rules engine: topics, languages, keywords, owners, exclude, ordering, `maxListsPerRepo`
- [x] Bundled 12-list default rule set
- [x] Preview plan with overrides, filters, search, grouping, bulk assignment, virtualized rows
- [x] Apply with merge, 250 ms pacing, cancel, per-repo failures, retry failed, summary
- [x] Undo of the last run, including cleanup of empty created lists
- [x] Lists tab (create with description, rename, edit description, privacy, delete, counts, limit warnings)
- [x] JSON rules editor with validation, live counts, import/export/reset
- [x] Visual rule builder with drag reorder, add/rename/delete and chip inputs
- [x] Live scan progress counter
- [x] Token form with validation and removal
- [x] Popup with connection status, last scan, last run result and quick links
- [x] Options page with preferences, privacy notes and danger zone
- [x] Tailwind CSS design tokens, component layer and per-icon Lucide imports
- [x] Shadow-DOM styles, GitHub light/dark detection, ARIA labels and focus states
- [x] Unit tests (rules, plan/merge, undo log, GraphQL client, row windowing)
- [x] Documentation set + CI workflow
- [x] Automatic GitHub Release pipeline with Chrome and Firefox zips
- [x] Optional Firefox MV3 production build

## Not done

- [ ] Native per-repo “Move to list” menu (F10, v1.1)
- [ ] Manual end-to-end pass against a real GitHub account (needs a token and a throwaway repo set)
- [ ] Store screenshots and listing submission
- [ ] Firefox runtime smoke test
- [ ] Score-based suggestions and AI-assisted classification (future ideas)

## Notes for the next session

- Scan data is intentionally memory-only; a worker restart requires a rescan.
- `runState` is polled, so the apply flow can be reconnected after closing the panel.
- All list writes must go through `desiredListIds()`; never send only the target id.
- If GitHub changes list mutations, only `src/lib/github.ts` needs updating.
