# Contributing

Thanks for helping improve Star Sorter.

## Setup

```bash
pnpm install
pnpm dev
```

Load `build/chrome-mv3-dev` as an unpacked extension in `chrome://extensions` (Developer mode).

> On Windows, Plasmo's bundler needs the Microsoft Visual C++ Redistributable (x64). Install it
> once if `pnpm build` reports `ERR_DLOPEN_FAILED`.

## Before opening a pull request

```bash
pnpm typecheck
pnpm test
pnpm build
```

All three must pass. If you change rules or planning behaviour, add or update a Vitest case in
`src/lib/*.test.ts`.

## Guidelines

- Keep browser APIs out of `src/lib` where possible — pure logic is easier to test.
- All GitHub traffic belongs in `src/lib/github.ts` and is called from the background worker.
  Never send the token to the content script or a third party.
- Pass complete membership sets to `updateUserListsForItem`; use `desiredListIds()` so existing
  lists are preserved.
- Treat repository descriptions and list names as untrusted text: render as React text nodes,
  never `dangerouslySetInnerHTML`.
- Match the existing formatting: 2 spaces, no semicolons, double quotes.
- Keep commits focused and use conventional prefixes (`feat:`, `fix:`, `docs:`, `perf:`,
  `test:`, `chore:`).

## Reporting bugs

Use the GitHub issue tracker and include:

- what you expected vs. what happened,
- the exact error text shown in the panel,
- whether your token is classic with the `user` scope,
- approximate star and list counts.

Never paste your token, even a revoked one.
