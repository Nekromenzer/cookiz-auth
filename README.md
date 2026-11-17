# cookiz-auth

[![npm version](https://img.shields.io/npm/v/cookiz-auth.svg)](https://www.npmjs.com/package/cookiz-auth)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/Nekromenzer/cookiz-auth)](https://github.com/Nekromenzer/cookiz-auth/issues)
[![GitHub stars](https://img.shields.io/github/stars/Nekromenzer/cookiz-auth)](https://github.com/Nekromenzer/cookiz-auth/stargazers)

A **cookie-based authentication** library for React that uses **HTTP-only cookies** for secure session handling.  
Built to be backend-agnostic, simple to integrate, and secure by default.

---

## ✨ Features

- **Secure HTTP-only cookie authentication** (no localStorage token handling)
- **Customizable endpoints** (`/login`, `/logout`, `/me`, `/refresh`)
- **Optional Firebase Auth support** with the same provider + hook API
- **Auth context + `useAuth()` hook** for user session state
- **TypeScript support out-of-the-box**
- **Framework agnostic backend support** (Node.js, Laravel, Django, Go, etc.)
- **Plug & Play** with minimal setup

---

## 📦 Installation

```bash
npm install cookiz-auth
# or
yarn add cookiz-auth
```

## 🚀 Quick Start

```tsx
import React from "react";
import { AuthProvider } from "cookiz-auth";

const App = () => (
  <AuthProvider>
    <YourAppComponents />
  </AuthProvider>
);
```

## 🛠️ Configuration

```tsx
// default base URL is http://localhost:4000
// you can customize the endpoints as needed
// to set BASE_URL, you can use environment variables or pass it directly
<AuthProvider
  endpoints={{
    login: "/api/auth/login", // Endpoint for user login
    logout: "/api/auth/logout", // Endpoint for user logout
    user: "/api/auth/user", // Endpoint to get the current user
    refresh: "/api/auth/refresh", // Endpoint to refresh the user session
    baseUrl: "http://localhost:4000", // Base URL for your API
  }}
>
  <YourAppComponents />
</AuthProvider>
```

Cookie-auth endpoints must use HTTPS. HTTP is allowed only for `localhost`,
`127.0.0.1`, and `[::1]` development servers. Relative endpoints use the page's
base URL and follow the same rule. Requests reject redirects; configure the final
endpoint URLs directly, including any required trailing slashes.

In cookie mode, `login()`, `logout()`, and `refresh()` reject unsuccessful HTTP
responses and network failures. Handle these errors in your UI before showing
success. Failed login and refresh requests preserve the current local user and
do not fetch `/me`.

## 🧑‍💻 Usage

```tsx
import { useAuth } from "cookiz-auth";

const Dashboard = () => {
  const { user, login, logout, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  return user ? (
    <>
      <h3>Welcome, {user.name}!</h3>
      <button onClick={logout}>Logout</button>
    </>
  ) : (
    <button
      onClick={() => login({ email: "test@example.com", password: "123456" })}
    >
      Login
    </button>
  );
};
```

## 🔥 Firebase Auth

Firebase support is optional. Install Firebase in your app, initialize it there,
then pass the Firebase `Auth` instance to `AuthProvider`.

```bash
npm install firebase
```

### Firebase dependency security

This repository overrides Firestore's transitive `@grpc/grpc-js` dependency to
`1.13.6`, a patched version for
[GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) and
[GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4).

Firebase is an optional peer dependency installed by your app. npm applies
[overrides only from the root project](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides),
so this library's override does not propagate to consumers. If your Firebase
installation still resolves an affected gRPC version, merge this into your
app's root `package.json`, then run `npm install` and `npm audit`:

```json
{
  "overrides": {
    "@firebase/firestore": {
      "@grpc/grpc-js": "1.13.6"
    }
  }
}
```

This override replaces Firestore's declared `~1.9.0` range. Verify any Firestore
features your app uses against your backend before deploying. Cookie-only apps
do not need to install Firebase.

### Firebase setup

```tsx
import React from "react";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { AuthProvider } from "cookiz-auth";

const firebaseApp = initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  appId: "your-app-id",
});

const firebaseAuth = getAuth(firebaseApp);

const App = () => (
  <AuthProvider mode="firebase" firebaseAuth={firebaseAuth}>
    <YourAppComponents />
  </AuthProvider>
);
```

The existing `useAuth()` API stays the same:

```tsx
const { user, login, logout, refresh, loading } = useAuth();

await login({ email: "test@example.com", password: "123456" });
await refresh(); // forces a Firebase ID token refresh
await logout();
```

You can customize the user object exposed by the hook:

```tsx
<AuthProvider
  mode="firebase"
  firebaseAuth={firebaseAuth}
  mapFirebaseUser={(firebaseUser) => ({
    id: firebaseUser.uid,
    name: firebaseUser.displayName,
    email: firebaseUser.email || "",
    avatar: firebaseUser.photoURL,
  })}
>
  <YourAppComponents />
</AuthProvider>
```

## protected Routes

```tsx
import { useAuth } from "cookiz-auth";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading...</p>;
  return user ? children : <Navigate to="/login" />;
};

// Usage
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>;
```

## 🛠️ Backend requirements

- **Session Management**: Your backend should support session management using HTTP-only cookies.
- **CORS**: Ensure your API has the appropriate CORS headers to allow requests from your frontend.
- **Endpoints**: Implement the necessary authentication endpoints (`/login`, `/logout`, `/me`, `/refresh`) as specified in the configuration.
- **CSRF**: Validate server-issued CSRF tokens on all state-changing endpoints,
  including login, logout, and refresh. Check the request Origin against an exact
  allowlist (with a Referer fallback when appropriate), reject unexpected origins,
  and reject simple form content types on JSON-only endpoints. CORS alone does
  not prevent forged requests.

### CSRF token integration

Configure `csrf` in cookie mode to send a server-issued token in a custom header:

```tsx
<AuthProvider
  endpoints={{ baseUrl: "https://api.example.com" }}
  csrf={{
    headerName: "X-CSRF-Token", // Optional; this is the default
    getToken: async () => {
      const res = await fetch("https://api.example.com/csrf", {
        credentials: "include",
        redirect: "error",
      });
      if (!res.ok) throw new Error("Could not obtain CSRF token");
      const { token } = await res.json();
      return token;
    },
  }}
>
  <YourAppComponents />
</AuthProvider>
```

Implement `/csrf` on your backend as a read-only token bootstrap endpoint that
works before login. Bind unpredictable tokens to the session (or use your
framework's signed CSRF mechanism), and validate the configured header before
performing an action. Keep the session cookie HTTP-only. Never use the session
ID or an authentication token as the CSRF token.

`getToken` may return a token synchronously or asynchronously. It runs before
each cookie-auth request, including `/me`, automatic refresh, and retries, so
rotated tokens can be read again. When configured, missing or blank tokens and
token lookup failures block the request. Without `csrf`, no token header is
added; apps must configure this integration or use backend-enforced CSRF
protection. Firebase mode does not use this option.

Allow only trusted frontend origins in credentialed CORS and allow the configured
CSRF header plus `Content-Type`. Use `Secure`, `HttpOnly`, and an appropriate
`SameSite` policy for session cookies. Client headers alone do not provide CSRF
protection: backend validation remains required. See the
[OWASP CSRF prevention guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

Your backend must set HTTP-only cookies:

```javascript
// Example in Express.js
app.post("/login", (req, res) => {
  // Authenticate user...
  res.cookie("session", "your-session-id", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: "Strict", // Adjust as needed
  });
  res.json({ success: true });
});
```

// cors

```javascript
app.use(
  cors({
    origin: "http://localhost:3000", // Your frontend URL
    credentials: true, // Allow cookies to be sent
  })
);
```

// development and contribution

## 🛠️ Development and Contribution

To contribute to `cookiz-auth`, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Nekromenzer/cookiz-auth.git
   ```
2. **Install dependencies**:
   ```bash
   cd cookiz-auth
   npm install
   ```
3. **Make your changes** and test them locally.

4. **Run the development server**:
   ```bash
   npm run dev
   ```
5. **Build the project**:
   ```bash
   npm run build
   ```
6. ** Run locally in another project**:
   ```bash
   npm link
   ```
   Then in your project:
   ```bash
   npm link cookiz-auth
   ```
7. **Fork the repository** on GitHub and create a new branch for your feature or bug fix.
8. **Submit a pull request** with a clear description of your changes.

## Links

- **Release notes:** [Changelog](CHANGELOG.md)
- **npm package:** [cookiz-auth](https://www.npmjs.com/package/cookiz-auth)
- **GitHub repo:** [Nekromenzer/cookiz-auth](https://github.com/Nekromenzer/cookiz-auth)
