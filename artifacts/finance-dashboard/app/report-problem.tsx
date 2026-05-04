import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";

type Category = "payment" | "account" | "security" | "other";
const CATEGORIES: { id: Category; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "payment", label: "Payment Issue", icon: "credit-card" },
  { id: "account", label: "Account / Login", icon: "user" },
  { id: "security", label: "Security Concern", icon: "shield" },
  { id: "other", label: "Other", icon: "help-circle" },
];

export default function ReportProblemScreen() {
  const insets = useSafeAreaInsets();
  const { token: authToken } = useAuth();
  const params = useLocalSearchParams<{
    category?: Category;
    subject?: string;
    description?: string;
  }>();

  const [category, setCategory] = useState<Category>(params.category ?? "other");
  const [subject, setSubject] = useState(params.subject ?? "");
  const [description, setDescription] = useState(params.description ?? "");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticketId: string } | null>(null);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert("Subject required", "Please enter a short subject for your report.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert("Description too short", "Please describe the problem in at least 10 characters.");
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/support/report-problem"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          description: description.trim(),
          contactEmail: contactEmail.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        ticketId?: string;
        error?: string;
      };
      if (!res.ok || !data.success || !data.ticketId) {
        Alert.alert("Could not submit", data.error ?? "Please try again later.");
        setSubmitting(false);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted({ ticketId: data.ticketId });
    } catch {
      Alert.alert("Network error", "Could not reach support service. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={{ flex: 1 }}
      >
        <View style={[s.successWrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
          <View style={s.successIcon}>
            <Feather name="check-circle" size={40} color={Colors.positive} />
          </View>
          <Text style={s.successTitle}>Report Submitted</Text>
          <Text style={s.successSub}>
            Our support team will review your report and respond within 1 business day.
          </Text>
          <View style={s.ticketBox}>
            <Text style={s.ticketLabel}>Ticket ID</Text>
            <Text style={s.ticketId}>{submitted.ticketId}</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={["#4F7FFF", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.primaryBtnGrad}
            >
              <Text style={s.primaryBtnText}>Done</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={{ flex: 1 }}
    >
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          <Text style={s.backText}>Settings</Text>
        </Pressable>
        <Text style={s.title}>Report a Problem</Text>
        <View style={{ width: 80 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.intro}>
            Help us help you. Tell us what went wrong and we'll investigate.
          </Text>

          <Text style={s.label}>Category</Text>
          <View style={s.categoryGrid}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[s.categoryBtn, category === c.id && s.categoryBtnActive]}
              >
                <Feather
                  name={c.icon}
                  size={16}
                  color={category === c.id ? "#fff" : Colors.textMuted}
                />
                <Text
                  style={[
                    s.categoryText,
                    category === c.id && s.categoryTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Subject</Text>
          <TextInput
            style={s.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief summary of the issue"
            placeholderTextColor={Colors.textMuted}
            maxLength={120}
          />

          <Text style={s.label}>Describe the Problem</Text>
          <TextInput
            style={[s.input, s.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What happened? When did it occur? Any error messages?"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={s.charCount}>{description.length}/2000</Text>

          <Text style={s.label}>Contact Email (optional)</Text>
          <TextInput
            style={s.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="lpolpr01@gmail.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={s.hint}>
            We'll only contact you about this report. Leave blank to use your account email.
          </Text>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [s.submitBtn, submitting && { opacity: 0.6 }, pressed && !submitting && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={["#4F7FFF", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.submitBtnGrad}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={15} color="#fff" />
                  <Text style={s.submitBtnText}>Submit Report</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, width: 80 },
  backText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textPrimary },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  intro: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 19,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  categoryBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  categoryText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  categoryTextActive: { color: "#fff" },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top" },
  charCount: {
    alignSelf: "flex-end",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  hint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 6, lineHeight: 16 },
  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 24 },
  submitBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15,
  },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  successWrap: { flex: 1, paddingHorizontal: 24, alignItems: "center" },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(74,222,170,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  successSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 28,
  },
  ticketBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    alignItems: "center",
    width: "100%",
    marginBottom: 28,
  },
  ticketLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  ticketId: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  primaryBtn: { borderRadius: 14, overflow: "hidden", width: "100%" },
  primaryBtnGrad: { paddingVertical: 15, alignItems: "center" },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});
