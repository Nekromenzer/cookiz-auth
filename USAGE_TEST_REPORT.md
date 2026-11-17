# Library usage verification

Date: 2026-11-18 (Asia/Colombo)

Tested commit: `1ea51eb` (`bug-fix-version-1.0.5`). The package was built and
packed locally, then installed from its tarball into isolated consumer projects.
The published npm package was not tested or updated.

## Outcome

The library passed 19 browser scenarios with Firebase installed, 58 existing
mocked regression tests, and a strict TypeScript consumer check. A separate
cookie-only consumer without Firebase failed to bundle. This packaging failure
means the optional Firebase integration is not fully optional for bundlers such
as esbuild in the current package layout.

## Environment and scope

- Node.js 22.13.0; React and React DOM 18.3.1, with React StrictMode enabled.
- Headful Google Chrome controlled through Playwright 1.65.1.
- esbuild 0.28.2; TypeScript 7.0.2; Firebase SDK 12.15.0.
- A temporary local API implemented synthetic sessions, HTTP-only cookies,
  credentialed CORS, custom endpoints, session expiry/refresh, CSRF validation,
  token rotation, and controllable failures/delayed responses.
- The consumer project applied the documented Firestore/gRPC override.
- No production services, real user accounts, or live Firebase authentication
  were used.

## Browser scenarios

| Scenario | Result |
| --- | --- |
| Packed package mounts in React StrictMode; signed-out protected view | Pass |
| Login using custom API endpoints | Pass |
| Session cookie is HTTP-only and unavailable through `document.cookie` | Pass, within the login scenario |
| Page reload restores the session | Pass |
| Explicit refresh uses the custom endpoint | Pass |
| Expired session automatically refreshes and retries the user request | Pass |
| Failed logout reports HTTP 500 and preserves the local user | Pass |
| Successful logout removes the session cookie and protected content | Pass |
| Failed login rejects without fetching the existing account | Pass |
| Failed explicit refresh reports HTTP 401 | Pass |
| Delayed user response cannot restore the account after logout | Pass |
| Server-validated CSRF headers accompany cookie-auth actions | Pass |
| CSRF callback reads the rotated server token | Pass |
| Invalid CSRF token causes server rejection and a visible client error | Pass |
| Missing configured CSRF token prevents the login request | Pass |
| Remote HTTP endpoint is rejected before credentials are sent | Pass |
| Same-origin relative endpoints work | Pass |
| Default localhost:4000 endpoints work | Pass |
| Public cookie helpers read and delete a simple readable cookie | Pass |
| Firebase mode initializes signed out; signed-out refresh/logout complete | Pass |

The HTTP-only assertion belongs to the custom-login scenario; the harness
recorded 19 scenarios in total. There were zero uncaught browser page errors.
The protected view is a client UI check; server authorization still depends on
the consuming application's backend.

## TypeScript and existing tests

- `npm run build`: passed, with the existing Rollup configuration module-type
  warning.
- `node --test --test-reporter=dot tests/auth-provider.test.cjs`: all 58 passed.
- Strict TypeScript compilation of a consumer importing the packed package:
  passed with React 18 types and bundler module resolution. Both cookie mode
  (including `CsrfConfig`) and Firebase mode (including a real SDK `Auth`
  instance and a custom user mapper) type-checked.

## Confirmed failure: cookie-only bundle without Firebase

In a second isolated project, install the local tarball, React, React DOM, and
esbuild, without Firebase. Import `AuthProvider` and `useAuth`, render cookie
mode, and run:

```sh
./node_modules/.bin/esbuild app.jsx --bundle --format=esm --outfile=bundle.js
```

Result:

```text
ERROR Could not resolve "firebase/auth"
node_modules/cookiz-auth/dist/index.esm.js:99:64
await import('firebase/auth')
```

The shared provider contains statically discoverable Firebase dynamic imports
(for example, `src/AuthProvider.tsx:67`). Bundlers resolve those imports even
when the consumer uses only cookie mode. Declaring Firebase as an optional peer
does not make the shared module independently bundleable.

Recommended fix: isolate Firebase SDK imports behind a separate entry point or
an explicitly supplied adapter so the default cookie entry contains no Firebase
imports. Installing Firebase is a temporary workaround, but adds an unnecessary
dependency for cookie-only consumers. No library source fix was applied during
this verification task.

## Local reproduction artifacts

- Consumer app, API server, browser harness, screenshot, and browser results:
  `/tmp/cookiz-usage-FC5eRw/`.
- Minimal failing cookie-only consumer: `/tmp/cookiz-no-firebase-n0Qeyd/`.
- Demo URL while the temporary server remains running:
  `http://localhost:4173/`.
- To restart the demo, run `node server.cjs` in the consumer directory; it uses
  ports 4173, 4174, and 4000. Run `node run.cjs` there to repeat the browser
  scenarios. Temporary files are not durable repository fixtures.

## Remaining limits

Live Firebase sign-in, signed-in token refresh, a Firebase Auth Emulator,
production CORS/cookie behavior, deployed backends, and React versions beyond
React 18 were not verified. CSRF results prove the library's integration against
the local fixture, not the security of a production backend. Broad use-case
verification is not a complete security audit.
