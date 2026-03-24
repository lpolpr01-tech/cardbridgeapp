import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

type Props = {
  totalBalance: number;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function BalanceHeader({ totalBalance }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.greeting}>Good morning</Text>
      <Text style={styles.name}>Luis Pol</Text>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(totalBalance)}</Text>
        <View style={styles.changeRow}>
          <View style={styles.changeBadge}>
            <Text style={styles.changeText}>↑ 12.4% this month</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 28,
  },
  balanceCard: {
    alignItems: "center",
  },
  balanceLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  balanceAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 44,
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 12,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeBadge: {
    backgroundColor: "rgba(74, 222, 170, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(74,222,170,0.3)",
  },
  changeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.positive,
  },
});
