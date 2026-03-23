import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import type { Transaction, Card } from "@/context/FinanceContext";

type Props = {
  transaction: Transaction;
  card?: Card;
  showCard?: boolean;
};

const CATEGORY_ICONS: Record<string, string> = {
  Entertainment: "film",
  Income: "trending-up",
  Groceries: "shopping-bag",
  "Food & Drink": "coffee",
  Travel: "navigation",
  Transport: "map-pin",
  Shopping: "package",
  Electronics: "smartphone",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(abs);
}

const CARD_COLORS: Record<string, string> = {
  "card-1": "#9B5CF5",
  "card-2": "#3E8EDD",
  "card-3": "#3EC48A",
};

export function TransactionItem({ transaction, card, showCard = false }: Props) {
  const icon = (CATEGORY_ICONS[transaction.category] || transaction.icon || "circle") as any;
  const isCredit = transaction.type === "credit";
  const cardColor = CARD_COLORS[transaction.cardId] || Colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: `${cardColor}22` }]}>
        <Feather name={icon} size={18} color={cardColor} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {transaction.title}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.category}>{transaction.category}</Text>
          {showCard && card && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={[styles.cardTag, { color: cardColor }]}>
                ···{card.lastFour}
              </Text>
            </>
          )}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.date}>{formatDate(transaction.date)}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.amount,
          { color: isCredit ? Colors.positive : Colors.textPrimary },
        ]}
      >
        {isCredit ? "+" : "-"}{formatCurrency(transaction.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 20,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  category: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardTag: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  dot: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  date: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  amount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    flexShrink: 0,
  },
});
