import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { apiUrl } from "@/constants/api";

// TODO: Replace with Replit Auth before going live
const SESSION_KEY = "cardflow_beta_token";

function readSession(): string | null {
  try {
    if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem(SESSION_KEY);
    }
  } catch { /* ignore */ }
  return null;
}

function writeSession(token: string) {
  try {
    if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, token);
    }
  } catch { /* ignore */ }
}

function clearSession() {
  try {
    if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch { /* ignore */ }
}

export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = readSession();
    if (stored) setToken(stored);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Login failed");
    }
    const data = (await res.json()) as { token: string };
    writeSession(data.token);
    setToken(data.token);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
  }, []);

  const user: AuthUser | null = token
    ? { id: "beta-luispol", email: null, name: "Beta User" }
    : null;

  return (
    <AuthContext.Provider
      value={{ token, user, isLoading, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
