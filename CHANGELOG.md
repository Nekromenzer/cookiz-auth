# Changelog

## Unreleased

### Authentication fixes

- Reject unsuccessful cookie logout responses and preserve the local user when
  the server does not confirm logout.
- Discard stale user responses after logout, including delayed JSON parsing and
  pending login or refresh follow-up requests. Discard pending user responses
  when the provider effect is cleaned up.
- Use the provider's configured API base URL and refresh endpoint for automatic
  session recovery. Retry the original request at most once; do not automatically
  refresh a request to the refresh endpoint itself.
- Reject unsuccessful login and explicit refresh responses before fetching the
  current user, so a failed login cannot resolve successfully through an existing
  session.

### Security improvements

- Require HTTPS for remote cookie-auth endpoints. Permit HTTP only for
  `localhost`, `127.0.0.1`, and `[::1]` development servers. Validate both the
  request URL and refresh URL before sending a request.
- Reject redirects on initial requests, automatic refresh, and retries to prevent
  transport downgrades.
- Add optional `csrf` configuration with `getToken` and `headerName` (default:
  `X-CSRF-Token`). Read the token before every cookie-auth request, including
  automatic refresh and retries. Reject missing or blank tokens and propagate
  token lookup failures when configured.
- Send JSON headers on automatic refresh and preserve caller headers when adding
  CSRF headers, supporting all `HeadersInit` formats.
- Override Firestore's transitive `@grpc/grpc-js` dependency from `1.9.16` to
  `1.13.6` in this repository and update the lockfile. This addresses
  [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) and
  [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4).

### Upgrade notes

- Handle rejected promises from cookie-mode `login()`, `logout()`, and
  `refresh()`. Failed calls preserve the current local user.
- Configure final endpoint URLs directly, including required trailing slashes;
  remote HTTP endpoints and redirects now fail.
- CSRF token integration is opt-in. The backend must issue and validate tokens,
  enforce trusted request origins and credentialed CORS, and set appropriate
  session-cookie attributes. The client cannot enforce these backend checks.
- npm overrides apply only in the root project. Applications that install the
  optional Firebase peer must apply their own override if they resolve an
  affected gRPC version; see the [Firebase security setup](README.md#firebase-dependency-security).
  This override replaces Firestore's declared `~1.9.0` range, so applications using
  Firestore should verify their own operations before deploying.

### Verification

- Add 58 mocked regression tests covering auth failures, logout races, refresh
  routing, HTTPS enforcement, redirects, and CSRF token handling. Run them with
  `node --test tests/auth-provider.test.cjs`.
- Verified a clean install, zero reported npm audit vulnerabilities, the library
  build, and offline Firebase Auth/Firestore initialization with patched gRPC.
- Live backend authentication, CSRF rejection, and Firestore operations have not
  been verified. This entry describes pending changes; no release is published.
