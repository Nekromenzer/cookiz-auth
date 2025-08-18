import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthContextType, AuthProviderProps, User } from "./types";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  adapter,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const u = await adapter.getUser();
    setUser(u);
    setLoading(false);
  };

  const login = async (credentials: { email: string; password: string }) => {
    await adapter.login(credentials);
    await fetchUser();
  };

  const logout = async () => {
    await adapter.logout();
    setUser(null);
  };

  const refresh = async () => {
    if (adapter.refresh) {
      await adapter.refresh();
      await fetchUser();
    }
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

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
