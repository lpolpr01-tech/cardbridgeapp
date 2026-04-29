import React, { useState, useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { SUBSCRIPTIONS } from "@/constants/subscriptions";

// ─── Types ────────────────────────────────────────────────────────────────────

type BudgetFramework = "50/30/20" | "70/20/10" | "Custom";
type GoalType = "Emergency Fund" | "Vacation" | "Debt Payoff" | "Large Purchase" | "Investment";
type DebtMethod = "Avalanche" | "Snowball";

interface BudgetGoal {
  id: string;
  name: string;
  type: GoalType;
  target: number;
  saved: number;
  targetDate: string;
}

// ─── Category mapping ─────────────────────────────────────────────────────────

const NEEDS_CATS = ["Housing", "Utilities", "Groceries", "Transport", "Insurance", "Healthcare", "Gas", "Fuel", "Pharmacy"];
const WANTS_CATS = ["Dining", "Restaurants", "Entertainment", "Shopping", "Travel", "Personal", "Electronics", "Clothing", "Beauty"];

function classify(cat: string): "needs" | "wants" | "savings" {
  const c = cat.toLowerCase();
  if (NEEDS_CATS.some((n) => c.includes(n.toLowerCase()))) return "needs";
  if (WANTS_CATS.some((w) => c.includes(w.toLowerCase()))) return "wants";
  return "wants";
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

const DONUT_R = 70;
const DONUT_STROKE = 18;
const CIRC = 2 * Math.PI * DONUT_R;

function DonutChart({ spent, saved, remaining, total }: { spent: number; saved: number; remaining: number; total: number }) {
  const spentPct  = total > 0 ? spent / total : 0;
  const savedPct  = total > 0 ? saved / total : 0;
  const remPct    = 1 - spentPct - savedPct;
  const gap = 4;

  const spentLen  = Math.max(0, CIRC * spentPct - gap);
  const savedLen  = Math.max(0, CIRC * savedPct - gap);
  const remLen    = Math.max(0, CIRC * remPct - gap);
  const spentOff  = 0;
  const savedOff  = -(CIRC * spentPct);
  const remOff    = -(CIRC * (spentPct + savedPct));

  return (
    <View style={dnt.wrap}>
      <Svg width={176} height={176} viewBox="0 0 176 176">
        <G rotation="-90" origin="88,88">
          <Circle cx={88} cy={88} r={DONUT_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={DONUT_STROKE} />
          {spentLen > 0 && (
            <Circle cx={88} cy={88} r={DONUT_R} fill="none"
              stroke="#FF6B8A" strokeWidth={DONUT_STROKE}
              strokeDasharray={`${spentLen} ${CIRC}`}
              strokeDashoffset={spentOff} strokeLinecap="round"
            />
          )}
          {savedLen > 0 && (
            <Circle cx={88} cy={88} r={DONUT_R} fill="none"
              stroke="#4ADEAA" strokeWidth={DONUT_STROKE}
              strokeDasharray={`${savedLen} ${CIRC}`}
              strokeDashoffset={savedOff} strokeLinecap="round"
            />
          )}
          {remLen > 0 && (
            <Circle cx={88} cy={88} r={DONUT_R} fill="none"
              stroke="#6C9EFF" strokeWidth={DONUT_STROKE}
              strokeDasharray={`${remLen} ${CIRC}`}
              strokeDashoffset={remOff} strokeLinecap="round"
            />
          )}
        </G>
      </Svg>
      <View style={dnt.center}>
        <Text style={dnt.pct}>{total > 0 ? Math.round(spentPct * 100) : 0}%</Text>
        <Text style={dnt.label}>spent</Text>
      </View>
    </View>
  );
}

const dnt = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", position: "relative" },
  center: { position: "absolute", alignItems: "center" },
  pct: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.textPrimary },
  label: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
});

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const capped = Math.min(pct, 100);
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${capped}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  fill:  { height: 6, borderRadius: 3 },
});

