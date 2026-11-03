# Testing

## Automated

```bash
pnpm typecheck   # strict TypeScript, no emit
pnpm test        # Vitest, single run
pnpm build       # Plasmo production build
```

Current status: **30 tests in 3 files pass**, typecheck passes, production build succeeds.

### What is covered

| File | Coverage |
| --- | --- |
| `src/lib/rules.test.ts` | Topic/language/keyword/owner matching, exclusions, first-match ordering, `maxListsPerRepo`, unsorted repos, per-list counts, validation (duplicates, 32-char names, 32-list cap, missing signals, invalid JSON), whitespace normalization |
| `src/lib/plan.test.ts` | Suggested plan, override isolation, move/skip/unchanged summary, apply-item filtering, unsorted grouping, membership merge, undo-log snapshotting |
| `src/lib/github.test.ts` | 401 → auth error without retry, 5xx retry then success, GraphQL scope error mapping, plain GraphQL errors, star pagination cursors, list-item pagination, list fetch with counts |

The GitHub client tests stub `githubDeps.fetch` and `githubDeps.sleep`, so they run offline and
instantly. No live GitHub credentials are used by the test suite.

## Manual end-to-end checklist

Use a throwaway GitHub account with ~50 stars before running on a large collection.

### Setup

1. `pnpm dev`, load `build/chrome-mv3-dev` unpacked.
2. Open a Stars page: the **Sort stars** button appears. Open a non-stars profile tab: it does
   not.
3. Navigate between profile tabs (Turbo): the button appears/disappears without a reload.

### Token

- [ ] Paste a token without the `user` scope → clear scope error.
- [ ] Paste a revoked/invalid token → clear auth error.
- [ ] Paste a valid classic token → `Connected as <login>`.
- [ ] Remove the token → panel returns to the token form; popup shows not connected.
- [ ] Replace the token → new login is shown.

### Scan

- [ ] First scan lists every star and every existing list; counts match GitHub.
- [ ] Rescan reflects stars added in another tab.
- [ ] Empty account (0 stars) → friendly empty state, no crash.

### Preview

- [ ] Suggestions look sane; unsorted repos form their own group at the top.
- [ ] Change a row to an existing list, to a new list, and to Skip → footer move count updates.
- [ ] Select several rows → bulk set/skip works.
- [ ] Filters and search return the expected rows.
- [ ] “Include repos already in a list” reveals filed repos.
- [ ] Edit a rule and save → suggestions and counts update without a rescan.
- [ ] Import a rules file, export it, reset to defaults.

### Apply

- [ ] Apply creates missing lists and preserves existing memberships (check a repo that was
      already in two lists).
- [ ] Progress bar advances, current repo name updates.
- [ ] Cancel mid-run stops after the current call and reports what changed.
- [ ] Close the panel during a run, reopen it → progress reconnects.
- [ ] Force a failure (e.g. revoke the token mid-run) → failure is listed per repo, the rest
      continue or stop cleanly; **Retry failed** re-runs only those rows.
- [ ] Reload the Stars page → lists and memberships match the summary.

### Undo

- [ ] Undo restores previous memberships for every repo in the last run.
- [ ] Lists created by the run are deleted when they end up empty.
- [ ] Undo is disabled when no log exists.

### Lists

- [ ] Create, rename, toggle privacy and delete a list; counts update.
- [ ] Creating a 33rd list is blocked with a clear message.

### Themes and accessibility

- [ ] GitHub light and dark themes both render legibly.
- [ ] Manual theme override in Settings applies immediately.
- [ ] Tab through the panel: focus is visible and every control is reachable.
- [ ] Screen reader announces the dialog, tabs and progress bar.

### Failure modes

- [ ] Offline: scan/apply shows a network message and does not corrupt state.
- [ ] Rate limit: message includes the retry hint; the run does not loop forever.
- [ ] Worker restart (reload the extension) mid-run: the stale-run guard allows a new run after
      the timeout.

## Reporting

When filing a bug, include the error message, the panel's summary counts, and whether the
token has the `user` scope. Never paste the token itself.
