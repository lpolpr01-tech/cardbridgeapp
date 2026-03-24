import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const PLAN = {
  name: "CardFlow Premium",
  status: "active" as "active" | "inactive",
  since: new Date("2024-01-15"),
  renewsOn: new Date("2025-01-15"),
  price: "$9.99 / month",
  paymentCardLast4: "4242",
  paymentCardBrand: "Visa",
  perks: [
    "Unlimited card tracking",
    "Real-time spending alerts",
    "Crypto payment scheduling",
    "Advanced subscription management",
    "Priority support",
  ],
};

export default function SubscriptionPlanScreen() {
  const insets = useSafeAreaInsets();
  const isActive = PLAN.status === "active";

  const sinceStr = PLAN.since.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const renewsStr = PLAN.renewsOn.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const monthsSince = Math.floor(
    (Date.now() - PLAN.since.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={s.gradient}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        {/* Back header */}
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={s.pageTitle}>Subscription</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status card */}
        <View style={[s.statusCard, isActive ? s.statusCardActive : s.statusCardInactive]}>
          <LinearGradient
            colors={isActive
              ? ["rgba(74,222,170,0.12)", "rgba(74,222,170,0.04)"]
              : ["rgba(255,107,138,0.12)", "rgba(255,107,138,0.04)"]}
            style={s.statusGradient}
          >
            <View style={s.statusTop}>
              <View style={[s.statusBadge, isActive ? s.statusBadgeActive : s.statusBadgeInactive]}>
                <Feather
                  name={isActive ? "check-circle" : "x-circle"}
                  size={14}
                  color={isActive ? Colors.positive : Colors.negative}
                />
                <Text style={[s.statusBadgeText, { color: isActive ? Colors.positive : Colors.negative }]}>
                  {isActive ? "Active" : "Inactive"}
                </Text>
              </View>
              <Text style={s.planPrice}>{PLAN.price}</Text>
            </View>

            <Text style={s.planName}>{PLAN.name}</Text>

            <View style={s.divider} />

            <View style={s.infoGrid}>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Member Since</Text>
                <Text style={[s.infoValue, { color: isActive ? Colors.positive : Colors.textSecondary }]}>
                  {sinceStr}
                </Text>
              </View>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Duration</Text>
                <Text style={s.infoValue}>{monthsSince} months</Text>
              </View>
            </View>

            <View style={s.infoGrid}>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Renews On</Text>
                <Text style={s.infoValue}>{renewsStr}</Text>
              </View>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Payment Method</Text>
                <View style={s.cardRow}>
                  <Feather name="credit-card" size={13} color={Colors.textSecondary} />
                  <Text style={s.infoValue}>
                    {PLAN.paymentCardBrand} ···· {PLAN.paymentCardLast4}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Perks */}
        <Text style={s.sectionTitle}>What's Included</Text>
        <View style={s.perksCard}>
          {PLAN.perks.map((perk, i) => (
            <React.Fragment key={perk}>
              {i > 0 && <View style={s.perkDivider} />}
              <View style={s.perkRow}>
                <View style={s.perkCheck}>
                  <Feather name="check" size={13} color={Colors.positive} />
                </View>
                <Text style={s.perkText}>{perk}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Cancel link */}
        <Pressable style={s.cancelRow}>
          <Text style={s.cancelText}>Cancel subscription</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 24,
  },
  statusCardActive: {
    borderColor: "rgba(74,222,170,0.4)",
  },
  statusCardInactive: {
    borderColor: "rgba(255,107,138,0.4)",
  },
  statusGradient: {
    padding: 20,
    gap: 12,
  },
  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: "rgba(74,222,170,0.12)",
    borderColor: "rgba(74,222,170,0.3)",
  },
  statusBadgeInactive: {
    backgroundColor: "rgba(255,107,138,0.12)",
    borderColor: "rgba(255,107,138,0.3)",
  },
  statusBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  planPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  planName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  infoItem: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  perksCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingVertical: 4,
    marginBottom: 24,
    overflow: "hidden",
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  perkDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 52,
  },
  perkCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(74,222,170,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(74,222,170,0.25)",
  },
  perkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  cancelRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
});
