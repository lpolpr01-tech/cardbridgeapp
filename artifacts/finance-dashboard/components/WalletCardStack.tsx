import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import type { Card } from "@/context/FinanceContext";
import { useFinance } from "@/context/FinanceContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = 190;
const COLLAPSED_PEEK = 22;
const EXPANDED_GAP = CARD_HEIGHT + 16;

const CARD_COLORS: Record<string, string> = {
  "card-1": "#9B5CF5",
  "card-2": "#3E8EDD",
  "card-3": "#3EC48A",
};

const RAINBOW = ["#FF6B9D", "#FF8C42", "#FFD700", "#4ADEAA", "#6C9EFF", "#B57BFF"];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function MiniCardLogo({ type }: { type: Card["type"] }) {
  if (type === "visa") {
    return <Text style={styles.visaLogo}>VISA</Text>;
  }
  if (type === "mastercard") {
    return (
      <View style={styles.mcRow}>
        <View style={[styles.mcDot, { backgroundColor: "#EB001B" }]} />
        <View style={[styles.mcDot, { backgroundColor: "#F79E1B", marginLeft: -8 }]} />
      </View>
    );
  }
  return <Text style={styles.amexLogo}>AMEX</Text>;
}

function RainbowDot({ size = 11 }: { size?: number }) {
  return (
    <LinearGradient
      colors={RAINBOW as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}

function PaymentDots({ cardIds, totalCards }: { cardIds: string[]; totalCards: number }) {
  const allCards = cardIds.length === totalCards;
  const MAX_SHOWN = 3;

  if (allCards) {
    return (
      <View style={ov.dotsRow}>
        <RainbowDot size={12} />
      </View>
    );
  }

  const shown = cardIds.slice(0, MAX_SHOWN);
  const overflow = cardIds.length - MAX_SHOWN;

  return (
    <View style={ov.dotsRow}>
      {shown.map((cid, i) => (
        <View
          key={cid}
          style={[ov.dot, { backgroundColor: CARD_COLORS[cid] || Colors.primary, marginLeft: i > 0 ? -3 : 0 }]}
        />
      ))}
      {overflow > 0 && (
        <View style={[ov.dotOverflow, { marginLeft: -3 }]}>
          <Text style={ov.dotOverflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

type Props = {
  cards: Card[];
  transactionCounts: Record<string, number>;
};

export function WalletCardStack({ cards, transactionCounts }: Props) {
  const { scheduledPayments } = useFinance();
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  // Rewards totals
  const totalCashback = cards.reduce((s, c) => s + (c.rewards.cashbackTotal ?? 0), 0);
  const totalPoints = cards.reduce((s, c) => s + (c.rewards.pointsTotal ?? 0), 0);

  // Most recent scheduled payment
  const lastPayment = [...scheduledPayments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0] ?? null;

  const lastPaymentTotal = lastPayment
    ? Object.values(lastPayment.amounts).reduce((s, a) => s + a, 0)
    : 0;

  const collapsedOffsets = cards.map((_, i) => i * COLLAPSED_PEEK);

  const expand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExpanded(true);
    Animated.spring(expandAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [expandAnim]);

  const collapse = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(false);
    Animated.spring(expandAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }, [expandAnim]);

  const handleCardTap = useCallback(
    (card: Card) => {
      if (!expanded) {
        expand();
        return;
      }
      Haptics.selectionAsync();
      router.push({ pathname: "/card-detail/[id]", params: { id: card.id } });
    },
    [expanded, expand]
  );

  // Animated card area height
  const collapsedH = CARD_HEIGHT + (cards.length - 1) * COLLAPSED_PEEK;
  const expandedH = CARD_HEIGHT + (cards.length - 1) * EXPANDED_GAP;
  const cardAreaHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedH, expandedH],
  });

  return (
    <View style={styles.outer}>
      {/* ── Card area ── */}
      <Animated.View style={{ height: cardAreaHeight, position: "relative" }}>
        {[...cards].reverse().map((card) => {
          const index = cards.findIndex((c) => c.id === card.id);

          const collapsedY = collapsedOffsets[index];
          const expandedY = index * EXPANDED_GAP;

          const translateY = expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [collapsedY, expandedY],
          });

          const scale = expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1 - index * 0.025, 1],
          });

          const opacity = expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [index === 0 ? 1 : 0.88, 1],
          });

          return (
            <Animated.View
              key={card.id}
              style={[
                styles.cardContainer,
                {
                  transform: [{ translateY }, { scale }],
                  opacity,
                  zIndex: index + 1,
                },
              ]}
            >
              <Pressable
                onPress={() => handleCardTap(card)}
                style={({ pressed }) => [
                  styles.cardPressable,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <LinearGradient
                  colors={card.color as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.card}
                >
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.cardName}>{card.name}</Text>
                      <Text style={styles.cardNumber}>
                        •••• •••• •••• {card.lastFour}
                      </Text>
                    </View>
                    <MiniCardLogo type={card.type} />
                  </View>

                  <View style={styles.cardMid}>
                    <View>
                      <Text style={styles.balLabel}>Balance</Text>
                      <Text style={styles.balance}>
                        {formatCurrency(card.balance)}
                      </Text>
                    </View>
                    {expanded && (
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          router.push({
                            pathname: "/card-detail/[id]",
                            params: { id: card.id },
                          });
                        }}
                        style={styles.viewBtn}
                      >
                        <Text style={styles.viewBtnText}>View</Text>
                        <Feather name="arrow-right" size={13} color="rgba(255,255,255,0.9)" />
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={styles.limitRow}>
                      <Text style={styles.limitText}>
                        Limit {formatCurrency(card.limit)}
                      </Text>
                      <Text style={styles.limitText}>
                        {transactionCounts[card.id] ?? 0} transactions
                      </Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              (card.balance / card.limit) * 100,
                              100
                            )}%` as any,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.shimmer1} />
                  <View style={styles.shimmer2} />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* ── Toggle button ── */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={expanded ? collapse : expand}
          style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.75 }]}
        >
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.toggleText}>
            {expanded ? "Collapse cards" : "Expand all cards"}
          </Text>
        </Pressable>
      </View>

      {/* ── Rewards & Last Payment Overview ── */}
      <View style={ov.panel}>
        {/* Rewards row */}
        <View style={ov.rewardsRow}>
          <View style={ov.rewardItem}>
            <View style={ov.rewardIcon}>
              <Feather name="dollar-sign" size={13} color={Colors.positive} />
            </View>
            <View>
              <Text style={ov.rewardLabel}>Total Cash Back</Text>
              <Text style={ov.rewardValue}>{formatCurrency(totalCashback)}</Text>
            </View>
          </View>

          <View style={ov.rewardDivider} />

          <View style={ov.rewardItem}>
            <View style={[ov.rewardIcon, { backgroundColor: "rgba(108,158,255,0.12)" }]}>
              <Feather name="star" size={13} color={Colors.primary} />
            </View>
            <View>
              <Text style={ov.rewardLabel}>Rewards Points</Text>
              <Text style={[ov.rewardValue, { color: Colors.primary }]}>
                {formatNumber(totalPoints)} pts
              </Text>
            </View>
          </View>
        </View>

        {/* Last payment row */}
        {lastPayment && (
          <>
            <View style={ov.divider} />
            <View style={ov.lastPayRow}>
              <View style={ov.lastPayLeft}>
                <Text style={ov.lastPayLabel}>Last Scheduled Payment</Text>
                <Text style={ov.lastPayAmt}>
                  {formatCurrency(lastPaymentTotal)}
                </Text>
              </View>
              <View style={ov.lastPayRight}>
                <PaymentDots
                  cardIds={lastPayment.cardIds}
                  totalCards={cards.length}
                />
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 20,
  },
  cardContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    width: CARD_WIDTH,
    alignSelf: "center",
  },
  cardPressable: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  card: {
    borderRadius: 20,
    padding: 22,
    height: CARD_HEIGHT,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
    marginBottom: 3,
  },
  cardNumber: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.5,
  },
  visaLogo: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    color: "#fff",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  amexLogo: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#fff",
    letterSpacing: 2,
  },
  mcRow: {
    flexDirection: "row",
    alignItems: "center",
    width: 36,
    height: 24,
  },
  mcDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.9,
  },
  cardMid: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  balLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  balance: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#fff",
    letterSpacing: -0.5,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "rgba(255,255,255,0.95)",
  },
  cardBottom: {},
  limitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  limitText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
  },
  progressBg: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 2,
  },
  shimmer1: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: -20,
    top: -30,
  },
  shimmer2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    left: -10,
    bottom: -30,
  },
  toggleRow: {
    alignItems: "center",
    paddingVertical: 12,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.25)",
  },
  toggleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.primary,
  },
});

// ─── Overview panel styles ────────────────────────────────────────────────────

const ov = StyleSheet.create({
  panel: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
    marginBottom: 8,
  },
  rewardsRow: {
    flexDirection: "row",
    paddingVertical: 14,
  },
  rewardItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  rewardIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(74,222,170,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rewardLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  rewardValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.positive,
  },
  rewardDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 16,
  },
  lastPayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  lastPayLeft: {
    flex: 1,
    gap: 2,
  },
  lastPayLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  lastPayAmt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.positive,
  },
  lastPayRight: {
    alignItems: "flex-end",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 1.5,
    borderColor: "rgba(26,16,63,0.5)",
  },
  dotOverflow: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: Colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(26,16,63,0.5)",
  },
  dotOverflowText: {
    fontFamily: "Inter_700Bold",
    fontSize: 7,
    color: "#fff",
  },
});
