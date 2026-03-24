import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
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
import {
  useTheme,
  THEMES,
  PATTERNS,
  CARD_STYLES,
  type CardStyle,
  type PatternName,
  type ThemeName,
} from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const CARD_GRADIENTS: Record<string, [string, string]> = {
  "card-1": ["#6C3DB8", "#9B5CF5"],
  "card-2": ["#1E5FAD", "#3E8EDD"],
  "card-3": ["#2A7A5B", "#3EC48A"],
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

// ─── Classic Card Chip ────────────────────────────────────────────────────────

function ClassicChip() {
  return (
    <View style={chip.outer}>
      <View style={chip.inner} />
      <View style={chip.lineH} />
      <View style={chip.lineV} />
    </View>
  );
}

// ─── Card Logo ────────────────────────────────────────────────────────────────

function MiniCardLogo({ type, dark }: { type: Card["type"]; dark?: boolean }) {
  const textColor = dark ? "rgba(255,255,255,0.6)" : "#fff";
  if (type === "visa") {
    return <Text style={[styles.visaLogo, { color: textColor }]}>VISA</Text>;
  }
  if (type === "mastercard") {
    return (
      <View style={styles.mcRow}>
        <View style={[styles.mcDot, { backgroundColor: dark ? "#CC001066" : "#EB001B" }]} />
        <View style={[styles.mcDot, { backgroundColor: dark ? "#D0800055" : "#F79E1B", marginLeft: -8 }]} />
      </View>
    );
  }
  return <Text style={[styles.amexLogo, { color: textColor }]}>AMEX</Text>;
}

// ─── Rainbow dot ──────────────────────────────────────────────────────────────

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
        <View key={cid} style={[ov.dot, { backgroundColor: CARD_COLORS[cid] || Colors.primary, marginLeft: i > 0 ? -3 : 0 }]} />
      ))}
      {overflow > 0 && (
        <View style={[ov.dotOverflow, { marginLeft: -3 }]}>
          <Text style={ov.dotOverflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Background Pattern ───────────────────────────────────────────────────────

function BackgroundPattern({ pattern }: { pattern: PatternName }) {
  if (pattern === "none") return null;

  const DOT_SIZE = 2;
  const GRID = 28;
  const cols = Math.ceil(width / GRID) + 1;
  const rows = 40;

  if (pattern === "dots") {
    return (
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" } as any]}>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <View
              key={`${r}-${c}`}
              style={{
                position: "absolute",
                left: c * GRID,
                top: r * GRID,
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: 1,
                backgroundColor: "rgba(255,255,255,0.07)",
              }}
            />
          ))
        )}
      </View>
    );
  }

  if (pattern === "grid") {
    return (
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" } as any]}>
        {Array.from({ length: rows + 1 }).map((_, r) => (
          <View key={`h-${r}`} style={{ position: "absolute", left: 0, right: 0, top: r * GRID, height: 1, backgroundColor: "rgba(255,255,255,0.04)" }} />
        ))}
        {Array.from({ length: cols }).map((_, c) => (
          <View key={`v-${c}`} style={{ position: "absolute", top: 0, bottom: 0, left: c * GRID, width: 1, backgroundColor: "rgba(255,255,255,0.04)" }} />
        ))}
      </View>
    );
  }

  if (pattern === "lines") {
    return (
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" } as any]}>
        {Array.from({ length: rows * 2 }).map((_, r) => (
          <View
            key={r}
            style={{
              position: "absolute",
              left: -width,
              right: -width,
              top: r * 18,
              height: 1,
              backgroundColor: "rgba(255,255,255,0.04)",
              transform: [{ rotate: "-15deg" }],
            }}
          />
        ))}
      </View>
    );
  }

  return null;
}

// ─── Theme Modal ──────────────────────────────────────────────────────────────

function ThemeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, cardStyle, pattern, setTheme, setCardStyle, setPattern } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={tm.overlay}>
        <View style={[tm.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={tm.handle} />
          <View style={tm.header}>
            <Text style={tm.title}>Customize Theme</Text>
            <Pressable onPress={onClose} style={tm.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Background Color */}
            <Text style={tm.sectionLabel}>Background Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tm.swatchRow}>
              {THEMES.map((t) => (
                <Pressable
                  key={t.name}
                  onPress={() => { Haptics.selectionAsync(); setTheme(t.name); }}
                  style={[tm.swatchWrap, theme.name === t.name && tm.swatchWrapActive]}
                >
                  <LinearGradient colors={t.preview} style={tm.swatch} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <Text style={tm.swatchLabel}>{t.label}</Text>
                  {theme.name === t.name && (
                    <View style={tm.swatchCheck}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>

            {/* Pattern */}
            <Text style={tm.sectionLabel}>Background Pattern</Text>
            <View style={tm.patternRow}>
              {PATTERNS.map((p) => (
                <Pressable
                  key={p.name}
                  onPress={() => { Haptics.selectionAsync(); setPattern(p.name); }}
                  style={[tm.patternBtn, pattern === p.name && tm.patternBtnActive]}
                >
                  <Text style={[tm.patternText, pattern === p.name && tm.patternTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Card Style */}
            <Text style={tm.sectionLabel}>Card Style</Text>
            <View style={tm.cardStyleRow}>
              {CARD_STYLES.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCardStyle(s.value); }}
                  style={[tm.cardStyleBtn, cardStyle === s.value && tm.cardStyleBtnActive]}
                >
                  <Feather name={s.icon} size={20} color={cardStyle === s.value ? "#fff" : Colors.textMuted} />
                  <Text style={[tm.cardStyleLabel, cardStyle === s.value && tm.cardStyleLabelActive]}>
                    {s.label}
                  </Text>
                  {cardStyle === s.value && (
                    <View style={tm.cardStyleCheck}>
                      <Feather name="check-circle" size={14} color={Colors.positive} />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            {/* Card Color (gradient mode only) */}
            {cardStyle === "gradient" && (
              <>
                <Text style={tm.sectionLabel}>Card Colors</Text>
                <View style={tm.cardColorRow}>
                  {Object.entries(CARD_GRADIENTS).map(([id, grad]) => (
                    <LinearGradient key={id} colors={grad} style={tm.cardColorPreview} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <View style={tm.cardColorInner} />
                    </LinearGradient>
                  ))}
                </View>
                <Text style={tm.cardColorNote}>Card colors are applied per card automatically</Text>
              </>
            )}

            {cardStyle === "classic" && (
              <View style={tm.classicPreview}>
                <LinearGradient colors={["#1a1a2e", "#2a2a4e"]} style={tm.classicPreviewCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <ClassicChip />
                  <Text style={tm.classicPreviewText}>VISA</Text>
                  <Text style={tm.classicPreviewNum}>•••• •••• •••• 4821</Text>
                </LinearGradient>
                <Text style={tm.cardColorNote}>Premium dark card for all cards</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = {
  cards: Card[];
  transactionCounts: Record<string, number>;
};

export function WalletCardStack({ cards, transactionCounts }: Props) {
  const { scheduledPayments } = useFinance();
  const { theme, cardStyle, pattern } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [themeVisible, setThemeVisible] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const totalCashback = cards.reduce((s, c) => s + (c.rewards.cashbackTotal ?? 0), 0);
  const totalPoints = cards.reduce((s, c) => s + (c.rewards.pointsTotal ?? 0), 0);

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
    Animated.spring(expandAnim, { toValue: 1, useNativeDriver: false, tension: 60, friction: 10 }).start();
  }, [expandAnim]);

  const collapse = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(false);
    Animated.spring(expandAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 12 }).start();
  }, [expandAnim]);

  const handleCardTap = useCallback(
    (card: Card) => {
      if (!expanded) { expand(); return; }
      Haptics.selectionAsync();
      router.push({ pathname: "/card-detail/[id]", params: { id: card.id } });
    },
    [expanded, expand]
  );

  const collapsedH = CARD_HEIGHT + (cards.length - 1) * COLLAPSED_PEEK;
  const expandedH = CARD_HEIGHT + (cards.length - 1) * EXPANDED_GAP;
  const cardAreaHeight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [collapsedH, expandedH] });

  const renderCard = (card: Card) => {
    if (cardStyle === "classic") {
      return (
        <LinearGradient
          colors={["#1a1a2e", "#2a2a4e"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardName}>{card.name}</Text>
              <Text style={styles.cardNumber}>•••• •••• •••• {card.lastFour}</Text>
            </View>
            <ClassicChip />
          </View>

          <View style={styles.cardMid}>
            <View>
              <Text style={styles.balLabel}>Balance</Text>
              <Text style={styles.balance}>{formatCurrency(card.balance)}</Text>
            </View>
            {expanded && (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/card-detail/[id]", params: { id: card.id } }); }}
                style={[styles.viewBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
              >
                <Text style={styles.viewBtnText}>View</Text>
                <Feather name="arrow-right" size={13} color="rgba(255,255,255,0.9)" />
              </Pressable>
            )}
          </View>

          <View style={styles.cardBottom}>
            <View style={styles.limitRow}>
              <Text style={styles.limitText}>Limit {formatCurrency(card.limit)}</Text>
              <MiniCardLogo type={card.type} dark />
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${Math.min((card.balance / card.limit) * 100, 100)}%` as any, backgroundColor: "rgba(255,255,255,0.5)" }]} />
            </View>
          </View>

          <View style={styles.shimmer1} />
          <View style={styles.shimmer2} />
          {/* Classic metallic line */}
          <View style={classicCard.metalLine} />
        </LinearGradient>
      );
    }

    const gradColors = CARD_GRADIENTS[card.id] ?? (card.color as [string, string]);
    return (
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardName}>{card.name}</Text>
            <Text style={styles.cardNumber}>•••• •••• •••• {card.lastFour}</Text>
          </View>
          <MiniCardLogo type={card.type} />
        </View>

        <View style={styles.cardMid}>
          <View>
            <Text style={styles.balLabel}>Balance</Text>
            <Text style={styles.balance}>{formatCurrency(card.balance)}</Text>
          </View>
          {expanded && (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/card-detail/[id]", params: { id: card.id } }); }}
              style={styles.viewBtn}
            >
              <Text style={styles.viewBtnText}>View</Text>
              <Feather name="arrow-right" size={13} color="rgba(255,255,255,0.9)" />
            </Pressable>
          )}
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.limitRow}>
            <Text style={styles.limitText}>Limit {formatCurrency(card.limit)}</Text>
            <Text style={styles.limitText}>{transactionCounts[card.id] ?? 0} transactions</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min((card.balance / card.limit) * 100, 100)}%` as any }]} />
          </View>
        </View>

        <View style={styles.shimmer1} />
        <View style={styles.shimmer2} />
      </LinearGradient>
    );
  };

  return (
    <View style={styles.outer}>
      <BackgroundPattern pattern={pattern} />

      {/* ── Card area ── */}
      <Animated.View style={{ height: cardAreaHeight, position: "relative" }}>
        {[...cards].reverse().map((card) => {
          const index = cards.findIndex((c) => c.id === card.id);
          const collapsedY = collapsedOffsets[index];
          const expandedY = index * EXPANDED_GAP;
          const translateY = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [collapsedY, expandedY] });
          const scale = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [1 - index * 0.025, 1] });
          const opacity = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [index === 0 ? 1 : 0.88, 1] });

          return (
            <Animated.View
              key={card.id}
              style={[styles.cardContainer, { transform: [{ translateY }, { scale }], opacity, zIndex: index + 1 }]}
            >
              <Pressable
                onPress={() => handleCardTap(card)}
                style={({ pressed }) => [styles.cardPressable, pressed && { opacity: 0.92 }]}
              >
                {renderCard(card)}
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* ── Toggle + Theme button row ── */}
      <View style={styles.controlRow}>
        <Pressable
          onPress={expanded ? collapse : expand}
          style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.75 }]}
        >
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.primary} />
          <Text style={styles.toggleText}>{expanded ? "Collapse cards" : "Expand all cards"}</Text>
        </Pressable>

        <Pressable
          onPress={() => { Haptics.selectionAsync(); setThemeVisible(true); }}
          style={({ pressed }) => [styles.themeBtn, pressed && { opacity: 0.7 }]}
        >
          <Feather name="sliders" size={16} color={Colors.primary} />
        </Pressable>
      </View>

      {/* ── Rewards & Last Payment Overview ── */}
      <View style={ov.panel}>
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
              <Text style={[ov.rewardValue, { color: Colors.primary }]}>{formatNumber(totalPoints)} pts</Text>
            </View>
          </View>
        </View>

        {lastPayment && (
          <>
            <View style={ov.divider} />
            <View style={ov.lastPayRow}>
              <View style={ov.lastPayLeft}>
                <Text style={ov.lastPayLabel}>Last Scheduled Payment</Text>
                <Text style={ov.lastPayAmt}>{formatCurrency(lastPaymentTotal)}</Text>
              </View>
              <PaymentDots cardIds={lastPayment.cardIds} totalCards={cards.length} />
            </View>
          </>
        )}
      </View>

      <ThemeModal visible={themeVisible} onClose={() => setThemeVisible(false)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 20 },
  cardContainer: {
    position: "absolute",
    left: 0, right: 0,
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
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff", marginBottom: 3 },
  cardNumber: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5 },
  visaLogo: { fontFamily: "Inter_700Bold", fontSize: 19, color: "#fff", fontStyle: "italic", letterSpacing: 1 },
  amexLogo: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff", letterSpacing: 2 },
  mcRow: { flexDirection: "row", alignItems: "center", width: 36, height: 24 },
  mcDot: { width: 24, height: 24, borderRadius: 12, opacity: 0.9 },
  cardMid: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  balLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  balance: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff", letterSpacing: -0.5 },
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  viewBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "rgba(255,255,255,0.95)" },
  cardBottom: {},
  limitRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  limitText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.55)" },
  progressBg: { height: 3, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 },
  shimmer1: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.06)", right: -20, top: -30 },
  shimmer2: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.04)", left: -10, bottom: -30 },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
  toggleText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
});

