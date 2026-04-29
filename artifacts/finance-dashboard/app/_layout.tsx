import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
      <View style={gateS.loading}>
        <ActivityIndicator color="#6C9EFF" size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={gateS.container}>
        <View style={gateS.card}>
          <View style={gateS.betaBadge}>
            <Text style={gateS.betaBadgeText}>BETA MODE</Text>
          </View>

          <Text style={gateS.logo}>CardFlow</Text>
          <Text style={gateS.tagline}>Your finances, beautifully organised</Text>

          <View style={gateS.divider} />

          <View style={gateS.fieldGroup}>
            <Text style={gateS.label}>Username</Text>
            <TextInput
              style={gateS.input}
              value={username}
              onChangeText={(v) => { setUsername(v); setError(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Username"
              placeholderTextColor="rgba(255,255,255,0.3)"
              returnKeyType="next"
            />
          </View>

          <View style={gateS.fieldGroup}>
            <Text style={gateS.label}>Password</Text>
            <TextInput
              style={gateS.input}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </View>

          {error && (
            <View style={gateS.errorBox}>
              <Text style={gateS.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={submitting}
            style={({ pressed }) => [
              gateS.btn,
              pressed && { opacity: 0.85 },
              submitting && { opacity: 0.6 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={gateS.btnText}>Sign in</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const gateS = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#0D0A1E",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#0D0A1E",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#1C1048",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.15)",
  },
  betaBadge: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(251,146,60,0.15)",
    borderWidth: 1,
    borderColor: "rgba(251,146,60,0.35)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 16,
  },
  betaBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#FB923C",
    letterSpacing: 1.2,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 18,
  },
  divider: {
    width: 36,
    height: 2,
    backgroundColor: "rgba(108,158,255,0.25)",
    borderRadius: 1,
    marginVertical: 22,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  errorBox: {
    backgroundColor: "rgba(255,107,138,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,138,0.3)",
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
  btn: {
    backgroundColor: "#4F7FFF",
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
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
