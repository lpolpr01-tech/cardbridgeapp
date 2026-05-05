import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveBgStart, effectiveBgEnd } = useTheme();
  const { token } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!current || !next || !confirm) {
      setError("Please fill in every field.");
      return;
    }
    if (next.length < 4) {
      setError("New password must be at least 4 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not update password.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Password updated", "Your password has been changed.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text style={s.headerTitle}>Change Password</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.label}>Current Password</Text>
            <TextInput
              style={s.input}
              value={current}
              onChangeText={(v) => { setCurrent(v); setError(null); }}
              secureTextEntry
              placeholder="Enter current password"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>New Password</Text>
            <TextInput
              style={s.input}
              value={next}
              onChangeText={(v) => { setNext(v); setError(null); }}
              secureTextEntry
              placeholder="At least 4 characters"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Confirm New Password</Text>
            <TextInput
              style={s.input}
              value={confirm}
              onChangeText={(v) => { setConfirm(v); setError(null); }}
              secureTextEntry
              placeholder="Re-enter new password"
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            {error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }, submitting && { opacity: 0.6 }]}
            >
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>Update Password</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  card: {
    backgroundColor: "rgba(28,14,70,0.88)", borderRadius: 18, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)", padding: 18,
  },
  label: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginTop: 12, marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary,
  },
  errorBox: {
    backgroundColor: "rgba(255,107,138,0.1)", borderColor: "rgba(255,107,138,0.25)",
    borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 14,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#FF6B8A" },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primaryDark, borderRadius: 14, paddingVertical: 14, marginTop: 18,
  },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});
