// Cross-platform encrypted local storage.
// On native (iOS/Android) → expo-secure-store (Keychain / EncryptedSharedPreferences).
// On web → localStorage (no hardware encryption available, but persists across sessions).
//
// All persistent app state — auth tokens, onboarding flags, biometric prefs —
// goes through this layer so we never write secrets to AsyncStorage or sessionStorage.

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const SecureKeys = {
  AUTH_TOKEN: "cardbridge.auth_token",
  ONBOARDING_COMPLETE: "cardbridge.onboarding_complete",
  TERMS_ACCEPTED_AT: "cardbridge.terms_accepted_at",
  KYC_COMPLETED_AT: "cardbridge.kyc_completed_at",
  BIOMETRIC_ENABLED: "cardbridge.biometric_enabled",
  KYC_DATA: "cardbridge.kyc_data",
} as const;

export type SecureKey = (typeof SecureKeys)[keyof typeof SecureKeys];

export async function secureGet(key: SecureKey): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSet(key: SecureKey, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Storage unavailable — silently no-op rather than crash the app
  }
}

export async function secureDelete(key: SecureKey): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {}
}
