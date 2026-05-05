import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveBgStart, effectiveBgEnd } = useTheme();

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.lead}>Last updated: May 2026 — Beta</Text>

        <Text style={s.h2}>What we collect</Text>
        <Text style={s.p}>
          Your username, full name, and date of birth (entered at sign-up). The Plaid access tokens
          for any accounts you link, kept server-side and never exposed to other users.
          Payment metadata (amount, status, confirmation number) for transactions you initiate.
        </Text>

        <Text style={s.h2}>What we don't collect</Text>
        <Text style={s.p}>
          We do not store your bank password — Plaid handles that exchange entirely. We do not
          store images of your government ID — that's handled by your chosen KYC provider
          (Stripe Identity, Persona, or Jumio). We do not sell or share your data with advertisers.
        </Text>

        <Text style={s.h2}>Third parties</Text>
        <Text style={s.p}>
          Plaid (account linking & transactions), Stripe (ACH payments and optional identity
          verification), and your chosen KYC provider each receive only what they need to do their
          part of the flow. Each is bound by their own published privacy terms.
        </Text>

        <Text style={s.h2}>Your controls</Text>
        <Text style={s.p}>
          You can unlink any bank account from Settings → Linked Bank Accounts. You can remove your
          account by signing out and deleting the app. Reach out via Settings → Report a Problem
          if you want a full data export or deletion.
        </Text>

        <Text style={s.disclaimer}>
          This policy is a placeholder for the beta. A finalized policy will be in place before any
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
