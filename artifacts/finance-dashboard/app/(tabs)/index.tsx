import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { useTheme } from "@/context/ThemeContext";
import { BalanceHeader } from "@/components/BalanceHeader";
import { WalletCardStack } from "@/components/WalletCardStack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SUBSCRIPTIONS, CARD_COLORS } from "@/constants/subscriptions";

const BUREAUS = [
  { name: "Equifax", score: 742, color: "#FF6B9D" },
  { name: "Experian", score: 738, color: "#6C9EFF" },
  { name: "TransUnion", score: 745, color: "#4ADEAA" },
];

const SCORE_MIN = 300;
const SCORE_MAX = 850;

function getCategory(score: number): string {
  if (score >= 750) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 650) return "Fair";
  if (score >= 580) return "Poor";
  return "Very Poor";
}

function getCategoryColor(score: number): string {
  if (score >= 750) return Colors.positive;
  if (score >= 700) return "#A3E635";
  if (score >= 650) return "#FBBF24";
  return Colors.negative;
}

function ScoreArc({ score, color }: { score: number; color: string }) {
  const pct = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  return (
    <View style={cs.arcWrap}>
      <View style={cs.arcBg}>
        <View style={[cs.arcFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[cs.scoreNum, { color }]}>{score}</Text>
    </View>
  );
}

function CreditScorePanel() {
  const avgScore = Math.round(BUREAUS.reduce((s, b) => s + b.score, 0) / BUREAUS.length);
  const avgCategory = getCategory(avgScore);
  const avgColor = getCategoryColor(avgScore);

  return (
    <View style={cs.panel}>
      <View style={cs.header}>
        <View style={cs.headerLeft}>
          <Feather name="shield" size={16} color={Colors.primary} />
          <Text style={cs.title}>Credit Scores</Text>
        </View>
        <View style={cs.updatedBadge}>
          <View style={cs.updatedDot} />
          <Text style={cs.updatedText}>Updated today</Text>
        </View>
      </View>

      {/* Average score row */}
      <View style={cs.avgRow}>
        <Text style={cs.avgLabel}>Average Score</Text>
        <View style={cs.avgRight}>
          <Text style={[cs.avgScore, { color: avgColor }]}>{avgScore}</Text>
          <Text style={[cs.avgCategory, { color: avgColor }]}>{avgCategory}</Text>
        </View>
      </View>

      {/* Score gradient bar */}
      <View style={cs.barWrap}>
        <LinearGradient
          colors={["#FF6B9D", "#FBBF24", "#A3E635", "#4ADEAA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cs.barTrack}
        />
        <View style={[cs.barIndicator, { left: `${((avgScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100}%` as any }]}>
          <View style={cs.barDot} />
        </View>
        <View style={cs.barLabels}>
          <Text style={cs.barLabel}>300</Text>
          <Text style={cs.barLabel}>Poor</Text>
          <Text style={cs.barLabel}>Good</Text>
          <Text style={cs.barLabel}>850</Text>
        </View>
      </View>

      {/* Three bureaus */}
      <View style={cs.bureauxRow}>
        {BUREAUS.map((b, i) => (
          <React.Fragment key={b.name}>
            {i > 0 && <View style={cs.bureauDivider} />}
            <View style={cs.bureauItem}>
              <Text style={cs.bureauName}>{b.name}</Text>
              <Text style={[cs.bureauScore, { color: b.color }]}>{b.score}</Text>
              <View style={cs.bureauBarBg}>
                <View style={[cs.bureauBarFill, {
                  width: `${((b.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100}%` as any,
                  backgroundColor: b.color
                }]} />
              </View>
              <Text style={[cs.bureauCategory, { color: getCategoryColor(b.score) }]}>
                {getCategory(b.score)}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <Text style={cs.disclaimer}>
        Scores based on VantageScore 3.0 model · For informational use only
      </Text>
    </View>
  );
}

function SubscriptionsRow() {
  const { cards } = useFinance();
  const total = SUBSCRIPTIONS.reduce((s, sub) => s + sub.amount, 0);
  const cardTotals = cards.map((c) => ({
    ...c,
    subs: SUBSCRIPTIONS.filter((s) => s.cardId === c.id),
    color: CARD_COLORS[c.id] || Colors.primary,
  }));
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/subscriptions"); }}
      style={({ pressed }) => [sub.wrap, pressed && { opacity: 0.85 }]}
    >
      <View style={sub.left}>
        <View style={sub.iconWrap}>
          <Feather name="repeat" size={16} color={Colors.primary} />
        </View>
        <View style={sub.info}>
          <Text style={sub.title}>Subscriptions</Text>
          <View style={sub.dots}>
            {cardTotals.map((c) => (
              <View key={c.id} style={[sub.dot, { backgroundColor: c.color }]} />
            ))}
            <Text style={sub.subCount}>{SUBSCRIPTIONS.length} active autopays</Text>
          </View>
        </View>
      </View>
      <View style={sub.right}>
        <Text style={sub.amt}>${total.toFixed(2)}<Text style={sub.mo}>/mo</Text></Text>
        <Feather name="chevron-right" size={16} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function CardListScreen() {
  const { cards, transactions, totalBalance } = useFinance();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const transactionCounts: Record<string, number> = {};
  for (const tx of transactions) {
    transactionCounts[tx.cardId] = (transactionCounts[tx.cardId] ?? 0) + 1;
  }

  return (
    <LinearGradient
      colors={[theme.bgStart, theme.bgEnd]}
      style={styles.gradient}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      >
        <BalanceHeader totalBalance={totalBalance} />
        <WalletCardStack cards={cards} transactionCounts={transactionCounts} />
        <SubscriptionsRow />
        <CreditScorePanel />
      </ScrollView>
    </LinearGradient>
  );
}

const sub = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { gap: 4 },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  subCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  amt: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  mo: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
});

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scrollContent: {
    paddingBottom: 140,
  },
});

// ─── Credit Score Styles ──────────────────────────────────────────────────────

const cs = StyleSheet.create({
  panel: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  updatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(74,222,170,0.1)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(74,222,170,0.2)",
  },
  updatedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.positive,
  },
  updatedText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.positive,
  },
  avgRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  avgLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  avgRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  avgScore: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
  },
  avgCategory: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  barWrap: {
    marginHorizontal: 16,
    marginBottom: 16,
    position: "relative",
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  barIndicator: {
    position: "absolute",
    top: -4,
    alignItems: "center",
  },
  barDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: Colors.primaryDark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    marginLeft: -8,
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  barLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: Colors.textMuted,
  },
  bureauxRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  bureauItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 5,
  },
  bureauDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  bureauName: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bureauScore: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  bureauBarBg: {
    width: "70%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  bureauBarFill: {
    height: 4,
    borderRadius: 2,
  },
  bureauCategory: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
  arcWrap: { alignItems: "center", gap: 4 },
  arcBg: { width: 48, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  arcFill: { height: 6, borderRadius: 3 },
  scoreNum: { fontFamily: "Inter_700Bold", fontSize: 20 },
  disclaimer: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    lineHeight: 15,
  },
});
