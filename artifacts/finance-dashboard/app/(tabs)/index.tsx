import React from "react";
import {
  ScrollView,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { BalanceHeader } from "@/components/BalanceHeader";
import { WalletCardStack } from "@/components/WalletCardStack";

export default function CardListScreen() {
  const { cards, transactions, totalBalance } = useFinance();

  const transactionCounts: Record<string, number> = {};
  for (const tx of transactions) {
    transactionCounts[tx.cardId] = (transactionCounts[tx.cardId] ?? 0) + 1;
  }

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
        <WalletCardStack cards={cards} transactionCounts={transactionCounts} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
});
