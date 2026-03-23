import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { TransactionItem } from "@/components/TransactionItem";
import type { Transaction } from "@/context/FinanceContext";

// ─── Billing data (matches card-detail/[id].tsx) ─────────────────────────────

const BILLING: Record<string, { openDay: number; closeDay: number }> = {
  "card-1": { openDay: 1,  closeDay: 30 },
  "card-2": { openDay: 5,  closeDay: 2  },
  "card-3": { openDay: 10, closeDay: 7  },
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Cycle helpers ────────────────────────────────────────────────────────────

type CycleKey = { year: number; month: number }; // month = 0-based

function cycleRange(openDay: number, closeDay: number, year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month, openDay, 0, 0, 0);
  if (closeDay >= openDay) {
    return { start, end: new Date(year, month, closeDay, 23, 59, 59) };
  }
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear  = month === 11 ? year + 1 : year;
  return { start, end: new Date(nextYear, nextMonth, closeDay, 23, 59, 59) };
}

/** Which cycle-start month/year does a given date fall in? */
function cycleKeyForDate(d: Date, openDay: number, closeDay: number): CycleKey {
  for (let delta = 0; delta <= 1; delta++) {
    const month = d.getMonth() - delta;
    const year  = month < 0 ? d.getFullYear() - 1 : d.getFullYear();
    const m     = ((month % 12) + 12) % 12;
    const { start, end } = cycleRange(openDay, closeDay, year, m);
    if (d >= start && d <= end) return { year, month: m };
  }
  return { year: d.getFullYear(), month: d.getMonth() };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

function cycleLabel(key: CycleKey, openDay: number, closeDay: number): string {
  const { start, end } = cycleRange(openDay, closeDay, key.year, key.month);
  const startLabel = `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}`;
  const endLabel   = `${MONTH_SHORT[end.getMonth()]} ${end.getDate()}`;
  const endYear    = end.getFullYear() !== start.getFullYear() ? ` ${end.getFullYear()}` : "";
  return `${startLabel} – ${endLabel}${endYear}`;
}

// ─── Cycle Picker Modal ───────────────────────────────────────────────────────

type CycleInfo = {
  key: CycleKey;
  label: string;
  rangeLabel: string;
  count: number;
  spent: number;
  income: number;
  isCurrent: boolean;
};

function CyclePickerModal({
  visible,
  cycles,
  selectedKey,
  onSelect,
  onClose,
}: {
  visible: boolean;
  cycles: CycleInfo[];
  selectedKey: CycleKey;
  onSelect: (k: CycleKey) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  const isSelected = (k: CycleKey) =>
    k.year === selectedKey.year && k.month === selectedKey.month;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={cp.overlay}>
        <View style={[cp.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={cp.handle} />
          <View style={cp.header}>
            <Text style={cp.title}>Billing Cycles</Text>
            <Pressable onPress={onClose} style={cp.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
            {cycles.map((cycle) => (
              <Pressable
                key={`${cycle.key.year}-${cycle.key.month}`}
                onPress={() => { onSelect(cycle.key); onClose(); }}
                style={[cp.row, isSelected(cycle.key) && cp.rowActive]}
              >
                <View style={cp.rowLeft}>
                  <View style={cp.rowLabelRow}>
                    <Text style={[cp.rowMonth, isSelected(cycle.key) && cp.rowMonthActive]}>
                      {cycle.label}
                    </Text>
                    {cycle.isCurrent && (
                      <View style={cp.currentBadge}>
                        <Text style={cp.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={cp.rowRange}>{cycle.rangeLabel}</Text>
                  <Text style={cp.rowCount}>{cycle.count} transaction{cycle.count !== 1 ? "s" : ""}</Text>
                </View>
                <View style={cp.rowRight}>
                  {cycle.income > 0 && (
                    <Text style={cp.rowIncome}>+{formatCurrency(cycle.income)}</Text>
                  )}
                  {cycle.spent > 0 && (
                    <Text style={cp.rowSpent}>-{formatCurrency(cycle.spent)}</Text>
                  )}
                  {cycle.count === 0 && (
                    <Text style={cp.rowEmpty}>No activity</Text>
                  )}
                  {isSelected(cycle.key) && (
                    <Feather name="check" size={14} color={Colors.primary} style={{ marginTop: 4 }} />
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CardTransactionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { cards, transactions } = useFinance();

  const card = cards.find((c) => c.id === id);
  const billing = BILLING[id ?? ""] ?? { openDay: 1, closeDay: 30 };
  const { openDay, closeDay } = billing;

  const today = new Date();
  const currentKey = cycleKeyForDate(today, openDay, closeDay);

  const [selectedKey, setSelectedKey] = useState<CycleKey>(currentKey);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Build the last 24 cycles
  const allCycles: CycleInfo[] = useMemo(() => {
    const cardTx = transactions.filter((t) => t.cardId === id);
    const result: CycleInfo[] = [];

    for (let i = 0; i < 24; i++) {
      let month = today.getMonth() - i;
      let year  = today.getFullYear();
      while (month < 0) { month += 12; year -= 1; }
      const key: CycleKey = { year, month };
      const { start, end } = cycleRange(openDay, closeDay, year, month);

      const inCycle = cardTx.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });

      const spent  = inCycle.filter((t) => t.type === "debit").reduce((s, t) => s + Math.abs(t.amount), 0);
      const income = inCycle.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);

      const isCurrent = key.year === currentKey.year && key.month === currentKey.month;

      result.push({
        key,
        label: `${MONTH_NAMES[month]} ${year}`,
        rangeLabel: cycleLabel(key, openDay, closeDay),
        count: inCycle.length,
        spent,
        income,
        isCurrent,
      });
    }
    return result;
  }, [transactions, id, openDay, closeDay]);

  // Filter transactions for the selected cycle
  const filteredTx: Transaction[] = useMemo(() => {
    const { start, end } = cycleRange(openDay, closeDay, selectedKey.year, selectedKey.month);
    return transactions
      .filter((t) => t.cardId === id)
      .filter((t) => { const d = new Date(t.date); return d >= start && d <= end; })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, id, selectedKey, openDay, closeDay]);

  const selectedCycle = allCycles.find((c) => c.key.year === selectedKey.year && c.key.month === selectedKey.month);
  const totalSpent  = selectedCycle?.spent  ?? 0;
  const totalIncome = selectedCycle?.income ?? 0;
  const net = totalIncome - totalSpent;

  if (!card) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Card not found</Text>
      </View>
    );
  }

  const cycleRange2 = cycleRange(openDay, closeDay, selectedKey.year, selectedKey.month);
  const rangeLabel  = cycleLabel(selectedKey, openDay, closeDay);
  const isCurrentCycle = selectedKey.year === currentKey.year && selectedKey.month === currentKey.month;

  return (
    <LinearGradient colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]} style={styles.gradient}>
      {/* ── Fixed header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          <Text style={styles.backText}>{card.name}</Text>
        </Pressable>

        <Pressable
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [styles.cycleBtn, pressed && { opacity: 0.7 }]}
        >
          <Feather name="calendar" size={14} color={Colors.primary} />
          <Text style={styles.cycleBtnText}>
            {isCurrentCycle
              ? `${MONTH_SHORT[selectedKey.month]} ${selectedKey.year} (Current)`
              : `${MONTH_SHORT[selectedKey.month]} ${selectedKey.year}`}
          </Text>
          <Feather name="chevron-down" size={13} color={Colors.primary} />
        </Pressable>
      </View>

      {/* ── Cycle summary card ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryRangeLabel}>Billing cycle</Text>
            <Text style={styles.summaryRange}>{rangeLabel}</Text>
          </View>
          {isCurrentCycle && (
            <View style={styles.currentBadge}>
              <View style={styles.currentDot} />
              <Text style={styles.currentBadgeText}>Active</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={[styles.statValue, { color: Colors.negative }]}>
              -{formatCurrency(totalSpent)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: Colors.positive }]}>
              +{formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Net</Text>
            <Text style={[styles.statValue, { color: net >= 0 ? Colors.positive : Colors.negative }]}>
              {net >= 0 ? "+" : ""}{formatCurrency(net)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Count</Text>
            <Text style={styles.statValue}>{filteredTx.length}</Text>
          </View>
        </View>
      </View>

      {/* ── Transaction list ── */}
      <FlatList
        data={filteredTx}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <TransactionItem transaction={item} card={card} />}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptyText}>
              No activity found for this billing cycle
            </Text>
          </View>
        )}
      />

      <CyclePickerModal
        visible={pickerVisible}
        cycles={allCycles}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        onClose={() => setPickerVisible(false)}
      />
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  notFoundText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.textPrimary },
  cycleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cycleBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    gap: 14,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  summaryRangeLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  summaryRange: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  currentBadge: {
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
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.positive,
  },
  currentBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.positive,
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.divider,
  },
  list: { paddingHorizontal: 0 },
  separator: { height: 1, backgroundColor: Colors.divider, marginHorizontal: 16 },
  empty: {
    marginTop: 60,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});

// ─── Cycle Picker Styles ──────────────────────────────────────────────────────

const cp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1C1048",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: "80%",
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
  },
  rowActive: {
    backgroundColor: "rgba(108,158,255,0.12)",
    borderColor: "rgba(108,158,255,0.3)",
  },
  rowLeft: { flex: 1, gap: 3 },
  rowLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowMonth: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  rowMonthActive: { color: Colors.primary },
  currentBadge: {
    backgroundColor: "rgba(74,222,170,0.12)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(74,222,170,0.25)",
  },
  currentBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.positive },
  rowRange: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  rowCount: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  rowRight: { alignItems: "flex-end", gap: 2 },
  rowIncome: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.positive },
  rowSpent: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.negative },
  rowEmpty: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
});
