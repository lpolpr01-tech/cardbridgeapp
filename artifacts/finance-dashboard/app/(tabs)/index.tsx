import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { BalanceHeader } from "@/components/BalanceHeader";
import { CardItem } from "@/components/CardItem";

export default function CardListScreen() {
  const { cards, transactions, totalBalance } = useFinance();

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <BalanceHeader totalBalance={totalBalance} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Cards</Text>
          <Text style={styles.sectionCount}>{cards.length} cards</Text>
        </View>

        {cards.map((card) => {
          const txCount = transactions.filter((t) => t.cardId === card.id).length;
          return (
            <CardItem key={card.id} card={card} transactionCount={txCount} />
          );
        })}

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Cards</Text>
            <Text style={styles.summaryValue}>{cards.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Limit</Text>
            <Text style={styles.summaryValue}>
              ${cards.reduce((s, c) => s + c.limit, 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Utilization</Text>
            <Text style={styles.summaryValue}>
              {(
                (totalBalance / cards.reduce((s, c) => s + c.limit, 0)) *
                100
              ).toFixed(0)}
              %
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  sectionCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.textPrimary,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
});
