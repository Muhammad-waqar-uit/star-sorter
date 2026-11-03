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
  <img alt="Tests" src="https://img.shields.io/badge/tests-37%20passing-238636.svg" />
  <img alt="UI: Tailwind CSS + Lucide" src="https://img.shields.io/badge/UI-Tailwind%20%2B%20Lucide-38bdf8.svg" />
</p>

<p align="center">
  <a href="https://github.com/Muhammad-waqar-uit/star-sorter/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/Muhammad-waqar-uit/star-sorter?label=latest&color=6d7cf2" /></a>
  <a href="https://github.com/Muhammad-waqar-uit/star-sorter/actions/workflows/release.yml"><img alt="Release workflow" src="https://github.com/Muhammad-waqar-uit/star-sorter/actions/workflows/release.yml/badge.svg" /></a>
</p>

---

## Why Star Sorter

GitHub Lists are the folders on your Stars page, but filing hundreds of repositories by hand is slow. Star Sorter reads your stars and lists through the GitHub GraphQL API, proposes a target list for every repository using rules you can edit, lets you review and change each suggestion, and only then writes the changes back.

- **Review before writing.** Scan → preview → apply. Nothing is modified until you press Apply.
- **Rules that fit your brain.** Topics, languages, keywords, owners and exclusions, evaluated top to bottom.
- **Your data stays yours.** The token lives in `chrome.storage.local`; the only network destination is `api.github.com`.
- **Mistakes are reversible.** Every run records the previous list memberships so you can undo it.
- **Works where you work.** A floating panel on your GitHub Stars page, in GitHub's light and dark themes.

## Download and install

**[Open the latest release →](https://github.com/Muhammad-waqar-uit/star-sorter/releases/latest)**

Each release ships two ready-to-load builds:

| File | Browser | How to install |
| --- | --- | --- |
| `star-sorter-<version>-chrome.zip` | Chrome, Edge, Brave, Arc | Unzip → open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the unzipped folder. |
| `star-sorter-<version>-firefox.zip` | Firefox 128+ | Unzip → open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select `manifest.json`. |

Releases are published automatically by the [Release workflow](.github/workflows/release.yml) on every push to `main`: it typechecks, runs the tests, builds both targets, bumps the version, tags the commit and attaches the zips. The Firefox build is unsigned, so it stays installed only for the current session; Chrome/Edge keep the unpacked extension until you remove it.

## Features

| | |
| --- | --- |
| **Stars page panel** | Floating _Sort stars_ button, only on `?tab=stars` / `/stars`, inside a shadow DOM so GitHub's CSS is untouched. |
| **Token management** | Classic token with the `user` scope, validated against `viewer` before it is saved; remove or replace it any time. |
| **Full scan** | Every starred repo (id, name, description, language, topics, stars, updated date, archived flag) plus every list and its members, 100 per page. |
| **Editable rules** | Visual builder (add, rename, drag-reorder, delete, chip inputs) plus a JSON editor with validation, live per-list match counts, import, export and reset. Bundled defaults for 12 common categories. |
| **Reviewable plan** | Grouped, searchable, virtualized table with per-repo overrides, bulk assignment, skip, live scan progress and a running count of the moves that will happen. |
| **Safe apply** | Creates missing lists, merges the target with existing memberships, paces writes at 250 ms, retries transient failures and reports every failure. |
| **Undo** | Restores the previous memberships of the last run and removes lists that run created when they are empty. |
| **List management** | Create lists with descriptions, rename, edit descriptions, change privacy and delete, with the 32-list GitHub limit surfaced early. |
| **Popup & options** | Status at a glance, full-size rule editing, preferences, privacy notes and a data-reset zone. |
| **Polished UI** | Tailwind CSS design tokens, a GitHub-matching light/dark theme, Lucide icons and focus-visible states, all isolated in a shadow root. |

## Build from source

### Development

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
pnpm build           # Chrome/Edge MV3 → build/chrome-mv3-prod
pnpm build:firefox   # optional Firefox MV3 → build/firefox-mv3-prod
pnpm package         # zip for the Chrome Web Store / Edge Add-ons
```

To publish the next version yourself, either push to `main` or run the **Release** workflow manually (`Actions → Release → Run workflow`). See [Releasing](docs/RELEASING.md) for version rules and recovery steps.

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
- The preview renders only the visible rows (windowing), so 5,000 stars stay responsive.
- The interface uses Tailwind CSS and per-icon Lucide imports; only the icons in use are bundled, and the panel's styles never leak into GitHub.
- `updateUserListsForItem` replaces the complete membership set, so the worker always merges the target list with the repo's current lists.
- Progress is written to storage and polled by the panel, so closing and reopening the panel reconnects to a running apply.

Full details: [Architecture](docs/ARCHITECTURE.md).

## Project structure

```text
src/
├── background/
│   ├── index.ts             service worker entry
│   ├── apply-runner.ts      list creation, sequential writes, undo
│   └── messages/            validate-token · session · scan · scan-progress · apply · progress · cancel · undo · lists · clear-data
├── contents/
│   └── stars-panel.tsx      Stars-page detection, floating button, shadow DOM
├── components/              Panel, PlanTable, RulesEditor, VisualRulesEditor, ChipInput, ListManager, TokenForm, ProgressBar, SettingsTab, icons.ts
├── lib/
│   ├── github.ts            GraphQL client, queries, retries, pagination
│   ├── rules.ts             rule matching, classification, validation
│   ├── plan.ts              preview plan, membership merge, summaries
│   ├── virtual.ts           fixed-height row windowing for the plan table
│   ├── defaults.ts          bundled rule set
│   ├── history.ts           undo log
│   ├── storage.ts           typed chrome.storage.local access
│   └── client.ts            typed message wrappers for the UI
├── options.tsx              full options page
├── popup.tsx                toolbar popup
└── style.css                Tailwind entry: theme tokens, components and scrollbars
assets/                      512×512 icon (Plasmo generates the icon set) and brand files
.github/                     CI + automatic release workflow and the version script
docs/                        architecture, features, limitations, plan, progress, releasing, testing, requirements
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
- [Releasing](docs/RELEASING.md) — automatic versioning, release assets and recovery
- [Testing](docs/TESTING.md) — automated tests and the manual end-to-end checklist
- [Store listing](docs/STORE_LISTING.md) — copy, permission justifications and the submission checklist
- [Requirements](docs/REQUIREMENTS.pdf) — the original product and technical spec

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first; run `pnpm typecheck`, `pnpm test` and `pnpm build` before opening a PR. Merging to `main` publishes the next release automatically, so keep `main` green.

## License

[MIT](LICENSE) © Muhammad Waqar
