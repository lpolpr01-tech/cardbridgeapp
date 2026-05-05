import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveBgStart, effectiveBgEnd } = useTheme();

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Terms of Service</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.lead}>Last updated: May 2026 — Beta</Text>

        <Text style={s.h2}>1. Beta software</Text>
        <Text style={s.p}>
          CardBridge is currently in beta. Features may change without notice and the service may
          experience downtime. By using the app you accept that this is pre-release software.
        </Text>

        <Text style={s.h2}>2. Sandbox payments</Text>
        <Text style={s.p}>
          During the beta period CardBridge operates against Plaid Sandbox and Stripe Test mode.
          No real money moves. Real-money support requires KYC verification and a regulatory
          review by our payment partners.
        </Text>

        <Text style={s.h2}>3. Your data</Text>
        <Text style={s.p}>
          We store the minimum data required to operate the service. Identity documents are handled
          entirely by your chosen verification provider (Stripe Identity, Persona, or Jumio).
          See our Privacy Policy for full details.
        </Text>

        <Text style={s.h2}>4. Acceptable use</Text>
        <Text style={s.p}>
          You agree to use CardBridge only for personal, lawful financial management. You will not
          attempt to reverse engineer, scrape, or disrupt the service.
        </Text>

        <Text style={s.h2}>5. Termination</Text>
        <Text style={s.p}>
          You can sign out at any time from Settings. We may suspend accounts that violate these
          terms or that fail KYC verification.
        </Text>

        <Text style={s.disclaimer}>
          These terms are a placeholder for the beta. Final terms will be issued before any
          live-money features are enabled.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  lead: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted, marginBottom: 18 },
  h2: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary, marginTop: 16, marginBottom: 6 },
  p: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  disclaimer: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted,
    fontStyle: "italic", marginTop: 24, lineHeight: 16,
  },
});
