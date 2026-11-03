# Privacy policy

_Last updated: 2026-11-03_

Star Sorter for GitHub is a local-only browser extension. It has no backend, no account system,
no analytics and no third-party requests.

## What is stored

All data stays in your browser's `chrome.storage.local`:

- **GitHub token** — a classic personal access token you create and paste yourself. You can
  choose to keep it until you remove it, or have it deleted automatically after each apply run.
- **Rules and settings** — your classification rules, theme and preview preference.
- **Account** — your GitHub login, used to show connection status.
- **Last scan summary** — time, star count and list count.
- **Undo log and run state** — the previous list memberships needed to undo the last run, and
  the progress of a run.

Star and list contents are kept in memory only and are discarded when the page or worker
restarts.

## What is transmitted

Requests go to exactly one destination: `https://api.github.com/graphql`. They carry your
token and the GraphQL operation needed to read stars/lists or update lists. Nothing is sent to
the developer or any third party.

## What is not collected

No personal information, browsing history, analytics, telemetry, crash reports, advertising
identifiers or usage data. No remote code is loaded.

## Permissions

- `storage` — save the token, rules, settings and undo log locally.
- `https://api.github.com/*` — read stars and lists, and write list changes you apply.

## Control and removal

- Remove the token at any time from the panel or Options.
- Choose **Keep until I remove it** (default) or **Delete after each apply run** in Settings.
  Automatic deletion happens when a run finishes, including cancelled or failed runs, and also
  clears the cached account. You must paste the token again for the next run or an undo.
- If you keep the token, you are responsible for removing it when you are done. Use a token with
  the smallest scope that works (`user`) and revoke it on GitHub if you stop using the extension.
- **Clear all extension data** in Options removes the token, rules, settings and history.
- Uninstalling the extension removes its local storage.

## Contact

Open an issue at <https://github.com/Muhammad-waqar-uit/star-sorter/issues> for privacy
questions.
