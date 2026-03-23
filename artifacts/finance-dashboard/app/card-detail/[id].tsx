import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { TransactionItem } from "@/components/TransactionItem";
import type { CardRewards } from "@/context/FinanceContext";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function CardTypeBadge({ type }: { type: "visa" | "mastercard" | "amex" }) {
  const labels: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
  };
  const colors: Record<string, string> = {
    visa: "#1A1F71",
    mastercard: "#EB001B",
    amex: "#007BC1",
  };
  return (
    <View style={[styles.typeBadge, { backgroundColor: `${colors[type]}22`, borderColor: `${colors[type]}44` }]}>
      <Text style={[styles.typeBadgeText, { color: colors[type] === "#1A1F71" ? Colors.primaryLight : colors[type] }]}>
        {labels[type]}
      </Text>
    </View>
  );
}

function RewardsPanel({ rewards }: { rewards: CardRewards }) {
  return (
    <View style={styles.rewardsPanel}>
      <View style={styles.rewardsPanelHeader}>
        <Feather name="gift" size={16} color={Colors.primary} />
        <Text style={styles.rewardsPanelTitle}>Rewards & Benefits</Text>
      </View>
      <Text style={styles.rewardsDescription}>{rewards.description}</Text>

      <View style={styles.rewardsGrid}>
        {(rewards.type === "cashback" || rewards.type === "both") && (
          <View style={styles.rewardBox}>
            <View style={styles.rewardBoxIcon}>
              <Feather name="percent" size={16} color={Colors.positive} />
            </View>
            <Text style={styles.rewardBoxLabel}>Cash Back Rate</Text>
            <Text style={[styles.rewardBoxValue, { color: Colors.positive }]}>
              {rewards.cashbackRate}%
            </Text>
            <Text style={styles.rewardBoxSub}>Per purchase</Text>
          </View>
        )}

        {(rewards.type === "cashback" || rewards.type === "both") &&
          rewards.cashbackTotal !== undefined && (
            <View style={styles.rewardBox}>
              <View style={[styles.rewardBoxIcon, { backgroundColor: "rgba(74,222,170,0.12)" }]}>
                <Feather name="dollar-sign" size={16} color={Colors.positive} />
              </View>
              <Text style={styles.rewardBoxLabel}>Total Earned</Text>
              <Text style={[styles.rewardBoxValue, { color: Colors.positive }]}>
                {formatCurrency(rewards.cashbackTotal)}
              </Text>
              <Text style={styles.rewardBoxSub}>Cash back</Text>
            </View>
          )}

        {(rewards.type === "points" || rewards.type === "both") && (
          <View style={styles.rewardBox}>
            <View style={[styles.rewardBoxIcon, { backgroundColor: "rgba(168,200,255,0.12)" }]}>
              <Feather name="zap" size={16} color={Colors.primaryLight} />
            </View>
            <Text style={styles.rewardBoxLabel}>Points Rate</Text>
            <Text style={[styles.rewardBoxValue, { color: Colors.primaryLight }]}>
              {rewards.pointsRate}x
            </Text>
            <Text style={styles.rewardBoxSub}>Per dollar</Text>
          </View>
        )}

        {(rewards.type === "points" || rewards.type === "both") &&
          rewards.pointsTotal !== undefined && (
            <View style={styles.rewardBox}>
              <View style={[styles.rewardBoxIcon, { backgroundColor: "rgba(168,200,255,0.12)" }]}>
                <Feather name="award" size={16} color={Colors.primaryLight} />
              </View>
              <Text style={styles.rewardBoxLabel}>Total Points</Text>
              <Text style={[styles.rewardBoxValue, { color: Colors.primaryLight }]}>
                {rewards.pointsTotal.toLocaleString()}
              </Text>
              <Text style={styles.rewardBoxSub}>Points earned</Text>
            </View>
          )}
      </View>
    </View>
  );
}

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { cards, transactions } = useFinance();

  const card = cards.find((c) => c.id === id);
  const cardTransactions = transactions.filter((t) => t.cardId === id);
  const sorted = [...cardTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const totalSpent = cardTransactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome = cardTransactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);

  if (!card) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Card not found</Text>
      </View>
    );
  }

  const usagePct = Math.min((card.balance / card.limit) * 100, 100);

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ListHeaderComponent={() => (
          <>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              >
                <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
                <Text style={styles.backText}>Cards</Text>
              </Pressable>
            </View>

            <LinearGradient
              colors={card.color as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroName}>{card.name}</Text>
                  <Text style={styles.heroNumber}>
                    •••• •••• •••• {card.lastFour}
                  </Text>
                </View>
                <CardTypeBadge type={card.type} />
              </View>

              <View style={styles.heroMid}>
                <Text style={styles.heroBalLabel}>Current Balance</Text>
                <Text style={styles.heroBal}>{formatCurrency(card.balance)}</Text>
              </View>

              <View>
                <View style={styles.heroLimitRow}>
                  <Text style={styles.heroLimitText}>
                    Credit limit: {formatCurrency(card.limit)}
                  </Text>
                  <Text style={styles.heroLimitText}>
                    {usagePct.toFixed(0)}% used
                  </Text>
                </View>
                <View style={styles.heroProg}>
                  <View
                    style={[styles.heroProgFill, { width: `${usagePct}%` as any }]}
                  />
                </View>
              </View>

              <View style={styles.heroShimmer1} />
              <View style={styles.heroShimmer2} />
            </LinearGradient>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Spent</Text>
                <Text style={[styles.statValue, { color: Colors.negative }]}>
                  -{formatCurrency(totalSpent)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total In</Text>
                <Text style={[styles.statValue, { color: Colors.positive }]}>
                  +{formatCurrency(totalIncome)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Transactions</Text>
                <Text style={styles.statValue}>{cardTransactions.length}</Text>
              </View>
            </View>

            <RewardsPanel rewards={card.rewards} />

            <Text style={styles.sectionTitle}>Transactions</Text>
          </>
        )}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        renderItem={({ item }) => (
          <TransactionItem transaction={item} card={card} />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Feather name="inbox" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  list: { paddingHorizontal: 0 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  backText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  notFoundText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  heroCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 24,
    minHeight: 200,
    overflow: "hidden",
    justifyContent: "space-between",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  heroNumber: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1.5,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  heroMid: {
    paddingVertical: 8,
  },
  heroBalLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroBal: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: "#fff",
    letterSpacing: -1,
  },
  heroLimitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  heroLimitText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
  },
  heroProg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  heroProgFill: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 2,
  },
  heroShimmer1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: -20,
    top: -30,
  },
  heroShimmer2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.04)",
    left: 20,
    bottom: -25,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  rewardsPanel: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    gap: 12,
  },
  rewardsPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rewardsPanelTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  rewardsDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  rewardBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  rewardBoxIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(74,222,170,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  rewardBoxLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  rewardBoxValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  rewardBoxSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 20,
  },
  empty: {
    paddingTop: 40,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
});
