import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { useTheme } from "@/context/ThemeContext";

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

export default function PaymentHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveBgStart, effectiveBgEnd } = useTheme();
  const { scheduledPayments, cards } = useFinance();

  const items = useMemo(() => {
    return [...scheduledPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [scheduledPayments]);

  const cardName = (id: string) => cards.find((c) => c.id === id)?.name ?? "Card";

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Payment History</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={s.empty}>
            <Feather name="clock" size={28} color={Colors.textMuted} />
            <Text style={s.emptyText}>No payments yet.</Text>
            <Text style={s.emptySub}>Scheduled and completed payments will show up here.</Text>
          </View>
        ) : (
          items.map((p) => {
            const total = Object.values(p.amounts).reduce((sum, n) => sum + n, 0);
            return (
              <View key={p.id} style={s.row}>
                <View style={[s.statusDot, p.status === "completed" ? s.statusDotDone : s.statusDotPending]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.rowTitle}>
                    {p.cardIds.map(cardName).join(" + ")}
                  </Text>
                  <Text style={s.rowSub}>
                    {formatDate(p.date)} · {p.note || (p.status === "completed" ? "Paid" : "Scheduled")}
                  </Text>
                </View>
                <Text style={s.rowAmount}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 10 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary, marginTop: 8 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 30 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(28,14,70,0.88)", borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)", padding: 14,
  },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusDotDone: { backgroundColor: Colors.positive },
  statusDotPending: { backgroundColor: "#F59E0B" },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  rowAmount: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
});
