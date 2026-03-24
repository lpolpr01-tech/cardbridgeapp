import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { SUBSCRIPTIONS, CARD_COLORS, type Subscription } from "@/constants/subscriptions";

const { width } = Dimensions.get("window");

type SortMode = "card" | "alpha" | "amount";
type ViewMode = "list" | "grid";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Sub Item (List) ──────────────────────────────────────────────────────────

function SubListItem({ sub, cardName, cardColor }: { sub: Subscription; cardName: string; cardColor: string }) {
  return (
    <View style={[ls.row, { borderLeftColor: cardColor }]}>
      <View style={[ls.iconWrap, { backgroundColor: `${cardColor}20` }]}>
        <Text style={ls.icon}>{sub.icon}</Text>
      </View>
      <View style={ls.info}>
        <Text style={ls.name}>{sub.name}</Text>
        <View style={ls.meta}>
          <Text style={[ls.cardTag, { color: cardColor }]}>···{cardName}</Text>
          <Text style={ls.dot}>·</Text>
          <Text style={ls.cycle}>{sub.cycle}</Text>
          <Text style={ls.dot}>·</Text>
          <Text style={ls.category}>{sub.category}</Text>
        </View>
      </View>
      <View style={ls.right}>
        <Text style={ls.amount}>{formatCurrency(sub.amount)}</Text>
        <Text style={ls.nextDate}>Next {formatDate(sub.nextDate)}</Text>
      </View>
    </View>
  );
}

// ─── Sub Item (Grid) ──────────────────────────────────────────────────────────

const GRID_COL = 2;
const GRID_GAP = 12;
const GRID_HPAD = 20;
const CARD_W = (width - GRID_HPAD * 2 - GRID_GAP) / GRID_COL;

function SubGridItem({ sub, cardColor }: { sub: Subscription; cardColor: string }) {
  return (
    <View style={[gs.card, { width: CARD_W, borderColor: `${cardColor}30` }]}>
      <LinearGradient
        colors={[`${cardColor}18`, "transparent"]}
        style={gs.grad}
      >
        <View style={[gs.iconWrap, { backgroundColor: `${cardColor}20` }]}>
          <Text style={gs.icon}>{sub.icon}</Text>
        </View>
        <Text style={gs.name} numberOfLines={1}>{sub.name}</Text>
        <Text style={gs.category}>{sub.category}</Text>
        <Text style={[gs.amount, { color: cardColor }]}>{formatCurrency(sub.amount)}</Text>
        <Text style={gs.nextDate}>Next {formatDate(sub.nextDate)}</Text>
      </LinearGradient>
    </View>
  );
}

// ─── Group header ─────────────────────────────────────────────────────────────

