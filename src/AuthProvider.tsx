import React, { createContext, useState, useEffect, useContext } from "react";
import { AuthContextType, User } from "./types";
import { apiFetch } from "./api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await apiFetch("/me");
      if (res.ok) setUser(await res.json());
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    await fetchUser();
  };

  const logout = async () => {
    await apiFetch("/logout", { method: "POST" });
    setUser(null);
  };

  const refresh = async () => {
    await apiFetch("/refresh", { method: "POST" });
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
