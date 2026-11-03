<p align="center">
  <img src="assets/brand/logo.png" alt="Star Sorter — organize your GitHub stars" width="560" />
</p>

<p align="center">
  Turn a flat, 500-repo Stars page into organized <strong>GitHub Lists</strong> — automatically, locally, and with an editable preview before anything changes.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-6d7cf2.svg" /></a>
  <img alt="Plasmo" src="https://img.shields.io/badge/built%20with-Plasmo-6d7cf2.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" />
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-238636.svg" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-30%20passing-238636.svg" />
</p>

---

## Why Star Sorter

GitHub Lists are the folders on your Stars page, but filing hundreds of repositories by hand is slow. Star Sorter reads your stars and lists through the GitHub GraphQL API, proposes a target list for every repository using rules you can edit, lets you review and change each suggestion, and only then writes the changes back.

- **Review before writing.** Scan → preview → apply. Nothing is modified until you press Apply.
- **Rules that fit your brain.** Topics, languages, keywords, owners and exclusions, evaluated top to bottom.
- **Your data stays yours.** The token lives in `chrome.storage.local`; the only network destination is `api.github.com`.
- **Mistakes are reversible.** Every run records the previous list memberships so you can undo it.
- **Works where you work.** A floating panel on your GitHub Stars page, in GitHub's light and dark themes.

## Features

| | |
| --- | --- |
| **Stars page panel** | Floating _Sort stars_ button, only on `?tab=stars` / `/stars`, inside a shadow DOM so GitHub's CSS is untouched. |
| **Token management** | Classic token with the `user` scope, validated against `viewer` before it is saved; remove or replace it any time. |
| **Full scan** | Every starred repo (id, name, description, language, topics, stars, updated date, archived flag) plus every list and its members, 100 per page. |
| **Editable rules** | JSON rule editor with validation, live per-list match counts, import, export and reset. Bundled defaults for 12 common categories. |
| **Reviewable plan** | Grouped, filterable table with per-repo overrides, bulk assignment, skip, and a running count of the moves that will happen. |
| **Safe apply** | Creates missing lists, merges the target with existing memberships, paces writes at 250 ms, retries transient failures and reports every failure. |
| **Undo** | Restores the previous memberships of the last run and removes lists that run created when they are empty. |
| **List management** | Create, rename, change privacy and delete lists, with the 32-list GitHub limit surfaced early. |
| **Popup & options** | Status at a glance, full-size rule editing, preferences, privacy notes and a data-reset zone. |

## Install

### From source (development)

Requirements: **Node 20+**, **pnpm**, and a Chromium browser (Chrome or Edge).

```bash
pnpm install
pnpm dev          # Plasmo dev build with hot reload
```

Load the development build:

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select `build/chrome-mv3-dev`.

### Production build

```bash
pnpm build        # → build/chrome-mv3-prod
pnpm package      # zip for the Chrome Web Store / Edge Add-ons
```

> **Windows note:** Plasmo's bundler (Parcel) uses native modules that need the Microsoft Visual C++ Redistributable (x64). If `pnpm build` fails with `ERR_DLOPEN_FAILED ... .node`, install the [latest VC++ redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe) once and rerun the build.

## Use

1. Create a **classic** personal access token with the `user` scope — [open the pre-filled token form](https://github.com/settings/tokens/new?scopes=user&description=Star%20Sorter%20for%20GitHub).
2. Visit `https://github.com/<you>?tab=stars` and click **Sort stars**.
3. Paste the token and press **Save token** — the panel shows `Connected as <you>`.
4. Press **Scan and preview**. Every repo gets a suggested list; unsorted repos are grouped first.
5. Adjust the dropdowns (or edit rules), then press **Apply**. Existing list memberships are preserved.
6. If something looks wrong, press **Undo last run**.

A token is required because only the GraphQL API can read and write lists. Star Sorter never sees your password, never uses OAuth and has no backend.

## How it works

```text
GitHub Stars page
  └─ content script (React, shadow DOM)
        │  @plasmohq/messaging
        ▼
  background service worker  ──►  api.github.com/graphql
        │                        (scan, lists, mutations, retries)
        ▼
  chrome.storage.local              rules · settings · token · undo log · run state
```

- All GitHub requests and the token stay in the background worker, out of page context and page CSP.
- The rules engine and planning/merge logic are pure TypeScript in `src/lib`, unit tested with Vitest.
- `updateUserListsForItem` replaces the complete membership set, so the worker always merges the target list with the repo's current lists.
- Progress is written to storage and polled by the panel, so closing and reopening the panel reconnects to a running apply.

Full details: [Architecture](docs/ARCHITECTURE.md).

## Project structure

```text
src/
├── background/
│   ├── index.ts             service worker entry
│   ├── apply-runner.ts      list creation, sequential writes, undo
│   └── messages/            validate-token · session · scan · apply · progress · cancel · undo · lists · clear-data
├── contents/
│   └── stars-panel.tsx      Stars-page detection, floating button, shadow DOM
├── components/              Panel, PlanTable, RulesEditor, ListManager, TokenForm, ProgressBar, SettingsTab
├── lib/
│   ├── github.ts            GraphQL client, queries, retries, pagination
│   ├── rules.ts             rule matching, classification, validation
│   ├── plan.ts              preview plan, membership merge, summaries
│   ├── defaults.ts          bundled rule set
│   ├── history.ts           undo log
│   ├── storage.ts           typed chrome.storage.local access
│   └── client.ts            typed message wrappers for the UI
├── options.tsx              full options page
├── popup.tsx                toolbar popup
└── style.css                panel + page styles
assets/                      512×512 icon (Plasmo generates the icon set) and brand files
docs/                        architecture, features, limitations, plan, progress, testing, requirements
```

## Security & privacy

- Only the `storage` permission and the `api.github.com` host permission are requested.
- The token is stored in `chrome.storage.local`, read only by the background worker, never logged and never placed in a URL.
- Repository descriptions are rendered as React text nodes — never `dangerouslySetInnerHTML`.
- No analytics, no remote code, no third-party requests. See [Privacy](docs/PRIVACY.md) and [Security](SECURITY.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — components, messaging contracts, storage schema, design decisions
- [Features](docs/FEATURES.md) — what ships today, traced to the spec
- [Limitations](docs/LIMITATIONS.md) — known gaps and sharp edges
- [Plan](docs/PLAN.md) — milestones and remaining work
- [Progress](docs/PROGRESS.md) — status snapshot and verification results
- [Testing](docs/TESTING.md) — automated tests and the manual end-to-end checklist
- [Requirements](docs/REQUIREMENTS.pdf) — the original product and technical spec

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first; run `pnpm typecheck`, `pnpm test` and `pnpm build` before opening a PR.

## License

[MIT](LICENSE) © Muhammad Waqar
