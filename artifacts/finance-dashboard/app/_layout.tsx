import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FinanceProvider } from "@/context/FinanceContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { secureGet, SecureKeys } from "@/lib/secure-storage";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="card-detail/[id]"
        options={{
          headerShown: false,
          presentation: "card",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="linked-cards"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="payment/bank-select"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="payment/review"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="payment/confirm"
        options={{
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="payment/error"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="onboarding/terms"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="onboarding/kyc"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="report-problem"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </Stack>
    </KeyboardAvoidingView>
  );
}

// TODO: Replace with Replit Auth before going live
function BetaLoginGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login, lastLogoutReason } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(null);

  const bgAnim = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 7000, useNativeDriver: false }),
        Animated.timing(bgAnim, { toValue: 0, duration: 7000, useNativeDriver: false }),
      ])
    ).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowScale, { toValue: 1.14, duration: 2200, useNativeDriver: false }),
          Animated.timing(glowScale, { toValue: 1, duration: 2200, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.9, duration: 2200, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 0.35, duration: 2200, useNativeDriver: false }),
        ]),
      ])
    ).start();
  }, []);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#0D0A1E", "#110930"],
  });

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Login failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={gs.loading}>
        <ActivityIndicator color="#6C9EFF" size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Animated.View style={[gs.container, { backgroundColor: bgColor }]}>
          <ScrollView
            contentContainerStyle={gs.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, width: "100%" }}
          >
            <View style={gs.card}>
              <View style={gs.betaBadge}>
                <Text style={gs.betaBadgeText}>BETA</Text>
              </View>

              <View style={gs.monoWrap}>
                <Animated.View
                  style={[
                    gs.monoGlow,
                    { opacity: glowOpacity, transform: [{ scale: glowScale }] },
                  ]}
                />
                <View style={gs.monoCircle}>
                  <Text style={gs.monoCF}>CF</Text>
                </View>
              </View>

              <Text style={gs.title}>CardFlow</Text>
              <Text style={gs.tagline}>Your finances, beautifully organised</Text>

              {lastLogoutReason === "inactivity" && (
                <View style={gs.timeoutBanner}>
                  <Text style={gs.timeoutBannerText}>
                    Signed out for inactivity. Please sign in to continue.
                  </Text>
                </View>
              )}

              <View style={gs.separator} />

              <View style={gs.fieldGroup}>
                <Text style={gs.label}>Username</Text>
                <View
                  style={[
                    gs.inputWrap,
                    focusedField === "username" && gs.inputWrapFocused,
                  ]}
                >
                  <TextInput
                    style={gs.input}
                    value={username}
                    onChangeText={(v) => { setUsername(v); setError(null); }}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Enter username"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={gs.fieldGroup}>
                <Text style={gs.label}>Password</Text>
                <View
                  style={[
                    gs.inputWrap,
                    focusedField === "password" && gs.inputWrapFocused,
                  ]}
                >
                  <TextInput
                    style={gs.input}
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(null); }}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry
                    placeholder="Enter password"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                </View>
              </View>

              {error && (
                <View style={gs.errorBox}>
                  <Text style={gs.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleLogin}
                disabled={submitting}
                style={({ pressed }) => [gs.btnWrap, pressed && { opacity: 0.85 }, submitting && { opacity: 0.6 }]}
              >
                <LinearGradient
                  colors={["#4F7FFF", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={gs.btn}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={gs.btnText}>Sign in</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  return <>{children}</>;
}

// ─── Biometric unlock gate ───────────────────────────────────────────────────
// When the user has opted into biometric auth, we require a fresh
// Face ID / Touch ID prompt on every cold app open before showing app content.
function BiometricGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isBiometricEnabled, isBiometricAvailable, authenticateWithBiometric, logout } = useAuth();
  const [unlocked, setUnlocked] = React.useState(false);
  const [attempted, setAttempted] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setUnlocked(false);
      setAttempted(false);
      return;
    }
    if (!isBiometricEnabled || !isBiometricAvailable) {
      setUnlocked(true);
      return;
    }
    // Only auto-prompt once per mount
    if (!attempted) {
      setAttempted(true);
      authenticateWithBiometric().then((ok) => {
        if (ok) setUnlocked(true);
      });
    }
  }, [isAuthenticated, isBiometricEnabled, isBiometricAvailable, attempted, authenticateWithBiometric]);

  if (!isAuthenticated) return <>{children}</>;
  if (!isBiometricEnabled || !isBiometricAvailable) return <>{children}</>;
  if (unlocked) return <>{children}</>;

  return (
    <View style={gs.biometricLock}>
      <View style={gs.biometricIconWrap}>
        <Text style={gs.biometricIcon}>🔒</Text>
      </View>
      <Text style={gs.biometricTitle}>Locked</Text>
      <Text style={gs.biometricSub}>Use Face ID or Touch ID to unlock CardBridge.</Text>
      <Pressable
        onPress={() => authenticateWithBiometric().then((ok) => ok && setUnlocked(true))}
        style={({ pressed }) => [gs.biometricBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={gs.biometricBtnText}>Unlock</Text>
      </Pressable>
      <Pressable onPress={() => logout("user")} style={gs.biometricSwitch}>
        <Text style={gs.biometricSwitchText}>Use password instead</Text>
      </Pressable>
    </View>
  );
}

// ─── Onboarding gate ─────────────────────────────────────────────────────────
// First time after sign-in we require: ToS/Privacy acceptance + KYC submission.
// State is persisted in expo-secure-store so we don't re-ask on subsequent opens.
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      setReady(false);
      return;
    }
    (async () => {
      const done = await secureGet(SecureKeys.ONBOARDING_COMPLETE);
      setNeedsOnboarding(done !== "true");
      setReady(true);
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!ready || !isAuthenticated || !needsOnboarding) return;
    const onOnboarding = pathname?.startsWith("/onboarding");
    if (!onOnboarding) {
      router.replace("/onboarding/terms");
    }
  }, [ready, isAuthenticated, needsOnboarding, pathname]);

  return <>{children}</>;
}

