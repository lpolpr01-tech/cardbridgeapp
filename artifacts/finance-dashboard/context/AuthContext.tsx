import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { apiUrl } from "@/constants/api";
import { secureGet, secureSet, secureDelete, SecureKeys } from "@/lib/secure-storage";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_CHECK_INTERVAL_MS = 30 * 1000; // check every 30 seconds

export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
};

export type SignupInput = {
  fullName: string;
  dateOfBirth: string;
  username: string;
  password: string;
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;
  isBiometricAvailable: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: (reason?: "user" | "inactivity") => Promise<void>;
  bumpActivity: () => void;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  lastLogoutReason: "user" | "inactivity" | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [lastLogoutReason, setLastLogoutReason] = useState<"user" | "inactivity" | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Boot: load token + biometric prefs from secure storage ────────────────
  useEffect(() => {
    (async () => {
      const [stored, bioEnabled] = await Promise.all([
        secureGet(SecureKeys.AUTH_TOKEN),
        secureGet(SecureKeys.BIOMETRIC_ENABLED),
      ]);
      if (stored) setToken(stored);
      if (bioEnabled === "true") setIsBiometricEnabled(true);

      // Probe device biometric capability
      if (Platform.OS !== "web") {
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          setIsBiometricAvailable(hasHardware && isEnrolled);
        } catch {
          setIsBiometricAvailable(false);
        }
      }

      setIsLoading(false);
    })();
  }, []);

  // ─── Inactivity timer ──────────────────────────────────────────────────────
  // When the user is logged in, run a background timer that logs them out
  // after INACTIVITY_TIMEOUT_MS of no `bumpActivity()` calls.
  useEffect(() => {
    if (!token) {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }
    lastActivityRef.current = Date.now();
    inactivityTimerRef.current = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= INACTIVITY_TIMEOUT_MS) {
        // Inline call so we don't need logout in the dep array
        void (async () => {
          await secureDelete(SecureKeys.AUTH_TOKEN);
          setToken(null);
          setLastLogoutReason("inactivity");
        })();
      }
    }, ACTIVITY_CHECK_INTERVAL_MS);
    return () => {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    };
  }, [token]);

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // ─── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Login failed");
    }
    const data = (await res.json()) as {
      token: string;
      user?: { username: string; fullName: string; dateOfBirth: string };
    };
    await secureSet(SecureKeys.AUTH_TOKEN, data.token);
    if (data.user) {
      await Promise.all([
        secureSet(SecureKeys.PROFILE_USERNAME, data.user.username),
        secureSet(SecureKeys.PROFILE_FULL_NAME, data.user.fullName),
        secureSet(SecureKeys.PROFILE_DOB, data.user.dateOfBirth),
      ]);
    } else {
      // Beta path — seed Profile screen with sensible defaults
      await Promise.all([
        secureSet(SecureKeys.PROFILE_USERNAME, username),
        secureSet(SecureKeys.PROFILE_FULL_NAME, "Beta User"),
      ]);
    }
    setToken(data.token);
    setLastLogoutReason(null);
    lastActivityRef.current = Date.now();
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const res = await fetch(apiUrl("/api/auth/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Sign up failed");
    }
    const data = (await res.json()) as {
      token: string;
      user: { username: string; fullName: string; dateOfBirth: string };
    };
    await secureSet(SecureKeys.AUTH_TOKEN, data.token);
    await Promise.all([
      secureSet(SecureKeys.PROFILE_USERNAME, data.user.username),
      secureSet(SecureKeys.PROFILE_FULL_NAME, data.user.fullName),
      secureSet(SecureKeys.PROFILE_DOB, data.user.dateOfBirth),
    ]);
    setToken(data.token);
    setLastLogoutReason(null);
    lastActivityRef.current = Date.now();
  }, []);

  const logout = useCallback(async (reason: "user" | "inactivity" = "user") => {
    await secureDelete(SecureKeys.AUTH_TOKEN);
    setToken(null);
    setLastLogoutReason(reason);
  }, []);

  // ─── Biometric ─────────────────────────────────────────────────────────────
  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return true; // web has no biometric — bypass
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock CardBridge",
        cancelLabel: "Use password",
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!isBiometricAvailable) return false;
    const ok = await authenticateWithBiometric();
    if (!ok) return false;
    await secureSet(SecureKeys.BIOMETRIC_ENABLED, "true");
    setIsBiometricEnabled(true);
    return true;
  }, [isBiometricAvailable, authenticateWithBiometric]);

  const disableBiometric = useCallback(async () => {
    await secureDelete(SecureKeys.BIOMETRIC_ENABLED);
    setIsBiometricEnabled(false);
  }, []);

  const user: AuthUser | null = token
    ? { id: "beta-luispol", email: null, name: "Beta User" }
    : null;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: !!token,
        isBiometricEnabled,
        isBiometricAvailable,
        login,
        signup,
        logout,
        bumpActivity,
        enableBiometric,
        disableBiometric,
        authenticateWithBiometric,
        lastLogoutReason,
      }}
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
