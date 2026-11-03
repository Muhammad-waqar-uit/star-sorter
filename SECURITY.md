# Security

## Design

- The GitHub token is stored in `chrome.storage.local` and read only by the background service
  worker. It is never returned to the content script, written to logs, or placed in a URL.
- The only network destination is `https://api.github.com/graphql`. There is no backend, no
  analytics and no remote code.
- The extension requests the `storage` permission and the `api.github.com` host permission only.
- Repository text is rendered through React text nodes; `dangerouslySetInnerHTML` is not used.
- Panel styles live in a shadow root and cannot modify GitHub's page styles.

## Residual risk

`chrome.storage.local` is not encrypted. Malware, a shared browser profile, or anyone with
access to your browser's devtools can read the token. Use a classic token with the smallest
scope that works (`user`) and revoke it at <https://github.com/settings/tokens> when you no
longer need it. Step-by-step creation, scope selection and revocation:
[docs/TOKEN_SETUP.md](docs/TOKEN_SETUP.md).

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's private vulnerability
reporting on the repository (Security → Report a vulnerability) or contact the maintainer
directly. Include reproduction steps and the affected version. You can expect an initial
response within a few days.