function CardGroupHeader({ cardId, cardName, lastFour, total, color }: {
  cardId: string; cardName: string; lastFour: string; total: number; color: string;
}) {
  return (
    <View style={[gh.wrap, { borderLeftColor: color }]}>
      <View style={gh.left}>
        <View style={[gh.dot, { backgroundColor: color }]} />
        <Text style={gh.name}>{cardName} ···{lastFour}</Text>
      </View>
      <Text style={[gh.total, { color }]}>{formatCurrency(total)}/mo</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SubscriptionsScreen() {
  const { cards } = useFinance();
  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("card");
  const [filterCard, setFilterCard] = useState<string | null>(null);

  const cardById = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);

  const sorted = useMemo<Subscription[]>(() => {
    let subs = filterCard ? SUBSCRIPTIONS.filter((s) => s.cardId === filterCard) : [...SUBSCRIPTIONS];
    if (sortMode === "alpha") subs.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === "amount") subs.sort((a, b) => b.amount - a.amount);
    else subs.sort((a, b) => a.cardId.localeCompare(b.cardId));
    return subs;
  }, [sortMode, filterCard]);

  const monthlyTotal = sorted.reduce((s, sub) => s + sub.amount, 0);

  const grouped = useMemo(() => {
    if (sortMode !== "card") return null;
    const groups: { cardId: string; subs: Subscription[] }[] = [];
    for (const sub of sorted) {
      const last = groups[groups.length - 1];
      if (last && last.cardId === sub.cardId) last.subs.push(sub);
      else groups.push({ cardId: sub.cardId, subs: [sub] });
    }
    return groups;
  }, [sorted, sortMode]);

  return (
    <LinearGradient colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]} style={s.gradient}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          <Text style={s.backText}>Cards</Text>
        </Pressable>

        <Text style={s.title}>Subscriptions</Text>

        <Pressable
          onPress={() => { Haptics.selectionAsync(); setViewMode((v) => v === "list" ? "grid" : "list"); }}
          style={({ pressed }) => [s.viewToggle, pressed && { opacity: 0.7 }]}
        >
          <Feather name={viewMode === "list" ? "grid" : "list"} size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {/* ── Summary pill ── */}
      <View style={s.summaryRow}>
        <View style={s.summaryPill}>
          <Feather name="repeat" size={13} color={Colors.primary} />
          <Text style={s.summaryText}>{sorted.length} subscriptions</Text>
          <View style={s.summaryDiv} />
          <Text style={s.summaryAmt}>{formatCurrency(monthlyTotal)}/mo</Text>
        </View>
      </View>

      {/* ── Card filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterScroll}
        style={s.filterScrollWrap}
      >
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setFilterCard(null); }}
          style={[s.filterChip, filterCard === null && s.filterChipActive]}
        >
          <Text style={[s.filterChipText, filterCard === null && s.filterChipTextActive]}>All</Text>
        </Pressable>
        {cards.map((c) => {
          const color = CARD_COLORS[c.id] || Colors.primary;
          const active = filterCard === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => { Haptics.selectionAsync(); setFilterCard(active ? null : c.id); }}
              style={[s.filterChip, active && { backgroundColor: `${color}20`, borderColor: `${color}60` }]}
            >
              <View style={[s.filterDot, { backgroundColor: color }]} />
              <Text style={[s.filterChipText, active && { color }]}>···{c.lastFour}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Sort row ── */}
      <View style={s.sortRow}>
        <Text style={s.sortLabel}>Sort:</Text>
        {(["card", "alpha", "amount"] as SortMode[]).map((mode) => {
          const labels = { card: "By Card", alpha: "A–Z", amount: "Amount" };
          return (
            <Pressable
              key={mode}
              onPress={() => { Haptics.selectionAsync(); setSortMode(mode); }}
              style={[s.sortChip, sortMode === mode && s.sortChipActive]}
            >
              <Text style={[s.sortChipText, sortMode === mode && s.sortChipTextActive]}>{labels[mode]}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === "list" ? (
          sortMode === "card" && grouped ? (
            grouped.map(({ cardId, subs }) => {
              const card = cardById[cardId];
              const color = CARD_COLORS[cardId] || Colors.primary;
              const groupTotal = subs.reduce((sum, sub) => sum + sub.amount, 0);
              return (
                <View key={cardId} style={s.group}>
                  {card && (
                    <CardGroupHeader
                      cardId={cardId}
                      cardName={card.name}
                      lastFour={card.lastFour}
                      total={groupTotal}
                      color={color}
                    />
                  )}
                  <View style={[s.groupCard, { borderColor: Colors.divider }]}>
                    {subs.map((sub, i) => (
                      <View key={sub.id}>
                        <SubListItem
                          sub={sub}
                          cardName={card?.lastFour ?? "----"}
                          cardColor={color}
                        />
                        {i < subs.length - 1 && <View style={s.sep} />}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={s.groupCard}>
              {sorted.map((sub, i) => {
                const color = CARD_COLORS[sub.cardId] || Colors.primary;
                const card = cardById[sub.cardId];
                return (
                  <View key={sub.id}>
                    <SubListItem sub={sub} cardName={card?.lastFour ?? "----"} cardColor={color} />
                    {i < sorted.length - 1 && <View style={s.sep} />}
                  </View>
                );
              })}
            </View>
          )
        ) : (
          // Grid view
          sortMode === "card" && grouped ? (
            grouped.map(({ cardId, subs }) => {
              const card = cardById[cardId];
              const color = CARD_COLORS[cardId] || Colors.primary;
              const groupTotal = subs.reduce((sum, sub) => sum + sub.amount, 0);
              return (
                <View key={cardId} style={s.group}>
                  {card && (
                    <CardGroupHeader
                      cardId={cardId}
                      cardName={card.name}
                      lastFour={card.lastFour}
                      total={groupTotal}
                      color={color}
                    />
                  )}
                  <View style={gs.row}>
                    {subs.map((sub) => (
                      <SubGridItem key={sub.id} sub={sub} cardColor={CARD_COLORS[sub.cardId] || Colors.primary} />
                    ))}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={gs.row}>
              {sorted.map((sub) => (
                <SubGridItem key={sub.id} sub={sub} cardColor={CARD_COLORS[sub.cardId] || Colors.primary} />
              ))}
            </View>
          )
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  viewToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(108,158,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.2)",
  },
  summaryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryDiv: {
    width: 1,
    height: 14,
    backgroundColor: Colors.divider,
  },
  summaryAmt: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  filterScrollWrap: {
    maxHeight: 44,
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  filterChipActive: {
    backgroundColor: "rgba(108,158,255,0.12)",
    borderColor: "rgba(108,158,255,0.4)",
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  filterChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sortLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginRight: 2,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  sortChipActive: {
    backgroundColor: "rgba(108,158,255,0.15)",
    borderColor: "rgba(108,158,255,0.4)",
  },
  sortChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
  },
  sortChipTextActive: {
    color: Colors.primary,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  group: {
    gap: 8,
  },
  groupCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sep: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 16,
  },
});

// ─── List item styles ─────────────────────────────────────────────────────────

const ls = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    borderLeftWidth: 3,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardTag: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  dot: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  cycle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  category: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  right: {
    alignItems: "flex-end",
    gap: 3,
    flexShrink: 0,
  },
  amount: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  nextDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
});

// ─── Grid item styles ─────────────────────────────────────────────────────────

const gs = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  grad: {
    padding: 14,
    gap: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  icon: {
    fontSize: 22,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  category: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  amount: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginTop: 4,
  },
  nextDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
  },
});

// ─── Group header styles ──────────────────────────────────────────────────────

const gh = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 12,
    borderLeftWidth: 3,
    paddingVertical: 4,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  total: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
});