// ─── Activity tracker ────────────────────────────────────────────────────────
// Wraps the app and bumps the inactivity timer on every touch.
function ActivityTracker({ children }: { children: React.ReactNode }) {
  const { bumpActivity, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <>{children}</>;
  return (
    <View style={{ flex: 1 }} onTouchStart={bumpActivity}>
      {children}
    </View>
  );
}

const gs = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#0D0A1E",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(28,16,72,0.85)",
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.12)",
    alignItems: "center",
    ...({
      backdropFilter: "blur(20px)",
      boxShadow: "0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,158,255,0.08)",
    } as any),
  },
  betaBadge: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(251,146,60,0.07)",
    borderWidth: 1,
    borderColor: "rgba(251,146,60,0.2)",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 20,
  },
  betaBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "rgba(251,146,60,0.7)",
    letterSpacing: 1.4,
  },
  monoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    width: 76,
    height: 76,
  },
  monoGlow: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#4F7FFF",
    ...({
      boxShadow: "0 0 32px 12px rgba(79,127,255,0.5)",
    } as any),
  },
  monoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1C1048",
    borderWidth: 2,
    borderColor: "rgba(108,158,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    ...({
      boxShadow: "0 4px 20px rgba(79,127,255,0.3)",
    } as any),
  },
  monoCF: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#6C9EFF",
    letterSpacing: 1,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: "center",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(180,170,220,0.6)",
    textAlign: "center",
    lineHeight: 19,
  },
  timeoutBanner: {
    width: "100%",
    backgroundColor: "rgba(245,158,11,0.1)",
    borderColor: "rgba(245,158,11,0.3)",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 14,
  },
  timeoutBannerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#F59E0B",
    textAlign: "center",
    lineHeight: 16,
  },
  biometricLock: {
    flex: 1,
    backgroundColor: "#0D0A1E",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  biometricIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(108,158,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  biometricIcon: { fontSize: 36 },
  biometricTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  biometricSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 28,
  },
  biometricBtn: {
    backgroundColor: "#4F7FFF",
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 12,
  },
  biometricBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  biometricSwitch: { paddingVertical: 10 },
  biometricSwitchText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(108,158,255,0.85)",
  },
  separator: {
    width: 40,
    height: 1,
    backgroundColor: "rgba(108,158,255,0.2)",
    borderRadius: 1,
    marginVertical: 22,
  },
  fieldGroup: {
    width: "100%",
    marginBottom: 14,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 7,
  },
  inputWrap: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(255,255,255,0.04)",
    ...({
      backdropFilter: "blur(8px)",
    } as any),
  },
  inputWrapFocused: {
    borderColor: "rgba(108,158,255,0.55)",
    ...({
      boxShadow: "0 0 0 3px rgba(79,127,255,0.12)",
    } as any),
  },
  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  errorBox: {
    width: "100%",
    backgroundColor: "rgba(255,107,138,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,138,0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#FF6B8A",
    lineHeight: 18,
  },
  btnWrap: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 6,
    ...({
      boxShadow: "0 4px 20px rgba(79,127,255,0.35)",
    } as any),
  },
  btn: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <BetaLoginGate>
                  <BiometricGate>
                    <OnboardingGate>
                      <ActivityTracker>
                        <ThemeProvider>
                          <FinanceProvider>
                            <RootLayoutNav />
                          </FinanceProvider>
                        </ThemeProvider>
                      </ActivityTracker>
                    </OnboardingGate>
                  </BiometricGate>
                </BetaLoginGate>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
