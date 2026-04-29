import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
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

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
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
    </Stack>
  );
}

// TODO: Replace with Replit Auth before going live
function BetaLoginGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();
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
          Animated.timing(glowScale, { toValue: 1.14, duration: 2200, useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 1, duration: 2200, useNativeDriver: true }),
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
      <Animated.View style={[gs.container, { backgroundColor: bgColor }]}>
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
      </Animated.View>
    );
  }

  return <>{children}</>;
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
                  <ThemeProvider>
                    <FinanceProvider>
                      <RootLayoutNav />
                    </FinanceProvider>
                  </ThemeProvider>
                </BetaLoginGate>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