const classicCard = StyleSheet.create({
  metalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});

const chip = StyleSheet.create({
  outer: {
    width: 32,
    height: 24,
    borderRadius: 4,
    backgroundColor: "rgba(220,180,60,0.8)",
    borderWidth: 0.5,
    borderColor: "rgba(255,220,80,0.5)",
    position: "relative",
    overflow: "hidden",
  },
  inner: {
    position: "absolute",
    left: 6,
    top: 4,
    right: 6,
    bottom: 4,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: "rgba(180,130,0,0.5)",
  },
  lineH: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 0.5,
    backgroundColor: "rgba(180,130,0,0.4)",
  },
  lineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 0.5,
    backgroundColor: "rgba(180,130,0,0.4)",
  },
});

const ov = StyleSheet.create({
  panel: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
    marginBottom: 8,
  },
  rewardsRow: { flexDirection: "row", paddingVertical: 14 },
  rewardItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  rewardIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: "rgba(74,222,170,0.12)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rewardLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 1 },
  rewardValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.positive },
  rewardDivider: { width: 1, backgroundColor: Colors.divider, marginVertical: 8 },
  divider: { height: 1, backgroundColor: Colors.divider, marginHorizontal: 16 },
  lastPayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  lastPayLeft: { flex: 1, gap: 2 },
  lastPayLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  lastPayAmt: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.positive },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 1 },
  dot: { width: 11, height: 11, borderRadius: 5.5, borderWidth: 1.5, borderColor: "rgba(26,16,63,0.5)" },
  dotOverflow: { width: 15, height: 15, borderRadius: 7.5, backgroundColor: Colors.textMuted, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(26,16,63,0.5)" },
  dotOverflowText: { fontFamily: "Inter_700Bold", fontSize: 7, color: "#fff" },
});

