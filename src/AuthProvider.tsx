import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import { AuthContextType, AuthProviderProps, FirebaseUserLike, User } from "./types";
import { apiFetch } from "./api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultEndpoints = {
  login: "/login",
  logout: "/logout",
  user: "/me",
  refresh: "/refresh",
  baseUrl: "http://localhost:4000",
};

const defaultFirebaseUserMapper: NonNullable<AuthProviderProps["mapFirebaseUser"]> = (firebaseUser) => ({
  id: firebaseUser.uid,
  name: firebaseUser.displayName,
  email: firebaseUser.email || "",
  emailVerified: firebaseUser.emailVerified,
  phoneNumber: firebaseUser.phoneNumber,
  photoURL: firebaseUser.photoURL,
  providerId: firebaseUser.providerId,
});

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  mode = "cookie",
  endpoints: endpointOverrides,
  firebaseAuth,
  mapFirebaseUser = defaultFirebaseUserMapper,
}) => {
  const endpoints = { ...defaultEndpoints, ...endpointOverrides };
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);
  const authFetch = (url: string, options: RequestInit = {}) =>
    apiFetch(url, options, `${endpoints.baseUrl}${endpoints.refresh}`);

  if (mode === "firebase" && !firebaseAuth) {
    throw new Error("firebaseAuth is required when AuthProvider mode is 'firebase'");
  }

  const fetchUser = async () => {
    const version = sessionVersion.current;
    if (mode === "firebase") {
      const currentUser = firebaseAuth?.currentUser;
      setUser(currentUser ? mapFirebaseUser(currentUser) : null);
      setLoading(false);
      return;
    }

    try {
      const userEndpoint = endpoints.user || endpoints.me || "/me";
      const res = await authFetch(`${endpoints.baseUrl}${userEndpoint}`);
      const nextUser = res.ok ? await res.json() : null;
      if (version === sessionVersion.current) setUser(nextUser);
    } catch {
      if (version === sessionVersion.current) setUser(null);
    } finally {
      if (version === sessionVersion.current) setLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    if (mode === "firebase") {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const credential = await signInWithEmailAndPassword(
        firebaseAuth as any,
        credentials.email,
        credentials.password
      );
      setUser(mapFirebaseUser(credential.user));
      return;
    }

    const version = sessionVersion.current;
    const res = await authFetch(`${endpoints.baseUrl}${endpoints.login}`, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      throw new Error(`Login failed (HTTP ${res.status})`);
    }
    if (version === sessionVersion.current) await fetchUser();
  };

  const logout = async () => {
    if (mode === "firebase") {
      const { signOut } = await import("firebase/auth");
      await signOut(firebaseAuth as any);
      setUser(null);
      return;
    }

    // Invalidate requests started before logout, including pending JSON parsing.
    sessionVersion.current += 1;
    try {
      const res = await authFetch(`${endpoints.baseUrl}${endpoints.logout}`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Logout failed (HTTP ${res.status})`);
      }
      // Also invalidate requests started while logout was in progress.
      sessionVersion.current += 1;
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (mode === "firebase") {
      const { getIdToken } = await import("firebase/auth");
      const currentUser = firebaseAuth?.currentUser;
      if (currentUser) {
        await getIdToken(currentUser as any, true);
        setUser(mapFirebaseUser(currentUser));
      } else {
        setUser(null);
      }
      return;
    }

    const version = sessionVersion.current;
    const res = await authFetch(`${endpoints.baseUrl}${endpoints.refresh}`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Refresh failed (HTTP ${res.status})`);
    }
    if (version === sessionVersion.current) await fetchUser();
  };

  useEffect(() => {
    if (mode === "firebase") {
      let active = true;
      let unsubscribe: (() => void) | undefined;

      void import("firebase/auth").then(({ onAuthStateChanged }) => {
        if (!active) return;

        unsubscribe = onAuthStateChanged(firebaseAuth as any, (firebaseUser: FirebaseUserLike | null) => {
          setUser(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
          setLoading(false);
        });
      });

      return () => {
        active = false;
        unsubscribe?.();
      };
    }

    fetchUser();
    return () => {
      sessionVersion.current += 1;
    };
  }, [mode, firebaseAuth, mapFirebaseUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be inside AuthProvider");
  return ctx;
};
