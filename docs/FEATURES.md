# Features

Status legend: **Shipped** · **Partial** · **Planned**

## F1. Stars page panel — Shipped

- Floating **Sort stars** button appears only on `?tab=stars` and `/stars` pages.
- Detects Turbo navigation (`turbo:load`, `turbo:render`, `popstate`, plus a URL check) and
  shows/hides itself without a reload.
- Panel opens bottom-right, can be closed, and keeps its state while you stay on the page.
- Follows GitHub light/dark theme (`data-color-mode`, `data-color-scheme`, OS preference) and
  can be forced in Settings.
- Rendered in a shadow root through Plasmo's `getStyle`, so GitHub's styles are unaffected.

## F2. Token management — Shipped

- Password field for a **classic** token with the `user` scope.
- Validated with `viewer { login }` before saving; the panel shows the resolved username.
- Stored in `chrome.storage.local`, read only by the background worker.
- Replace and remove token actions, with a direct link to the pre-scoped token form.
- Errors are mapped to readable messages: invalid/expired token, missing scope, rate limit,
  network.
- Invalid or under-scoped tokens surface a **Fix token** action that opens the token form.

## F3. Full scan — Shipped

- Reads every starred repo: id, `nameWithOwner`, description, primary language, up to 10
  topics, star count, last update and archived flag.
- Reads every list (id, name, description, privacy) and every repo inside it.
- 100 items per GraphQL page; handles collections well beyond 5,000 stars.
- A live counter shows fetched stars and “Reading lists 3/12…” while the scan runs.
- Results are cached in memory for the session; **Rescan** refreshes them.

## F4. Rules engine — Shipped

- Ordered list rules with `topics`, `languages`, `keywords`, `owners` and `exclude`.
- Topics and languages match exactly (case insensitive); keywords match substrings of
  `name + description + topics`; `exclude` vetoes a rule.
- First `maxListsPerRepo` matches win. No match → **Unsorted**, skipped by default.
- Twelve bundled starter rules: Web3, Claude & prompting, AI agents, DevOps & cloud,
  architecture, interview/algorithms, frontend, backend/databases, Rust, Go, dev tools, SEO.
- Rule sets are validated before saving: required names, ≤32 characters, unique names,
  ≤32 lists, at least one signal per rule, string arrays only.

## F5. Rules editor — Shipped

- Visual builder: add, rename, drag-reorder (with accessible move up/down buttons), delete,
  chip inputs for topics, languages, keywords, owners and excludes, live “N stars” counts, and
  a 32-list warning.
- JSON editor with schema validation, inline error messages, import/export as
  `star-sorter-rules.json`, and reset to defaults.
- Both modes edit one validated draft; invalid JSON blocks switching back to Visual with a
  readable error.
- Default privacy for new lists (`private`) and `maxListsPerRepo` are editable.

## F6. Preview and manual override — Shipped

- Table of every repo that will be considered: link, description, topics, language, target
  list and a per-row dropdown.
- Dropdown contains existing lists, rule lists, **Skip** and **+ New list…**.
- Filters: All, To move, Suggested, Unsorted, Already filed; search by name/description/
  language.
- Optional grouping by suggested list, with counts and collapse.
- Fixed-height row windowing renders only the visible slice, so 5,000-row plans stay
  responsive; switching filters resets the scroll position.
- Bulk select + assign one list or skip all.
- Repos already in a list are hidden by default; a checkbox includes them.
- Footer always shows how many moves will happen.

## F7. Apply — Shipped

- Creates every missing list, matching existing names case insensitively.
- Merges the new list with current memberships before calling `updateUserListsForItem`, so a
  repo is never removed from lists it already belonged to.
- Sequential writes with a 250 ms delay; retries transient errors (5xx, secondary limits)
  with exponential backoff up to four attempts.
- Progress bar with current repo and counts, plus **Cancel** (stops after the in-flight call).
- Failures are listed per repo and included in the final summary, with a **Retry failed** action for the rows that did not land.
- Blocks before writing if the plan would exceed 32 lists.

## F8. Undo — Shipped

- Records each repo's previous list ids before the first mutation.
- **Undo last run** restores those memberships and deletes lists created by that run when
  they are empty.
- Only the most recent run is kept.

## F9. List management — Shipped

- Lists tab with repo counts and privacy badges.
- Create, rename, toggle private/public and delete (with confirmation).
- Warns when approaching GitHub's 32-list limit.

## F10. Native per-repo “Move to list” menu — Planned (v1.1)

Deferred on purpose: injecting into GitHub's repository DOM is fragile and not needed for
the core flow. The floating panel requires no DOM anchors.

## F11. Popup — Shipped

Token/connection status, last scan counts and time, undo availability, and quick links to
your Stars page and Options.

## F12. Options page — Shipped

Token management, full rules editor, theme, include-sorted default, privacy statement and a
danger zone that clears all extension data.

## F13. Accessibility and themes — Shipped

- Keyboard-focusable controls with visible focus rings.
- ARIA labels on icon buttons, checkboxes, list selectors and the progress bar.
- Dialog/region labelling on the panel, `aria-current` tabs, `aria-expanded` groups.
- Light and dark themes derived from GitHub, with a manual override.

## Non-functional requirements

| ID | Requirement | Status |
| --- | --- | --- |
| NFR1 | Scan of 500 stars under 15 s on a normal connection | Not benchmarked here; 5 pages + one request per list. |
| NFR2 | Responsive preview with 5,000 rows | Yes: filtering, grouping and memoized row windowing (unit tested at 5,000 rows). |
| NFR3 | No data leaves the browser except `api.github.com` | Yes — single endpoint, no analytics. |
| NFR4 | Token never logged, never in page context, never in URLs | Yes. |
| NFR5 | UI isolated in shadow DOM | Yes. |
| NFR6 | Survives GitHub UI changes | Yes for the core flow: only the URL check and a floating button are used. |
| NFR7 | Human-readable errors | Yes, mapped by error code. |
| NFR8 | Keyboard navigable with ARIA labels | Yes. |
| NFR9 | Chrome and Edge (MV3) | Yes; an optional Firefox MV3 build is available but not runtime-tested. |