const tm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: "90%" },
  handle: { width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginTop: 4 },
  swatchRow: { gap: 10, paddingBottom: 4, marginBottom: 16 },
  swatchWrap: { alignItems: "center", gap: 6, padding: 4, borderRadius: 14, borderWidth: 2, borderColor: "transparent", position: "relative" },
  swatchWrapActive: { borderColor: Colors.primary },
  swatch: { width: 52, height: 52, borderRadius: 14 },
  swatchLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, textAlign: "center", maxWidth: 56 },
  swatchCheck: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  patternRow: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  patternBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: Colors.divider },
  patternBtnActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  patternText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  patternTextActive: { color: "#fff" },
  cardStyleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  cardStyleBtn: { flex: 1, padding: 16, borderRadius: 16, alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: Colors.divider },
  cardStyleBtnActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  cardStyleLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted, textAlign: "center" },
  cardStyleLabelActive: { color: "#fff" },
  cardStyleCheck: { position: "absolute", top: 8, right: 8 },
  cardColorRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  cardColorPreview: { flex: 1, height: 40, borderRadius: 10 },
  cardColorInner: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  cardColorNote: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "center", marginBottom: 16 },
  classicPreview: { alignItems: "center", gap: 10, marginBottom: 16 },
  classicPreviewCard: { width: "100%", height: 80, borderRadius: 14, padding: 14, justifyContent: "space-between" },
  classicPreviewText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "rgba(255,255,255,0.5)", fontStyle: "italic" },
  classicPreviewNum: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1 },
});
