import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveBgStart, effectiveBgEnd } = useTheme();

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>About CardBridge</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.logoBlock}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>CB</Text>
          </View>
          <Text style={s.appName}>CardBridge</Text>
          <Text style={s.tagline}>Your finances, beautifully organised</Text>
          <Text style={s.version}>Version 1.0.0 (Beta)</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>What CardBridge does</Text>
          <Text style={s.body}>
            CardBridge connects your credit cards and bank accounts via Plaid, then lets you pay
            them off from a single screen. Move money via ACH, schedule payments ahead of time,
            and see all your balances, due dates, and rewards in one place.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Tech</Text>
          <Text style={s.kv}><Text style={s.k}>Frontend</Text>  Expo / React Native</Text>
          <Text style={s.kv}><Text style={s.k}>Backend</Text>  Express + Plaid + Stripe</Text>
          <Text style={s.kv}><Text style={s.k}>Status</Text>  Sandbox beta</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },
  logoBlock: { alignItems: "center", paddingVertical: 24, gap: 6 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#1C1048",
    borderWidth: 2, borderColor: "rgba(108,158,255,0.4)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  logoText: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#6C9EFF", letterSpacing: 1 },
  appName: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  version: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  card: {
    backgroundColor: "rgba(28,14,70,0.88)", borderRadius: 18, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)", padding: 18, gap: 8,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary, marginBottom: 4 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  kv: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  k: { fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
});
