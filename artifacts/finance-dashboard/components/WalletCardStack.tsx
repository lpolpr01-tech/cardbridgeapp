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

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = 190;
const COLLAPSED_PEEK = 22;
const EXPANDED_GAP = CARD_HEIGHT + 16;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
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

type Props = {
  cards: Card[];
  transactionCounts: Record<string, number>;
};

export function WalletCardStack({ cards, transactionCounts }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const animations = useRef(cards.map(() => new Animated.Value(0))).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const collapsedOffsets = cards.map((_, i) => i * COLLAPSED_PEEK);

  const expand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExpanded(true);
    Animated.spring(expandAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }, [expandAnim]);

  const collapse = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(false);
    Animated.spring(expandAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [expandAnim]);

  const handleCardTap = useCallback(
    (card: Card, index: number) => {
      if (!expanded) {
        expand();
        return;
      }
      Haptics.selectionAsync();
      router.push({ pathname: "/card-detail/[id]", params: { id: card.id } });
    },
    [expanded, expand]
  );

  const totalHeight = expanded
    ? CARD_HEIGHT + (cards.length - 1) * (CARD_HEIGHT + 16) + 60
    : CARD_HEIGHT + (cards.length - 1) * COLLAPSED_PEEK + 20;

  return (
    <View style={{ height: totalHeight }}>
      {[...cards].reverse().map((card, reversedIndex) => {
        const index = cards.length - 1 - reversedIndex;

        const collapsedY = collapsedOffsets[index];
        const expandedY = index * EXPANDED_GAP;

        const translateY = expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [collapsedY, expandedY],
        });

        const scale = expanded
          ? 1
          : expandAnim.interpolate({
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
              onPress={() => handleCardTap(card, index)}
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
                      <Feather
                        name="arrow-right"
                        size={13}
                        color="rgba(255,255,255,0.9)"
                      />
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

      <Animated.View
        style={[
          styles.toggleRow,
          {
            top: expanded
              ? CARD_HEIGHT + (cards.length - 1) * EXPANDED_GAP + 16
              : CARD_HEIGHT + (cards.length - 1) * COLLAPSED_PEEK + 4,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={expanded ? collapse : expand}
          style={({ pressed }) => [
            styles.toggleBtn,
            pressed && { opacity: 0.75 },
          ]}
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
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
