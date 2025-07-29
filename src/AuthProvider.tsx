import React, { createContext, useState, useEffect, useContext } from "react";
import { AuthContextType, AuthProviderProps, User } from "./types";
import { apiFetch } from "./api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  endpoints = {
    login: "/login",
    logout: "/logout",
    user: "/me",
    refresh: "/refresh",
    baseUrl: "http://localhost:4000",
  },
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await apiFetch(`${endpoints.baseUrl}${endpoints.me}`);
      if (res.ok) setUser(await res.json());
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    await apiFetch(`${endpoints.baseUrl}${endpoints.login}`, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    await fetchUser();
  };

  const logout = async () => {
    await apiFetch(`${endpoints.baseUrl}${endpoints.logout}`, {
      method: "POST",
    });
    setUser(null);
  };

  const refresh = async () => {
    await apiFetch(`${endpoints.baseUrl}${endpoints.refresh}`, {
      method: "POST",
    });
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, []);

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
