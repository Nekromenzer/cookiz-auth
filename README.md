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

- **npm package:** [cookiz-auth](https://www.npmjs.com/package/cookiz-auth)
- **GitHub repo:** [Nekromenzer/cookiz-auth](https://github.com/Nekromenzer/cookiz-auth)
