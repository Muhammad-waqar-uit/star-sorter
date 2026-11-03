# Create a classic GitHub token for Star Sorter

Star Sorter reads your stars and writes GitHub Lists through the GitHub GraphQL API. That API
requires a **classic personal access token (PAT)** with the **`user`** scope. Fine-grained tokens
can read some account data, but they cannot reliably create or update Lists, so Star Sorter uses
classic tokens only.

> A token is a password for your GitHub account. Never paste it into an issue, chat, screenshot or
> commit. Star Sorter keeps it in this browser's `chrome.storage.local` and sends it only to
> `api.github.com`.

## Before you start

- Sign in to the GitHub account whose stars you want to sort.
- You do not need repository admin access, a paid plan or an OAuth app.
- A token can be used on more than one browser, but each browser needs it pasted separately.

## Create the token

1. Open GitHub's **classic token** form:

   **[Create a classic token for Star Sorter →](https://github.com/settings/tokens/new?scopes=user&description=Star%20Sorter%20for%20GitHub)**

   The link pre-fills the description and the `user` scope. If you prefer to navigate manually:
   click your avatar → **Settings** → **Developer settings** → **Personal access tokens** →
   **Tokens (classic)** → **Generate new token** → **Generate new token (classic)**.

2. Set **Note** to:

   ```text
   Star Sorter for GitHub
   ```

   Use a name you will recognize later. If you use Star Sorter on several machines, add the
   machine name, for example `Star Sorter - Desktop`.

3. Set **Expiration** to **30 days**, **60 days** or **90 days**. Use a calendar reminder to
   replace it. Avoid **No expiration** unless you have a specific reason; a shorter-lived token is
   safer if it leaks.

4. Under **Select scopes**, tick **only** this scope:

   | Scope | Tick it? | What it allows |
   | --- | --- | --- |
   | `user` | **Yes** | Read and write your profile data, including GitHub Lists, followers and gists. This is the scope Star Sorter needs. |
   | `read:user` | No | Read-only profile access. It cannot create or update Lists, so Star Sorter will report a missing-scope error. |
   | `repo`, `public_repo`, `workflow` | No | Repository and Actions access. Star Sorter never needs it. |
   | `admin:*`, `delete_repo`, `write:org` | No | Account or organization administration. Do not grant these. |
   | `gist`, `notifications`, `read:packages` | No | Unrelated to stars and Lists. Leave them unchecked. |

   The `user` scope is broader than "lists only" because GitHub does not offer a separate
   `lists` scope. Star Sorter uses it only for the profile login, star scan and List mutations.

5. Click **Generate token**.

6. Copy the token that starts with `ghp_`. GitHub shows it **once**; if you lose it, generate a
   new token instead of trying to recover the old one.

7. Return to Star Sorter — the Stars-page panel or **Options** — paste the token and press
   **Save token**. The panel should show **Connected as _your-login_**.

If you used the pre-filled link, the scope should already be correct. Double-check it before
generating the token: the link cannot protect you from accidentally ticking extra scopes.

## Choose what Star Sorter does with the token

Star Sorter has two retention options, available in the panel's **Settings** tab and on the
**Options** page under **Token storage**:

| Option | What it does | Choose it when |
| --- | --- | --- |
| **Keep until I remove it** (default) | The token and cached account stay in `chrome.storage.local` across scans, applies, and undo. You remove them with **Remove token** or **Clear all extension data**. | You sort stars regularly and accept responsibility for the stored token. |
| **Delete after each apply run** | When an apply run finishes — completed, cancelled or failed — Star Sorter deletes the token and cached account. The next apply or undo needs the token pasted again. Scans, list edits and undo do not delete it. | You want the token gone automatically after each sorting task. |

The deletion happens in the background worker before the run is marked finished, so the UI cannot
show a stale "connected" session after the token is removed.

## If something goes wrong

| Message or symptom | Fix |
| --- | --- |
| `GitHub rejected the token` / `Bad credentials` | The token is expired, revoked, copied incorrectly, or not a token for this account. Create a new classic token and paste it again. |
| `The token is missing a required scope` | Edit the token and tick `user`, or create a new one. `read:user` is not enough. |
| `The token cannot change lists` | You probably used a fine-grained token, or a classic token without `user`. Create a classic token with `user`. |
| Connected, but lists do not update | Confirm the token still exists at **Settings → Developer settings → Personal access tokens → Tokens (classic)**, then rescan. |
| Rate limit | Wait for GitHub's reset time, then retry. Star Sorter already paces writes and retries transient failures. |
| Token field is empty after saving | This is intentional. The token goes straight to the background worker and is never read back into the form. |

## Revoke or rotate a token

1. Open **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. Find the token named `Star Sorter for GitHub` and choose **Delete** (or **Revoke**).
3. In Star Sorter, use **Replace token** to paste the new value, or **Remove token** to disconnect.

Revoking on GitHub does not erase the copy already stored in the extension. Remove it in Star
Sorter as well if the token may have been exposed.

## Why not OAuth or a fine-grained token?

- Star Sorter is a local browser extension with no backend; OAuth would require a server to keep a
  client secret.
- GitHub's Lists mutations are exposed through the GraphQL API and are reliably available to
  classic tokens with `user`. Fine-grained token permissions do not map cleanly to Lists, so the
  extension asks for a classic token rather than failing halfway through a run.

For the broader privacy model, see [Privacy](PRIVACY.md) and [Security](../SECURITY.md).
