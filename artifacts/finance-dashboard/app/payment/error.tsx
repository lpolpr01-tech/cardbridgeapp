import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

// Maps server error codes / messages to a friendly explanation + resolution steps.
function classifyError(message: string): { title: string; explanation: string; steps: string[] } {
  const lower = message.toLowerCase();

  if (lower.includes("insufficient") || lower.includes("nsf")) {
    return {
      title: "Insufficient funds",
      explanation:
        "Your bank reported insufficient funds in the linked account at the time of the debit attempt.",
      steps: [
        "Confirm available balance in your bank account.",
        "Wait for any pending deposits to clear.",
        "Retry the payment, or schedule it for a date when funds will be available.",
      ],
    };
  }

  if (lower.includes("bank account not found") || lower.includes("plaid")) {
    return {
      title: "Bank account not linked",
      explanation:
        "We couldn't find a verified bank account to debit from. You need to link a bank via Plaid before you can pay.",
      steps: [
        "Go to Settings → Linked Bank Accounts.",
        "Tap '+ Add Another Bank Account' to link a checking account via Plaid.",
        "Return here and retry the payment.",
      ],
    };
  }

  if (lower.includes("not configured") || lower.includes("503")) {
    return {
      title: "Payment service unavailable",
      explanation:
        "The payment processor (Stripe) isn't reachable right now. Your card and bank account were not charged.",
      steps: [
        "Wait a few minutes and try again.",
        "Check status.cardbridge.app for live service status.",
        "Contact support if the problem persists.",
      ],
    };
  }

  if (lower.includes("network")) {
    return {
      title: "Network connection lost",
      explanation:
        "We couldn't reach the payment server. Your payment was not submitted.",
      steps: [
        "Check your internet connection.",
        "Make sure airplane mode is off.",
        "Retry the payment.",
      ],
    };
  }

  return {
    title: "Payment could not be completed",
    explanation:
      "Something went wrong while processing your payment. No funds have been moved. The exact reason from the server is shown below.",
    steps: [
      "Review the error details for clues.",
      "Verify your bank account is in good standing.",
      "Retry the payment, or contact support if the issue persists.",
    ],
  };
}

export default function PaymentErrorScreen() {
  const insets = useSafeAreaInsets();
  const { message, ticketId } = useLocalSearchParams<{ message?: string; ticketId?: string }>();
  const errorMessage = message || "Unknown error";
  const info = classifyError(errorMessage);

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.iconWrap}>
          <Feather name="alert-circle" size={32} color={Colors.negative} />
        </View>
        <Text style={s.title}>{info.title}</Text>
        <Text style={s.subtitle}>{info.explanation}</Text>

        <View style={s.errorBox}>
          <Text style={s.errorLabel}>Error reported by server</Text>
          <Text style={s.errorText}>{errorMessage}</Text>
          {ticketId ? (
            <>
              <View style={s.errorDivider} />
              <Text style={s.errorLabel}>Reference ID</Text>
              <Text style={s.errorText}>{ticketId}</Text>
            </>
          ) : null}
        </View>

        <Text style={s.stepsHeader}>How to resolve</Text>
        <View style={s.stepsList}>
          {info.steps.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={s.reassurance}>
          <Feather name="check-circle" size={14} color={Colors.positive} />
          <Text style={s.reassuranceText}>
            No funds have been debited. Your payment did not go through.
          </Text>
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
            <Feather name="rotate-ccw" size={15} color="#fff" />
            <Text style={s.primaryBtnText}>Try again</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/report-problem",
              params: {
                category: "payment",
                subject: info.title,
                description: errorMessage,
              },
            })
          }
          style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.85 }]}
        >
          <Feather name="message-circle" size={14} color={Colors.primary} />
          <Text style={s.secondaryBtnText}>Report this issue to Support</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => [s.tertiaryBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.tertiaryBtnText}>Cancel and return home</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  iconWrap: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,107,138,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: "rgba(255,107,138,0.07)",
    borderColor: "rgba(255,107,138,0.25)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 22,
  },
  errorLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.negative, lineHeight: 18 },
  errorDivider: { height: 1, backgroundColor: "rgba(255,107,138,0.18)", marginVertical: 10 },
  stepsHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  stepsList: { gap: 10, marginBottom: 18 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(108,158,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.primary },
  stepText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  reassurance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(74,222,170,0.08)",
    borderColor: "rgba(74,222,170,0.25)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    marginBottom: 22,
  },
  reassuranceText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.positive, lineHeight: 17 },
  primaryBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 10 },
  primaryBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15,
  },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: "rgba(108,158,255,0.06)",
    marginBottom: 6,
  },
  secondaryBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primary },
  tertiaryBtn: { paddingVertical: 14, alignItems: "center" },
  tertiaryBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
});
