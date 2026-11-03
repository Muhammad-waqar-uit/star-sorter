# Store listing

Copy and compliance notes for Chrome Web Store and Microsoft Edge Add-ons.

## Name

Star Sorter for GitHub

## Short description (132 chars max)

Sort your GitHub stars into Lists automatically with editable rules, a reviewable plan and one-click undo.

## Detailed description

Star Sorter turns a long, flat Stars page into organized GitHub Lists.

Scan your stars, review the suggested list for every repository, change anything you disagree
with, and apply the whole plan in one go. Nothing is written to GitHub until you press Apply,
and the last run can be undone.

Highlights:
- Rules for topics, languages, keywords, repository owners and exclusions, evaluated top to bottom.
- A visual rule builder with drag-to-reorder and chip inputs, plus a JSON editor with validation.
- A grouped, searchable preview that stays responsive with thousands of stars.
- Bulk assignment, skip, and “create new list” without leaving the Stars page.
- Creates missing lists, keeps every existing list membership, and paces requests to respect
  GitHub's limits.
- Undo restores the previous list memberships of the last run.
- Manage your lists (create, rename, privacy, delete) from the same panel.
- Light and dark themes that follow GitHub.

Privacy: local only. Your token is stored in your browser and only sent to api.github.com.
You can keep it or have it deleted automatically after each apply run. No analytics, no backend,
no third-party requests.

Requires a classic GitHub personal access token with the `user` scope. Star Sorter is not
affiliated with GitHub.

## Category

Developer tools / Productivity

## Permissions justification

| Permission | Why it is needed |
| --- | --- |
| `storage` | Saves the GitHub token (optionally deleted after each apply run), rules, preferences, the undo log and run progress locally. |
| `https://api.github.com/*` | Reads your starred repositories and lists and applies the list changes you approve. |

No `tabs`, `history`, `scripting` or broad host permissions are requested. The content script
only runs on `https://github.com/*` to show the panel on Stars pages.

## Privacy policy

Use the hosted version of [PRIVACY.md](PRIVACY.md). It states: local-only storage, single
network destination (`api.github.com`), no collection, no analytics, no remote code.

## Data usage disclosure

- Does the item collect or use personal data? **No.**
- Sold to third parties? **No.**
- Used for unrelated purposes? **No.**
- Used to determine creditworthiness? **No.**

## Screenshots and promo assets (not committed)

Capture from a real account with dummy/throwaway stars:

1. Stars page with the floating button.
2. Token step: `Connected as …`.
3. Preview grouped by list with the move counter.
4. Apply progress bar.
5. Result summary with Undo.
6. Rules tab: visual builder.
7. Lists tab.

Store assets live outside this repository (local reference only); upload them directly to the
store dashboards. Suggested sizes: 1280×800 screenshots, 440×280 small tile, 920×680 marquee.

## Submission checklist

- [ ] `pnpm build` and load `build/chrome-mv3-prod` cleanly in Chrome and Edge.
- [ ] No manifest warnings.
- [ ] Privacy policy URL available.
- [ ] Screenshots and store copy uploaded.
- [ ] Test on a throwaway account with at least 50 stars: scan, apply, undo.
- [ ] Version bumped in `package.json` (`version` drives the manifest).
