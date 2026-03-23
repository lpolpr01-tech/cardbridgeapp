import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { TransactionItem } from "@/components/TransactionItem";

const FILTERS = ["All", "Debit", "Credit"] as const;
type Filter = (typeof FILTERS)[number];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export default function TransactionsScreen() {
  const { transactions, cards } = useFinance();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = transactions.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Debit") return t.type === "debit";
    if (filter === "Credit") return t.type === "credit";
    return true;
  });

  const totalDebit = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalCredit = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>{transactions.length} total</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Money In</Text>
          <Text style={[styles.summaryAmount, { color: Colors.positive }]}>
            +{formatCurrency(totalCredit)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Money Out</Text>
          <Text style={[styles.summaryAmount, { color: Colors.negative }]}>
            -{formatCurrency(totalDebit)}
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterBtn,
              filter === f && styles.filterBtnActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.listContent]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            card={cardById[item.cardId]}
            showCard
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  filterBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingBottom: 120,
    paddingTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 20,
  },
  empty: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textMuted,
  },
});