// ─── Category color helper ─────────────────────────────────────────────────────

function catColor(pct: number) {
  if (pct >= 100) return "#FF6B8A";
  if (pct >= 90)  return "#FF6B8A";
  if (pct >= 75)  return "#FBBF24";
  return "#4ADEAA";
}

// ─── Card APR data (static for beta) ─────────────────────────────────────────

const CARD_APR: Record<string, { apr: number; minPct: number }> = {
  "card-1": { apr: 21.99, minPct: 0.02 },
  "card-2": { apr: 24.99, minPct: 0.02 },
  "card-3": { apr: 17.99, minPct: 0.02 },
};

const MONTHS_LABEL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const GOAL_ICONS: Record<GoalType, string> = {
  "Emergency Fund": "shield",
  "Vacation": "sun",
  "Debt Payoff": "credit-card",
  "Large Purchase": "shopping-bag",
  "Investment": "trending-up",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function BudgetingScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { cards, transactions } = useFinance();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [monthlyIncome, setMonthlyIncome] = useState(6000);
  const [incomeInput,   setIncomeInput]   = useState("6000");
  const [framework,     setFramework]     = useState<BudgetFramework>("50/30/20");
  const [debtMethod,    setDebtMethod]    = useState<DebtMethod>("Avalanche");
  const [extraPayment,  setExtraPayment]  = useState(0);
  const [extraInput,    setExtraInput]    = useState("0");
  const [tab, setTab] = useState<"overview" | "categories" | "goals" | "debt" | "insights" | "settings">("overview");
  const [goals, setGoals] = useState<BudgetGoal[]>([
    { id: "g1", name: "Emergency Fund", type: "Emergency Fund", target: 10000, saved: 3200, targetDate: "2027-01-01" },
    { id: "g2", name: "Vacation Fund", type: "Vacation", target: 3000, saved: 850, targetDate: "2026-12-01" },
  ]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalType, setNewGoalType] = useState<GoalType>("Emergency Fund");

  // ── Monthly transactions ─────────────────────────────────────────────────
  const monthTxns = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== "debit") return false;
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const totalSpent = useMemo(() => monthTxns.reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const subTotal   = SUBSCRIPTIONS.reduce((s, x) => s + x.amount, 0);
  const totalSaved = Math.max(0, monthlyIncome - totalSpent);
  const savingsRate = monthlyIncome > 0 ? (totalSaved / monthlyIncome) * 100 : 0;

  // ── Category breakdown ────────────────────────────────────────────────────
  const catSpend = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of monthTxns) {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    }
    return map;
  }, [monthTxns]);

  const needsSpent   = useMemo(() => Object.entries(catSpend).filter(([c]) => classify(c) === "needs").reduce((s, [, v]) => s + v, 0), [catSpend]);
  const wantsSpent   = useMemo(() => Object.entries(catSpend).filter(([c]) => classify(c) === "wants").reduce((s, [, v]) => s + v, 0) + subTotal, [catSpend, subTotal]);
  const needsBudget  = monthlyIncome * 0.5;
  const wantsBudget  = monthlyIncome * 0.3;
  const savingsBudget = monthlyIncome * 0.2;

  // ── Debt payoff ───────────────────────────────────────────────────────────
  const cardDebts = useMemo(() => cards.map((c) => {
    const { apr, minPct } = CARD_APR[c.id] ?? { apr: 22, minPct: 0.02 };
    const min = Math.max(25, c.balance * minPct);
    const monthlyRate = apr / 100 / 12;
    const months = c.balance > 0 && monthlyRate > 0
      ? Math.ceil(-Math.log(1 - (c.balance * monthlyRate) / min) / Math.log(1 + monthlyRate))
      : 0;
    return { ...c, apr, min: Math.round(min), months, monthlyRate };
  }), [cards]);

  const orderedDebts = useMemo(() => {
    const copy = [...cardDebts];
    if (debtMethod === "Avalanche") copy.sort((a, b) => b.apr - a.apr);
    else copy.sort((a, b) => a.balance - b.balance);
    return copy;
  }, [cardDebts, debtMethod]);

  // ── Top spending category ─────────────────────────────────────────────────
  const topCat = useMemo(() => {
    const sorted = Object.entries(catSpend).sort((a, b) => b[1] - a[1]);
    return sorted[0] ?? ["—", 0];
  }, [catSpend]);

  const utilizationPct = useMemo(() => {
    const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
    const totalBal   = cards.reduce((s, c) => s + c.balance, 0);
    return totalLimit > 0 ? (totalBal / totalLimit) * 100 : 0;
  }, [cards]);

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth >= now.getMonth())) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  const addGoal = () => {
    if (!newGoalName || !newGoalTarget) return;
    setGoals((g) => [...g, {
      id: Date.now().toString(), name: newGoalName, type: newGoalType,
      target: parseFloat(newGoalTarget) || 0, saved: 0,
      targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }]);
    setNewGoalName(""); setNewGoalTarget(""); setShowAddGoal(false);
  };

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "categories", label: "Categories" },
    { key: "goals", label: "Goals" },
    { key: "debt", label: "Debt" },
    { key: "insights", label: "Insights" },
    { key: "settings", label: "Settings" },
  ] as const;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <LinearGradient colors={["#1E3A5F", "#2D5A8E"]} style={s.headerIcon}>
                <Feather name="bar-chart-2" size={18} color="#6C9EFF" />
              </LinearGradient>
              <View>
                <Text style={s.headerTitle}>Budgeting</Text>
                <Text style={s.headerSub}>Financial Planner</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Tab bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
            {TABS.map((t) => (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={[s.tabPill, tab === t.key && s.tabPillActive]}>
                <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Body */}
          <ScrollView showsVerticalScrollIndicator={false} style={s.body} keyboardShouldPersistTaps="handled">

            {/* ── OVERVIEW ── */}
            {tab === "overview" && (
              <>
                {/* Month selector */}
                <View style={s.monthRow}>
                  <Pressable onPress={prevMonth} style={s.monthArrow}>
                    <Feather name="chevron-left" size={18} color={Colors.textSecondary} />
                  </Pressable>
                  <Text style={s.monthLabel}>{MONTHS_LABEL[selectedMonth]} {selectedYear}</Text>
                  <Pressable onPress={nextMonth} style={s.monthArrow}>
                    <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Donut + stats */}
                <View style={s.card}>
                  <View style={s.donutRow}>
                    <DonutChart spent={totalSpent} saved={totalSaved} remaining={Math.max(0, monthlyIncome - totalSpent)} total={monthlyIncome} />
                    <View style={s.legend}>
                      {[
                        { color: "#FF6B8A", label: "Spent",     val: totalSpent },
                        { color: "#4ADEAA", label: "Saved",     val: totalSaved },
                        { color: "#6C9EFF", label: "Remaining", val: Math.max(0, monthlyIncome - totalSpent) },
                      ].map((l) => (
                        <View key={l.label} style={s.legendRow}>
                          <View style={[s.legendDot, { backgroundColor: l.color }]} />
                          <View>
                            <Text style={s.legendLabel}>{l.label}</Text>
                            <Text style={[s.legendVal, { color: l.color }]}>${l.val.toFixed(0)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* At-a-glance stats */}
                <View style={s.statsGrid}>
                  {[
                    { label: "Income",       val: `$${monthlyIncome.toLocaleString()}`,  icon: "dollar-sign",  color: Colors.positive },
                    { label: "Spent",        val: `$${totalSpent.toFixed(0)}`,            icon: "shopping-cart", color: "#FF6B8A" },
                    { label: "Saved",        val: `$${totalSaved.toFixed(0)}`,            icon: "archive",      color: "#4ADEAA" },
                    { label: "Savings Rate", val: `${savingsRate.toFixed(1)}%`,           icon: "trending-up",  color: "#6C9EFF" },
                  ].map((st) => (
                    <View key={st.label} style={s.statCard}>
                      <View style={[s.statIcon, { backgroundColor: `${st.color}18` }]}>
                        <Feather name={st.icon as any} size={15} color={st.color} />
                      </View>
                      <Text style={[s.statVal, { color: st.color }]}>{st.val}</Text>
                      <Text style={s.statLabel}>{st.label}</Text>
                    </View>
                  ))}
                </View>

                {/* 50/30/20 summary */}
                <View style={s.card}>
                  <Text style={s.sectionTitle}>50/30/20 Snapshot</Text>
                  {[
                    { label: "Needs (50%)", spent: needsSpent, budget: needsBudget, color: "#6C9EFF" },
                    { label: "Wants (30%)", spent: wantsSpent, budget: wantsBudget, color: "#C084FC" },
                    { label: "Savings (20%)", spent: Math.max(0, monthlyIncome - needsSpent - wantsSpent), budget: savingsBudget, color: "#4ADEAA" },
                  ].map((row) => {
                    const pct = row.budget > 0 ? (row.spent / row.budget) * 100 : 0;
                    return (
                      <View key={row.label} style={s.summaryRow}>
                        <View style={s.summaryRowTop}>
                          <Text style={s.summaryLabel}>{row.label}</Text>
                          <Text style={s.summaryAmt}>${row.spent.toFixed(0)} / ${row.budget.toFixed(0)}</Text>
                        </View>
                        <ProgressBar pct={pct} color={catColor(pct)} />
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── CATEGORIES ── */}
            {tab === "categories" && (
              <>
                <Text style={s.sectionHeading}>Needs — 50% Rule</Text>
                <View style={s.card}>
                  {["Housing", "Groceries", "Transport", "Utilities", "Healthcare"].map((cat) => {
                    const spent = catSpend[cat] ?? 0;
                    const budget = needsBudget / 5;
                    const pct = budget > 0 ? (spent / budget) * 100 : 0;
                    const col = catColor(pct);
                    return (
                      <View key={cat} style={s.catRow}>
                        <View style={s.catRowTop}>
                          <Text style={s.catName}>{cat}</Text>
                          <View style={[s.catPill, { backgroundColor: `${col}20`, borderColor: `${col}40` }]}>
                            <Text style={[s.catPillText, { color: col }]}>{Math.round(pct)}%</Text>
                          </View>
                        </View>
                        <View style={s.catAmts}>
                          <Text style={s.catSpent}>${spent.toFixed(0)}</Text>
                          <Text style={s.catBudget}>of ${budget.toFixed(0)}</Text>
                        </View>
                        <ProgressBar pct={pct} color={col} />
                        {s && <View style={{ height: 4 }} />}
                      </View>
                    );
                  })}
                </View>

                <Text style={s.sectionHeading}>Wants — 30% Rule</Text>
                <View style={s.card}>
                  {["Dining", "Entertainment", "Shopping", "Travel", "Subscriptions"].map((cat) => {
                    const spent = cat === "Subscriptions" ? subTotal : (catSpend[cat] ?? 0);
                    const budget = wantsBudget / 5;
                    const pct = budget > 0 ? (spent / budget) * 100 : 0;
                    const col = catColor(pct);
                    return (
                      <View key={cat} style={s.catRow}>
                        <View style={s.catRowTop}>
                          <Text style={s.catName}>{cat}</Text>
                          <View style={[s.catPill, { backgroundColor: `${col}20`, borderColor: `${col}40` }]}>
                            <Text style={[s.catPillText, { color: col }]}>{Math.round(pct)}%</Text>
                          </View>
                        </View>
                        <View style={s.catAmts}>
                          <Text style={s.catSpent}>${spent.toFixed(0)}</Text>
                          <Text style={s.catBudget}>of ${budget.toFixed(0)}</Text>
                        </View>
                        <ProgressBar pct={pct} color={col} />
                        <View style={{ height: 4 }} />
                      </View>
                    );
                  })}
                </View>

                <Text style={s.sectionHeading}>Savings & Debt — 20% Rule</Text>
                <View style={s.card}>
                  <View style={s.catRow}>
                    <View style={s.catRowTop}>
                      <Text style={s.catName}>Total Savings Target</Text>
                      <View style={[s.catPill, { backgroundColor: "rgba(74,222,170,0.15)", borderColor: "rgba(74,222,170,0.3)" }]}>
                        <Text style={[s.catPillText, { color: Colors.positive }]}>{savingsRate.toFixed(0)}%</Text>
                      </View>
                    </View>
                    <View style={s.catAmts}>
                      <Text style={s.catSpent}>${totalSaved.toFixed(0)}</Text>
                      <Text style={s.catBudget}>target ${savingsBudget.toFixed(0)}</Text>
                    </View>
                    <ProgressBar pct={savingsBudget > 0 ? (totalSaved / savingsBudget) * 100 : 0} color={catColor(savingsBudget > 0 ? (totalSaved / savingsBudget) * 100 : 0)} />
                  </View>
                </View>
              </>
            )}

            {/* ── GOALS ── */}
            {tab === "goals" && (
              <>
                {goals.map((g) => {
                  const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
                  const remaining = g.target - g.saved;
                  const monthsLeft = (() => {
                    const end = new Date(g.targetDate);
                    const now = new Date();
                    return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                  })();
                  const suggested = remaining > 0 ? remaining / monthsLeft : 0;
                  const col = catColor(pct);
                  return (
                    <View key={g.id} style={s.card}>
                      <View style={s.goalHeader}>
                        <View style={[s.goalIcon, { backgroundColor: "rgba(108,158,255,0.12)" }]}>
                          <Feather name={GOAL_ICONS[g.type] as any} size={18} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.goalName}>{g.name}</Text>
                          <Text style={s.goalType}>{g.type}</Text>
                        </View>
                        <Text style={[s.goalPct, { color: col }]}>{Math.round(pct)}%</Text>
                      </View>
                      <View style={s.goalAmts}>
                        <Text style={s.goalSaved}>${g.saved.toLocaleString()}</Text>
                        <Text style={s.goalOf}>of ${g.target.toLocaleString()}</Text>
                      </View>
                      <ProgressBar pct={pct} color={col} />
                      <View style={s.goalFooter}>
                        <Text style={s.goalHint}>💡 Save ${suggested.toFixed(0)}/mo to hit goal by {new Date(g.targetDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</Text>
                      </View>
                    </View>
                  );
                })}

                {showAddGoal ? (
                  <View style={s.card}>
                    <Text style={s.sectionTitle}>New Goal</Text>
                    <TextInput style={s.input} placeholder="Goal name" placeholderTextColor={Colors.textMuted} value={newGoalName} onChangeText={setNewGoalName} />
                    <TextInput style={s.input} placeholder="Target amount ($)" placeholderTextColor={Colors.textMuted} value={newGoalTarget} onChangeText={setNewGoalTarget} keyboardType="numeric" />
                    <View style={s.goalTypeRow}>
                      {(["Emergency Fund", "Vacation", "Debt Payoff", "Large Purchase", "Investment"] as GoalType[]).map((t) => (
                        <Pressable key={t} onPress={() => setNewGoalType(t)} style={[s.goalTypePill, newGoalType === t && s.goalTypePillActive]}>
                          <Text style={[s.goalTypeText, newGoalType === t && s.goalTypeTextActive]} numberOfLines={1}>{t}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={s.goalBtnRow}>
                      <Pressable onPress={() => setShowAddGoal(false)} style={s.cancelGoalBtn}>
                        <Text style={s.cancelGoalText}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={addGoal} style={s.addGoalBtn}>
                        <Text style={s.addGoalText}>Add Goal</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => setShowAddGoal(true)} style={[s.addGoalOutline, { marginTop: 4 }]}>
                    <Feather name="plus" size={16} color={Colors.primary} />
                    <Text style={s.addGoalOutlineText}>Add New Goal</Text>
                  </Pressable>
                )}
              </>
            )}

            {/* ── DEBT ── */}
            {tab === "debt" && (
              <>
                <View style={s.card}>
                  <Text style={s.sectionTitle}>Payoff Strategy</Text>
                  <View style={s.debtToggle}>
                    {(["Avalanche", "Snowball"] as DebtMethod[]).map((m) => (
                      <Pressable key={m} onPress={() => setDebtMethod(m)} style={[s.debtToggleBtn, debtMethod === m && s.debtToggleBtnActive]}>
                        <Text style={[s.debtToggleText, debtMethod === m && s.debtToggleTextActive]}>{m}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={s.debtMethodHint}>
                    {debtMethod === "Avalanche"
                      ? "Highest APR first — minimizes total interest paid. Mathematically optimal."
                      : "Lowest balance first — builds momentum with quick wins. Psychologically motivating."}
                  </Text>
                </View>

                <View style={s.card}>
                  <Text style={s.sectionTitle}>Extra Monthly Payment</Text>
                  <View style={s.extraRow}>
                    <Text style={s.extraLabel}>Additional budget:</Text>
                    <TextInput
                      style={s.extraInput}
                      value={extraInput}
                      onChangeText={(v) => { setExtraInput(v); setExtraPayment(parseFloat(v) || 0); }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                {orderedDebts.map((c, idx) => {
                  const extraForThis = idx === 0 ? extraPayment : 0;
                  const totalPmt = c.min + extraForThis;
                  const months = c.balance > 0 && c.monthlyRate > 0
                    ? Math.max(1, Math.ceil(-Math.log(1 - (c.balance * c.monthlyRate) / Math.max(totalPmt, c.min + 0.01)) / Math.log(1 + c.monthlyRate)))
                    : 0;
                  const totalInterest = Math.max(0, (totalPmt * months) - c.balance);
                  const utilPct = c.limit > 0 ? (c.balance / c.limit) * 100 : 0;
                  return (
                    <View key={c.id} style={s.card}>
                      <View style={s.debtCardHeader}>
                        <Text style={s.debtCardName} numberOfLines={1}>{c.name}</Text>
                        {idx === 0 && <View style={s.nextBadge}><Text style={s.nextBadgeText}>PAY NEXT</Text></View>}
                      </View>
                      <View style={s.debtGrid}>
                        {[
                          { label: "Balance", val: `$${c.balance.toFixed(0)}`, color: "#FF6B8A" },
                          { label: "APR", val: `${c.apr}%`, color: "#FBBF24" },
                          { label: "Min. Payment", val: `$${c.min}`, color: Colors.textSecondary },
                          { label: "Payoff", val: `${months} mo`, color: "#4ADEAA" },
                        ].map((st) => (
                          <View key={st.label} style={s.debtStat}>
                            <Text style={[s.debtStatVal, { color: st.color }]}>{st.val}</Text>
                            <Text style={s.debtStatLabel}>{st.label}</Text>
                          </View>
                        ))}
                      </View>
                      <ProgressBar pct={utilPct} color={catColor(utilPct)} />
                      <Text style={s.debtHint}>~${totalInterest.toFixed(0)} total interest at ${totalPmt.toFixed(0)}/mo payment</Text>
                    </View>
                  );
                })}
              </>
            )}

            {/* ── INSIGHTS ── */}
            {tab === "insights" && (
              <>
                {[
                  {
                    icon: "trending-up" as const,
                    color: "#6C9EFF",
                    title: "Top Spending Category",
                    body: `Your top category is ${topCat[0]} at $${(topCat[1] as number).toFixed(0)} this month. Financial planners recommend keeping discretionary spending under 30% of income ($${(monthlyIncome * 0.3).toFixed(0)}).`,
                  },
                  {
                    icon: "repeat" as const,
                    color: "#C084FC",
                    title: "Subscription Audit",
                    body: `You spend $${subTotal.toFixed(2)}/mo on ${SUBSCRIPTIONS.length} subscriptions ($${(subTotal * 12).toFixed(0)}/yr). Review any unused services to recapture savings.`,
                  },
                  {
                    icon: "credit-card" as const,
                    color: utilizationPct > 30 ? "#FF6B8A" : "#4ADEAA",
                    title: "Credit Utilization",
                    body: `Your current utilization is ${utilizationPct.toFixed(1)}%. ${utilizationPct > 30 ? "Above 30% — this may be reducing your score. Paying down balances can have a fast positive impact." : "Under 30% — great! Keep it there for a healthy score."}`,
                  },
                  {
                    icon: "archive" as const,
                    color: savingsRate < 20 ? "#FBBF24" : "#4ADEAA",
                    title: "Savings Rate",
                    body: `You are saving ${savingsRate.toFixed(1)}% of income this month. ${savingsRate < 10 ? "Financial planners recommend at least 20% — try cutting subscriptions or dining to boost this." : savingsRate < 20 ? "Close! Aim for 20% to build a strong financial foundation." : "Excellent! You are meeting or exceeding the recommended 20% savings rate."}`,
                  },
                  {
                    icon: "alert-circle" as const,
                    color: "#FBBF24",
                    title: "Debt-to-Income",
                    body: `Your minimum debt payments total $${cardDebts.reduce((s, c) => s + c.min, 0).toFixed(0)}/mo — ${(cardDebts.reduce((s, c) => s + c.min, 0) / monthlyIncome * 100).toFixed(1)}% of income. Financial planners recommend keeping this under 20%.`,
                  },
                ].map((ins, i) => (
                  <View key={i} style={s.insightCard}>
                    <View style={[s.insightIcon, { backgroundColor: `${ins.color}15` }]}>
                      <Feather name={ins.icon} size={18} color={ins.color} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.insightTitle}>{ins.title}</Text>
                      <Text style={s.insightBody}>{ins.body}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* ── SETTINGS ── */}
            {tab === "settings" && (
              <>
                <View style={s.card}>
                  <Text style={s.sectionTitle}>Monthly Income</Text>
                  <View style={s.incomeRow}>
                    <Text style={s.incomePrefix}>$</Text>
                    <TextInput
                      style={s.incomeInput}
                      value={incomeInput}
                      onChangeText={setIncomeInput}
                      onBlur={() => { const v = parseFloat(incomeInput); if (v > 0) setMonthlyIncome(v); }}
                      keyboardType="numeric"
                      placeholder="6000"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                <View style={s.card}>
                  <Text style={s.sectionTitle}>Budget Framework</Text>
                  {(["50/30/20", "70/20/10", "Custom"] as BudgetFramework[]).map((f) => (
                    <Pressable key={f} onPress={() => setFramework(f)} style={[s.frameworkRow, framework === f && s.frameworkRowActive]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.frameworkLabel, framework === f && { color: Colors.primary }]}>{f}</Text>
                        <Text style={s.frameworkSub}>
                          {f === "50/30/20" && "Needs 50% · Wants 30% · Savings 20%"}
                          {f === "70/20/10" && "Living 70% · Savings 20% · Giving 10%"}
                          {f === "Custom" && "Set your own category budgets"}
                        </Text>
                      </View>
                      {framework === f && <Feather name="check-circle" size={18} color={Colors.primary} />}
                    </Pressable>
                  ))}
                </View>

                <View style={s.card}>
                  <Text style={s.sectionTitle}>Budget Alerts</Text>
                  <View style={s.alertRow}>
                    <View style={[s.alertDot, { backgroundColor: Colors.positive }]} />
                    <Text style={s.alertText}>Notify when a category reaches 80% of budget</Text>
                    <View style={[s.pill, { backgroundColor: "rgba(74,222,170,0.15)" }]}>
                      <Text style={[s.pillText, { color: Colors.positive }]}>ON</Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0F0B2E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    maxHeight: "94%",
    borderTopWidth: 1,
    borderColor: "rgba(108,158,255,0.2)",
  },
  handle: { width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  tabBar: { marginBottom: 14 },
  tabBarContent: { gap: 8, paddingRight: 8 },
  tabPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tabPillActive: { backgroundColor: "rgba(108,158,255,0.2)", borderColor: "rgba(108,158,255,0.5)" },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  body: {},
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 14 },
  monthArrow: { padding: 6 },
  monthLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textPrimary, width: 160, textAlign: "center" },
  card: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 16, marginBottom: 12 },
  donutRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  legend: { gap: 16 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  legendVal: { fontFamily: "Inter_700Bold", fontSize: 15 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statCard: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 14, flex: 1, minWidth: "44%", alignItems: "center", gap: 6 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 17 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, marginBottom: 12 },
  sectionHeading: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  summaryRow: { gap: 6, marginBottom: 12 },
  summaryRowTop: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  summaryAmt: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted },
  catRow: { marginBottom: 14 },
  catRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  catName: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textPrimary },
  catPill: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  catPillText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  catAmts: { flexDirection: "row", gap: 4, marginBottom: 5 },
  catSpent: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary },
  catBudget: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  goalIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  goalName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  goalType: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  goalPct: { fontFamily: "Inter_700Bold", fontSize: 16 },
  goalAmts: { flexDirection: "row", gap: 4, marginBottom: 8, alignItems: "baseline" },
  goalSaved: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  goalOf: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  goalFooter: { marginTop: 10 },
  goalHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  goalTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  goalTypePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  goalTypePillActive: { backgroundColor: "rgba(108,158,255,0.2)", borderColor: Colors.primary },
  goalTypeText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted },
  goalTypeTextActive: { color: Colors.primary },
  goalBtnRow: { flexDirection: "row", gap: 10 },
  cancelGoalBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center" },
  cancelGoalText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  addGoalBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center" },
  addGoalText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  addGoalOutline: { borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(108,158,255,0.4)", borderStyle: "dashed", padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  addGoalOutlineText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
  debtToggle: { flexDirection: "row", gap: 10, marginBottom: 10 },
  debtToggleBtn: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  debtToggleBtnActive: { backgroundColor: "rgba(108,158,255,0.15)", borderColor: Colors.primary },
  debtToggleText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  debtToggleTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  debtMethodHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  extraRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  extraLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  extraInput: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 9, fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, width: 90, textAlign: "right" },
  debtCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  debtCardName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, flex: 1 },
  nextBadge: { backgroundColor: "rgba(108,158,255,0.18)", borderRadius: 6, borderWidth: 1, borderColor: "rgba(108,158,255,0.35)", paddingHorizontal: 8, paddingVertical: 3 },
  nextBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.primary, letterSpacing: 0.8 },
  debtGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  debtStat: { alignItems: "center", gap: 2 },
  debtStatVal: { fontFamily: "Inter_700Bold", fontSize: 14 },
  debtStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  debtHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 8 },
  insightCard: { flexDirection: "row", gap: 14, alignItems: "flex-start", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 16, marginBottom: 10 },
  insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  insightTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  insightBody: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  incomeRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14 },
  incomePrefix: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.positive },
  incomeInput: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.textPrimary, paddingVertical: 12, paddingLeft: 6 },
  frameworkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12 },
  frameworkRowActive: { backgroundColor: "rgba(108,158,255,0.08)" },
  frameworkLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  frameworkSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  pill: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  input: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 11, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary, marginBottom: 10 },
});
