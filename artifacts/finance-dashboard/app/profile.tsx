import React, { useCallback, useEffect, useState } from "react";
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
import { secureGet, secureSet, SecureKeys } from "@/lib/secure-storage";
import { useTheme } from "@/context/ThemeContext";

type KycStatus = "not_started" | "pending" | "verified";

const KYC_LABELS: Record<KycStatus, string> = {
  not_started: "Not Started",
  pending: "Pending",
  verified: "Verified",
};

const KYC_COLORS: Record<KycStatus, { bg: string; border: string; text: string }> = {
  not_started: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.15)", text: Colors.textSecondary },
  pending: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", text: "#F59E0B" },
  verified: { bg: "rgba(74,222,170,0.12)", border: "rgba(74,222,170,0.35)", text: Colors.positive },
};

function readKycStatus(value: string | null): KycStatus {
  if (value === "pending" || value === "verified") return value;
  return "not_started";
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveBgStart, effectiveBgEnd } = useTheme();

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [username, setUsername] = useState("");
  const [kycStatus, setKycStatus] = useState<KycStatus>("not_started");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const [name, dob, uname, kyc] = await Promise.all([
        secureGet(SecureKeys.PROFILE_FULL_NAME),
        secureGet(SecureKeys.PROFILE_DOB),
        secureGet(SecureKeys.PROFILE_USERNAME),
        secureGet(SecureKeys.KYC_STATUS),
      ]);
      setFullName(name ?? "");
      setDateOfBirth(dob ?? "");
      setUsername(uname ?? "luispol");
      setKycStatus(readKycStatus(kyc));
      setLoading(false);
    })();
  }, []);

  const handleSave = useCallback(async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Full name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        secureSet(SecureKeys.PROFILE_FULL_NAME, fullName.trim()),
        secureSet(SecureKeys.PROFILE_DOB, dateOfBirth.trim()),
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [fullName, dateOfBirth]);

  const kycColors = KYC_COLORS[kycStatus];

  if (loading) {
    return (
      <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
        <View style={s.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            <Text style={s.label}>Full Name</Text>
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={(v) => { setFullName(v); setDirty(true); }}
              placeholder="Jane Doe"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={s.label}>Date of Birth</Text>
            <TextInput
              style={s.input}
              value={dateOfBirth}
              onChangeText={(v) => { setDateOfBirth(v); setDirty(true); }}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={s.label}>Username</Text>
            <View style={[s.input, s.inputDisabled]}>
              <Text style={s.disabledText}>{username}</Text>
            </View>
            <Text style={s.helperText}>Usernames can't be changed.</Text>

            <Pressable
              onPress={handleSave}
              disabled={saving || !dirty}
              style={({ pressed }) => [
                s.saveBtn,
                pressed && { opacity: 0.85 },
                (!dirty || saving) && { opacity: 0.5 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={s.saveBtnText}>Save Changes</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={s.kycCard}>
            <View style={s.kycHeader}>
              <View style={s.kycIcon}>
                <Feather name="shield" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.kycTitle}>Identity Verification</Text>
                <Text style={s.kycSub}>Required before processing real payments</Text>
              </View>
              <View
                style={[s.kycBadge, { backgroundColor: kycColors.bg, borderColor: kycColors.border }]}
              >
                <Text style={[s.kycBadgeText, { color: kycColors.text }]}>{KYC_LABELS[kycStatus]}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push("/kyc-options"); }}
              style={({ pressed }) => [s.verifyBtn, pressed && { opacity: 0.85 }]}
            >
              <Feather name="shield" size={15} color="#fff" />
              <Text style={s.verifyBtnText}>
                {kycStatus === "verified" ? "Manage Verification" : "Verify My Identity"}
              </Text>
              <Feather name="arrow-right" size={15} color="#fff" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },
  card: {
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    padding: 18,
    gap: 6,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 46,
    justifyContent: "center",
  },
  inputDisabled: { backgroundColor: "rgba(255,255,255,0.03)" },
  disabledText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  helperText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: -2,
  },
  saveBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 18,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  kycCard: {
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    padding: 18,
    gap: 16,
  },
  kycHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  kycIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(108,158,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  kycTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  kycSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  kycBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  kycBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5 },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  verifyBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
});
