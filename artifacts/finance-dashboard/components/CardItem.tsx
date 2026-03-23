import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { Card } from "@/context/FinanceContext";

const { width } = Dimensions.get("window");

type Props = {
  card: Card;
  transactionCount: number;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function CardLogo({ type }: { type: Card["type"] }) {
  if (type === "visa") {
    return (
      <View style={styles.logoContainer}>
        <Text style={styles.visaText}>VISA</Text>
      </View>
    );
  }
  if (type === "mastercard") {
    return (
      <View style={styles.logoContainer}>
        <View style={styles.mcCircles}>
          <View style={[styles.mcCircle, { backgroundColor: "#EB001B", opacity: 0.9 }]} />
          <View style={[styles.mcCircle, { backgroundColor: "#F79E1B", marginLeft: -10, opacity: 0.9 }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.logoContainer}>
      <Text style={styles.amexText}>AMEX</Text>
    </View>
  );
}

export function CardItem({ card, transactionCount }: Props) {
  const usagePercent = Math.min((card.balance / card.limit) * 100, 100);

  return (
    <LinearGradient
      colors={card.color as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={styles.cardNumber}>•••• •••• •••• {card.lastFour}</Text>
        </View>
        <CardLogo type={card.type} />
      </View>

      <View style={styles.cardMiddle}>
        <View>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balance}>{formatCurrency(card.balance)}</Text>
        </View>
        <View style={styles.txBadge}>
          <Feather name="activity" size={12} color="rgba(255,255,255,0.9)" />
          <Text style={styles.txText}>{transactionCount} transactions</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>Limit: {formatCurrency(card.limit)}</Text>
          <Text style={styles.limitLabel}>{usagePercent.toFixed(0)}% used</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${usagePercent}%` as any }]} />
        </View>
      </View>

      <View style={styles.shimmerCircle1} />
      <View style={styles.shimmerCircle2} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 22,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: "hidden",
    minHeight: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  cardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
    marginBottom: 4,
  },
  cardNumber: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
  },
  logoContainer: {
    alignItems: "flex-end",
  },
  visaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  amexText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#fff",
    letterSpacing: 2,
  },
  mcCircles: {
    flexDirection: "row",
    width: 40,
    height: 26,
    alignItems: "center",
  },
  mcCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  cardMiddle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  balanceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  balance: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#fff",
    letterSpacing: -0.5,
  },
  txBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  txText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
  },
  cardBottom: {},
  limitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  limitLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  progressBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 2,
  },
  shimmerCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: -20,
    top: -30,
  },
  shimmerCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    right: 40,
    bottom: -20,
  },
});
