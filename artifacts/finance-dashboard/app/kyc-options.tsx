import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

type Provider = {
  key: string;
  name: string;
  recommended?: boolean;
  description: string;
  pricing: string;
  bullet?: string;
  ctaLabel: string;
  url: string;
  accentColor: string;
};

const PROVIDERS: Provider[] = [
  {
    key: "stripe",
    name: "Stripe Identity",
    recommended: true,
    description: "Government ID + selfie verification.",
    pricing: "$1.50 per verification",
    bullet: "Easiest setup — we already use Stripe.",
    ctaLabel: "Get Started",
    url: "https://stripe.com/identity",
    accentColor: "#635BFF",
  },
  {
    key: "persona",
    name: "Persona",
    description: "Most popular KYC for fintech startups. Supports 200+ ID types worldwide.",
    pricing: "$1.50 per verification",
    ctaLabel: "Learn More",
    url: "https://withpersona.com",
    accentColor: "#7CFFB2",
  },
  {
    key: "jumio",
    name: "Jumio",
    description: "Bank-grade verification used by major financial institutions.",
    pricing: "Custom pricing",
    ctaLabel: "Learn More",
    url: "https://jumio.com",
    accentColor: "#FFB660",
  },
];

export default function KycOptionsScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveBgStart, effectiveBgEnd } = useTheme();

  const open = (provider: Provider) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/external-link",
      params: { url: provider.url, title: provider.name },
    });
  };

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Identity Verification</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.intro}>
          Pick a provider to verify your identity. CardBridge never sees or stores your ID documents
          — verification is handled entirely by the provider you choose.
        </Text>

        {PROVIDERS.map((p) => (
          <View key={p.key} style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: `${p.accentColor}20`, borderColor: `${p.accentColor}55` }]}>
                <Feather name="shield" size={18} color={p.accentColor} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.cardTitleRow}>
                  <Text style={s.cardTitle}>{p.name}</Text>
                  {p.recommended && (
                    <View style={s.recommendedBadge}>
                      <Text style={s.recommendedText}>RECOMMENDED</Text>
                    </View>
                  )}
                </View>
                <Text style={s.cardPricing}>{p.pricing}</Text>
              </View>
            </View>

            <Text style={s.cardDescription}>{p.description}</Text>
            {p.bullet && (
              <View style={s.bulletRow}>
                <Feather name="check-circle" size={13} color={Colors.positive} />
                <Text style={s.bulletText}>{p.bullet}</Text>
              </View>
            )}

            <Pressable
              onPress={() => open(p)}
              style={({ pressed }) => [
                s.ctaBtn,
                p.recommended && { backgroundColor: p.accentColor },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[s.ctaText, !p.recommended && s.ctaTextSecondary]}>{p.ctaLabel}</Text>
              <Feather
                name="external-link"
                size={14}
                color={p.recommended ? "#fff" : Colors.primary}
              />
            </Pressable>
          </View>
        ))}

        <Text style={s.disclaimer}>
          Your identity data is handled entirely by the selected third-party provider under their
          security certifications. CardBridge never stores your ID documents.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
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
  intro: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  card: {
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    padding: 18,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  recommendedBadge: {
    backgroundColor: "rgba(108,158,255,0.18)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.4)",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  recommendedText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  cardPricing: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.positive },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.4)",
  },
  ctaText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  ctaTextSecondary: { color: Colors.primary },
  disclaimer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    paddingHorizontal: 4,
    marginTop: 8,
  },
});
