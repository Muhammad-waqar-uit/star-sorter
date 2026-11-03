# Limitations

Known gaps in v1.0, in rough order of importance.

## Functional

- **No native per-repo “Move to list” menu** on GitHub's Stars page (spec F10). Deferred to
  v1.1 because it depends on GitHub's DOM and can break without notice.
- **No score-based classification.** First match wins; a repo has one suggestion unless
  `maxListsPerRepo` is raised.
- **No AI suggestions** for unmatched repos. This remains a future idea in the spec.
- **Only the most recent run can be undone.** Undo history is not stacked.
- **Undo does not restore list metadata.** If a run created a list and you renamed it before
  undoing, the list is only deleted when it is empty.
- **No star editing.** Star Sorter never unstars or edits repositories.

## Performance

- The preview uses fixed-height row windowing. Very long descriptions are truncated by CSS, so
  rows keep a predictable height; there is no expandable row view.
- The scan is sequential per list (one items request per page). For an account with 32 large
  lists this is more requests than strictly necessary; results are cached for the session.
- Progress is polled every 700 ms while a run is active; writes to `chrome.storage.local`
  happen per repo. This is intentional for reconnect support but adds storage churn.

## Platform / runtime

- **Service worker lifetime.** `apply` continues after responding to the panel, relying on the
  worker staying alive while timers and fetches are pending. Chrome may terminate an extension
  worker in extreme cases; the run state is persisted, but the remaining repos would not be
  processed and the UI would show a stale `running` state until the 10-minute stale-run guard
  allows a new run.
- **Firefox runtime is untested.** `pnpm build:firefox` produces an MV3 package (background
  event page), but only Chrome/Edge has been exercised in a browser. Firefox may require an
  extension ID (`browser_specific_settings.gecko.id`) before permanent installation.
- **Windows build prerequisite.** Parcel (used by Plasmo) loads native modules that require
  the Microsoft Visual C++ Redistributable (x64). Without it, `pnpm build` fails with
  `ERR_DLOPEN_FAILED ... .node`. Install the official redistributable and retry. This is a
  tooling dependency, not an extension runtime dependency.
- **Token type.** Lists require a classic token with the `user` scope. Fine-grained tokens may
  not expose the list mutations; the UI reports a scope error if GitHub refuses.

## Product limits imposed by GitHub

- **32 lists per account.** Star Sorter blocks a plan that would exceed this and warns in the
  Lists tab, but it cannot create finer-grained organization on GitHub's behalf.
- **List names are limited to 32 characters** and are matched case insensitively to avoid
  duplicates.
- **GraphQL rate limits.** Reads are cheap; writes are paced and retried, but a very large
  first run may still hit a secondary limit. Failed rows remain listed so they can be retried.
- **GitHub may change the Lists GraphQL schema.** All queries and mutations are isolated in
  `src/lib/github.ts`, so changes stay localized.

## Privacy

- The token is stored unencrypted in `chrome.storage.local`, like every browser extension
  secret. Anyone with access to your browser profile or devtools can read it. Use a token with
  the smallest scope that works (`user`), enable **Delete after each apply run**, and revoke it
  on GitHub when you stop using the extension. Automatic deletion applies only to apply runs;
  scans, list edits and undo do not remove the token.
