# Releasing

Star Sorter ships through GitHub Releases. The [Release workflow](../.github/workflows/release.yml)
runs on every push to `main` and can also be started manually. A release is only published when
typechecking, the unit tests and both production builds pass.

## What a release does

```text
push to main
   │
   ├─ install → typecheck → test (37 tests)
   ├─ compute the next version from package.json + existing tags
   ├─ pnpm build          → build/chrome-mv3-prod
   ├─ pnpm build:firefox  → build/firefox-mv3-prod
   ├─ zip both builds     → dist/star-sorter-<version>-{chrome,firefox}.zip
   ├─ commit package.json, tag v<version>, push both
   └─ create the GitHub Release with generated notes + SHA-256 checksums
```

Plasmo reads `version` from `package.json`, so the manifest inside each zip always matches the
release tag. The workflow uses the repository `GITHUB_TOKEN`; no personal token or store
credential is stored in the repository.

## Version rules

The version script is [`.github/scripts/next-version.mjs`](../.github/scripts/next-version.mjs).

| Situation | Result |
| --- | --- |
| `package.json` version has no matching tag | Release it as-is. The first release is therefore **v1.0.0**, not v1.0.1. |
| Tag already exists | Bump **patch**: `1.0.0` → `1.0.1`. |
| Push commit message contains `[minor]` | Bump **minor**: `1.0.1` → `1.1.0`. |
| Push commit message contains `[major]` | Bump **major**: `1.1.0` → `2.0.0`. |
| Manual **Release** run | Use the `patch` / `minor` / `major` input (default `patch`). |

If the chosen version tag already exists (for example after a retried run), the script keeps
bumping patch until it finds an unused tag. Release commits are marked `[skip release]` so a
manual push of the bump commit cannot start another release.

## Trigger a release

- **Normal:** merge or push to `main`.
- **Manual:** Actions → **Release** → **Run workflow** → choose the bump → run.

Only one release runs at a time (`concurrency: release-main`). Queued runs start after the
current one finishes and see the tag it just pushed.

## Release assets

| Asset | Purpose |
| --- | --- |
| `star-sorter-<version>-chrome.zip` | Unpacked MV3 build for Chrome, Edge, Brave and other Chromium browsers. |
| `star-sorter-<version>-firefox.zip` | Unsigned MV3 build for Firefox 128+ (temporary install). |
| Source code (zip/tar.gz) | Added automatically by GitHub. |

The release body contains install steps, the change list since the previous tag, and SHA-256
checksums for both zips. The README links to the latest release.

## Repository requirements

The workflow needs to push the version commit and tag back to `main` with the repository token:

1. **Settings → Actions → General → Workflow permissions:** allow **Read and write** permissions
   (the workflow also declares `permissions: contents: write`).
2. If `main` is protected, allow the **github-actions[bot]** to push, or add a ruleset bypass for
   it. Without this, the build succeeds but the tag/release step fails with a permission error.
3. Keep `main` green. Every push publishes; a red build blocks the release instead of shipping it.

No repository secrets are required. `GITHUB_TOKEN` is provided by Actions.

## Local dry run

These are the same commands the workflow runs, minus the tag and release:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm build:firefox

mkdir -p dist
(cd build/chrome-mv3-prod && zip -qr ../../dist/star-sorter-test-chrome.zip .)
(cd build/firefox-mv3-prod && zip -qr ../../dist/star-sorter-test-firefox.zip .)
```

To preview the version calculation without touching the repository, run it in a scratch clone:

```bash
node .github/scripts/next-version.mjs
git diff package.json
```

If a bump is selected, the script rewrites `package.json`; discard it with
`git restore package.json` when you are only testing.

## Verify a published release

1. The **Release** workflow run is green and the release is marked **Latest**.
2. Both zips are attached and their checksums match the release notes.
3. Unzip the Chrome build, load it unpacked, open a Stars page and confirm the version shown in
   `chrome://extensions` equals the tag.
4. Unzip the Firefox build and load `manifest.json` from `about:debugging`.
5. `gh release view v<version>` shows the expected title, assets and notes.

## Failure recovery

| Failure point | What to do |
| --- | --- |
| Install, typecheck, test or build fails | Fix the cause and push again. No tag or version was created. |
| Version commit pushed, tag push fails | Re-run the failed jobs. The version script finds the current untagged version and releases it without another bump. |
| Tag pushed, Release step fails | Re-run the workflow publishes a **new patch** because the tag already exists. To publish the original version instead, create it by hand from that tag:<br>`gh release create v<version> dist/*.zip --title "Star Sorter v<version>" --notes-file release-notes.md` |
| Wrong version published | Delete the release and tag, revert the version commit, then push a corrected change. See rollback below. |
| Branch protection rejected the push | Adjust the ruleset bypass (see [Repository requirements](#repository-requirements)) and re-run. |

## Rollback

```bash
# 1. Remove the published release (keeps the tag unless you delete it too)
gh release delete v1.0.1 --yes

# 2. Remove the tag locally and remotely
git tag -d v1.0.1
git push origin :refs/tags/v1.0.1

# 3. Revert the automated version commit and push the fix
git revert <release-commit-sha>
git push origin main
```

Deleting the release and tag is enough to stop offering the build. The next push will reuse the
same version number if the version commit was also reverted.

## Release checklist

- [ ] `main` is green (CI + Release workflows).
- [ ] Release assets contain both zips and the checksums match.
- [ ] The README's latest-release link resolves to the new release.
- [ ] `docs/PROGRESS.md` is updated when a milestone ships.
- [ ] Store submission (when applicable) uses the same Chrome zip and the privacy text in
      [PRIVACY.md](PRIVACY.md).
