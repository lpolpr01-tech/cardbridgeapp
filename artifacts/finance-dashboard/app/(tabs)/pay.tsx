import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { TransactionItem } from "@/components/TransactionItem";
import type { ScheduledPayment } from "@/context/FinanceContext";

const { width } = Dimensions.get("window");

const FILTERS = ["All", "Debit", "Credit"] as const;
type Filter = (typeof FILTERS)[number];

const CARD_COLORS: Record<string, string> = {
  "card-1": "#9B5CF5",
  "card-2": "#3E8EDD",
  "card-3": "#3EC48A",
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateDisplay(dateStr: string) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function calendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Mini Calendar (shared) ─────────────────────────────────────────────────

type MiniCalendarProps = {
  year: number;
  month: number;
  highlightedDays?: Set<number>;
  dotMap?: Record<number, string[]>;
  selectedDay?: number | null;
  onDayPress?: (day: number) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
};

function MiniCalendar({
  year,
  month,
  highlightedDays = new Set(),
  dotMap = {},
  selectedDay,
  onDayPress,
  onPrevMonth,
  onNextMonth,
}: MiniCalendarProps) {
  const cells = calendarDays(year, month);
  const cellWidth = Math.floor((width - 80) / 7);

  return (
    <View style={cal.wrap}>
      <View style={cal.header}>
        {onPrevMonth ? (
          <Pressable onPress={onPrevMonth} style={cal.navBtn}>
            <Feather name="chevron-left" size={18} color={Colors.textPrimary} />
          </Pressable>
        ) : <View style={cal.navBtn} />}
        <Text style={cal.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
        {onNextMonth ? (
          <Pressable onPress={onNextMonth} style={cal.navBtn}>
            <Feather name="chevron-right" size={18} color={Colors.textPrimary} />
          </Pressable>
        ) : <View style={cal.navBtn} />}
      </View>

      {/* Day-of-week header */}
      <View style={cal.dowRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={[cal.dowCell, { width: cellWidth }]}>{d}</Text>
        ))}
      </View>

      {/* Separator */}
      <View style={cal.separator} />

      {/* Day grid */}
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          const isHighlighted = day !== null && highlightedDays.has(day);
          const isSelected = day !== null && day === selectedDay;
          const dots = day !== null ? (dotMap[day] ?? []) : [];

          return (
            <View
              key={idx}
              style={[cal.cell, { width: cellWidth }]}
            >
              {day !== null ? (
                <Pressable
                  onPress={() => onDayPress && onDayPress(day)}
                  style={({ pressed }) => [
                    cal.dayBtn,
                    isSelected && cal.dayBtnSelected,
                    isHighlighted && !isSelected && cal.dayBtnHighlighted,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[
                    cal.dayText,
                    isSelected && cal.dayTextSelected,
                    isHighlighted && !isSelected && cal.dayTextHighlighted,
                  ]}>
                    {day}
                  </Text>
                  {dots.length > 0 && (
                    <View style={cal.dotsRow}>
                      {dots.slice(0, 3).map((color, di) => (
                        <View key={di} style={[cal.dot, { backgroundColor: color }]} />
                      ))}
                    </View>
                  )}
                </Pressable>
              ) : null}

              {/* Vertical line divider between cells (not last in row) */}
              {(idx + 1) % 7 !== 0 && day !== null && cells[idx + 1] !== undefined && (
                <View style={cal.colLine} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Payment Detail Modal ────────────────────────────────────────────────────

type PaymentDetailModalProps = {
  payment: ScheduledPayment | null;
  onClose: () => void;
};

function PaymentDetailModal({ payment, onClose }: PaymentDetailModalProps) {
  const { cards } = useFinance();
  const insets = useSafeAreaInsets();
  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));

  if (!payment) return null;

  const payDate = parseDate(payment.date);
  const procEndDate = addBusinessDays(payDate, 2);
  const receivedDate = addBusinessDays(payDate, 4);
  const totalAmt = Object.values(payment.amounts).reduce((s, a) => s + a, 0);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const payMonth = payDate.getMonth();
  const payYear = payDate.getFullYear();
  const payDay = payDate.getDate();

  const steps = [
    {
      label: "Payment Submitted",
      date: fmt(payDate),
      subtitle: "Your payment is sent",
      icon: "send" as const,
      color: Colors.primary,
      done: true,
    },
    {
      label: "Processing",
      date: `${fmt(payDate)} – ${fmt(procEndDate)}`,
      subtitle: "1–2 business days",
      icon: "loader" as const,
      color: "#F59E0B",
      done: false,
    },
    {
      label: "Company Receives",
      date: `By ${fmt(receivedDate)}`,
      subtitle: "2–4 business days total",
      icon: "check-circle" as const,
      color: Colors.positive,
      done: false,
    },
  ];

  return (
    <Modal visible={!!payment} animationType="slide" transparent onRequestClose={onClose}>
      <View style={pDetail.overlay}>
        <View style={[pDetail.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={pDetail.handle} />
          <View style={pDetail.header}>
            <Text style={pDetail.title}>Payment Details</Text>
            <Pressable onPress={onClose} style={pDetail.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <MiniCalendar
              year={payYear}
              month={payMonth}
              highlightedDays={new Set([payDay])}
              selectedDay={payDay}
            />

            <View style={pDetail.totalRow}>
              <Text style={pDetail.totalLabel}>Total Payment</Text>
              <Text style={pDetail.totalValue}>{formatCurrency(totalAmt)}</Text>
            </View>

            {payment.note ? (
              <Text style={pDetail.note}>{payment.note}</Text>
            ) : null}

            <Text style={pDetail.timelineTitle}>Processing Timeline</Text>

            <View style={pDetail.timeline}>
              {steps.map((step, i) => (
                <View key={i}>
                  <View style={pDetail.timelineRow}>
                    <View style={[pDetail.stepCircle, { borderColor: step.color }]}>
                      <Feather name={step.icon} size={14} color={step.color} />
                    </View>
                    <View style={pDetail.stepInfo}>
                      <View style={pDetail.stepTopRow}>
                        <Text style={pDetail.stepLabel}>{step.label}</Text>
                        <Text style={[pDetail.stepDate, { color: step.color }]}>{step.date}</Text>
                      </View>
                      <Text style={pDetail.stepSub}>{step.subtitle}</Text>
                    </View>
                  </View>
                  {i < steps.length - 1 && (
                    <View style={pDetail.timelineLine}>
                      <View style={[pDetail.timelineLineInner, { borderColor: steps[i + 1].color }]} />
                    </View>
                  )}
                </View>
              ))}
            </View>

            <Text style={pDetail.sectionLabel}>Cards in this Payment</Text>
            {payment.cardIds.map((cid) => {
              const c = cardById[cid];
              if (!c) return null;
              return (
                <View key={cid} style={pDetail.cardRow}>
                  <View style={[pDetail.cardDot, { backgroundColor: CARD_COLORS[cid] || Colors.primary }]} />
                  <Text style={pDetail.cardName}>{c.name} ···{c.lastFour}</Text>
                  <Text style={pDetail.cardAmt}>{formatCurrency(payment.amounts[cid] || 0)}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Calendar Overview Modal ─────────────────────────────────────────────────

type CalendarOverviewModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectPayment: (p: ScheduledPayment) => void;
};

function CalendarOverviewModal({ visible, onClose, onSelectPayment }: CalendarOverviewModalProps) {
  const { scheduledPayments, cards } = useFinance();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));

  const { dotMap, highlightedDays, paymentsOnDay } = useMemo(() => {
    const dots: Record<number, string[]> = {};
    const highlighted = new Set<number>();
    const onDay: Record<number, ScheduledPayment[]> = {};

    for (const sp of scheduledPayments) {
      const d = parseDate(sp.date);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        highlighted.add(day);
        onDay[day] = [...(onDay[day] ?? []), sp];
        for (const cid of sp.cardIds) {
          dots[day] = [...(dots[day] ?? []), CARD_COLORS[cid] || Colors.primary];
        }
      }
    }
    return { dotMap: dots, highlightedDays: highlighted, paymentsOnDay: onDay };
  }, [scheduledPayments, viewYear, viewMonth]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedPayments = selectedDay !== null ? (paymentsOnDay[selectedDay] ?? []) : [];

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={calOv.overlay}>
        <View style={[calOv.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={calOv.handle} />
          <View style={calOv.header}>
            <Text style={calOv.title}>Payment Calendar</Text>
            <Pressable onPress={onClose} style={calOv.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <MiniCalendar
              year={viewYear}
              month={viewMonth}
              highlightedDays={highlightedDays}
              dotMap={dotMap}
              selectedDay={selectedDay}
              onDayPress={(d) => {
                Haptics.selectionAsync();
                setSelectedDay(paymentsOnDay[d] ? d : null);
              }}
              onPrevMonth={goBack}
              onNextMonth={goNext}
            />

            {scheduledPayments.length === 0 ? (
              <View style={calOv.empty}>
                <Feather name="calendar" size={28} color={Colors.textMuted} />
                <Text style={calOv.emptyText}>No scheduled payments yet</Text>
              </View>
            ) : selectedDay !== null && selectedPayments.length > 0 ? (
              <>
                <Text style={calOv.dayHeader}>
                  {MONTH_NAMES[viewMonth]} {selectedDay}
                </Text>
                {selectedPayments.map((sp) => {
                  const total = Object.values(sp.amounts).reduce((s, a) => s + a, 0);
                  return (
                    <Pressable
                      key={sp.id}
                      onPress={() => { onClose(); onSelectPayment(sp); }}
                      style={({ pressed }) => [calOv.payCard, pressed && { opacity: 0.8 }]}
                    >
                      <View style={calOv.payCardTop}>
                        <Text style={calOv.payCardAmt}>{formatCurrency(total)}</Text>
                        {sp.note ? <Text style={calOv.payCardNote}>{sp.note}</Text> : null}
                      </View>
                      <View style={calOv.payCardCards}>
                        {sp.cardIds.map((cid) => {
                          const c = cardById[cid];
                          return c ? (
                            <View key={cid} style={calOv.payCardRow}>
                              <View style={[calOv.dot, { backgroundColor: CARD_COLORS[cid] || Colors.primary }]} />
                              <Text style={calOv.payCardName}>{c.name} ···{c.lastFour}</Text>
                              <Text style={calOv.payCardSingle}>{formatCurrency(sp.amounts[cid] || 0)}</Text>
                            </View>
                          ) : null;
                        })}
                      </View>
                      <View style={calOv.payCardFooter}>
                        <Feather name="clock" size={11} color={Colors.textMuted} />
                        <Text style={calOv.payCardEst}>
                          Est. received by {(() => { const d = addBusinessDays(parseDate(sp.date), 4); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); })()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : (
              <>
                <Text style={calOv.allHeader}>All Scheduled Payments</Text>
                {scheduledPayments.map((sp) => {
                  const total = Object.values(sp.amounts).reduce((s, a) => s + a, 0);
                  return (
                    <Pressable
                      key={sp.id}
                      onPress={() => { onClose(); onSelectPayment(sp); }}
                      style={({ pressed }) => [calOv.payCard, pressed && { opacity: 0.8 }]}
                    >
                      <View style={calOv.payCardTop}>
                        <View style={calOv.datePill}>
                          <Feather name="calendar" size={11} color={Colors.primary} />
                          <Text style={calOv.datePillText}>{formatDateDisplay(sp.date)}</Text>
                        </View>
                        <Text style={calOv.payCardAmt}>{formatCurrency(total)}</Text>
                      </View>
                      <View style={calOv.payCardCards}>
                        {sp.cardIds.map((cid) => {
                          const c = cardById[cid];
                          return c ? (
                            <View key={cid} style={calOv.payCardRow}>
                              <View style={[calOv.dot, { backgroundColor: CARD_COLORS[cid] || Colors.primary }]} />
                              <Text style={calOv.payCardName}>{c.name} ···{c.lastFour}</Text>
                              <Text style={calOv.payCardSingle}>{formatCurrency(sp.amounts[cid] || 0)}</Text>
                            </View>
                          ) : null;
                        })}
                      </View>
                    </Pressable>
                  );
                })}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Schedule New Payment Modal ──────────────────────────────────────────────

type ScheduleModalProps = {
  visible: boolean;
  onClose: () => void;
};

function ScheduleModal({ visible, onClose }: ScheduleModalProps) {
  const { cards, setPendingPayment } = useFinance();
  const [selectedCards, setSelectedCards] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [date, setDate] = useState("2026-04-15");
  const [note, setNote] = useState("");
  const insets = useSafeAreaInsets();

  const toggleCard = (id: string) => {
    Haptics.selectionAsync();
    setSelectedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCardIds = cards.filter((c) => !!selectedCards[c.id]).map((c) => c.id);

  const handleSave = () => {
    if (selectedCardIds.length === 0) {
      Alert.alert("Select Cards", "Please choose at least one card to pay.");
      return;
    }
    const amountMap: Record<string, number> = {};
    for (const id of selectedCardIds) {
      const val = parseFloat(amounts[id] || "0");
      amountMap[id] = isNaN(val) ? 0 : val;
    }
    setPendingPayment({ cardIds: selectedCardIds, date, amounts: amountMap, note });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    setSelectedCards({});
    setAmounts({});
    setNote("");
    router.push("/payment/bank-select");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sch.overlay}>
        <View style={[sch.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={sch.handle} />
          <View style={sch.header}>
            <Text style={sch.title}>Schedule Payment</Text>
            <Pressable onPress={onClose} style={sch.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={sch.sectionLabel}>Select Cards</Text>
            {cards.map((card) => {
              const selected = !!selectedCards[card.id];
              const color = CARD_COLORS[card.id] || Colors.primary;
              return (
                <Pressable
                  key={card.id}
                  onPress={() => toggleCard(card.id)}
                  style={[sch.cardRow, selected && { borderColor: `${color}88` }]}
                >
                  <View style={[sch.cardDot, { backgroundColor: color }]} />
                  <View style={sch.cardInfo}>
                    <Text style={sch.cardName}>{card.name}</Text>
                    <Text style={sch.cardSub}>
                      ···{card.lastFour} · Balance {formatCurrency(card.balance)}
                    </Text>
                  </View>
                  <View style={[sch.checkbox, selected && { backgroundColor: color, borderColor: color }]}>
                    {selected && <Feather name="check" size={12} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}

            {selectedCardIds.length > 0 && (
              <>
                <Text style={sch.sectionLabel}>Payment Amounts</Text>
                {selectedCardIds.map((id) => {
                  const card = cards.find((c) => c.id === id)!;
                  const color = CARD_COLORS[id] || Colors.primary;
                  return (
                    <View key={id} style={sch.amountRow}>
                      <View style={[sch.cardDot, { backgroundColor: color }]} />
                      <Text style={sch.amountCardName}>{card.name}</Text>
                      <View style={sch.amountInputWrap}>
                        <Text style={sch.dollarSign}>$</Text>
                        <TextInput
                          style={sch.amountInput}
                          value={amounts[id] || ""}
                          onChangeText={(v) => setAmounts((p) => ({ ...p, [id]: v }))}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            <Text style={sch.sectionLabel}>Payment Date</Text>
            <View style={sch.dateRow}>
              <Feather name="calendar" size={16} color={Colors.primary} />
              <TextInput
                style={sch.dateInput}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <Text style={sch.sectionLabel}>Note (optional)</Text>
            <TextInput
              style={sch.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Monthly minimum payment..."
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [sch.saveBtn, pressed && { opacity: 0.8 }]}
            >
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={sch.saveBtnText}>Schedule Payment</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PayScreen() {
  const { transactions, cards, scheduledPayments, totalBalance } = useFinance();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("All");
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ScheduledPayment | null>(null);

  const filtered = transactions
    .filter((t) => {
      if (filter === "All") return true;
      if (filter === "Debit") return t.type === "debit";
      return t.type === "credit";
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));
  const totalDebit = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalCredit = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TransactionItem transaction={item} card={cardById[item.cardId]} showCard />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Feather name="inbox" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        )}
        ListHeaderComponent={() => (
          <>
            {/* ── Header ── */}
            <View style={[styles.pageHeader, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={styles.pageTitle}>Pay</Text>
                <Text style={styles.pageSubtitle}>Manage & schedule payments</Text>
              </View>
              <View style={styles.headerBtns}>
                {/* Calendar overview button */}
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCalendarVisible(true);
                  }}
                  style={({ pressed }) => [styles.calBtn, pressed && { opacity: 0.7 }]}
                >
                  <Feather name="calendar" size={19} color={Colors.primary} />
                </Pressable>
                {/* Add payment button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setScheduleVisible(true);
                  }}
                  style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
                >
                  <Feather name="plus" size={26} color="#fff" />
                </Pressable>
              </View>
            </View>

            {/* ── Summary ── */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Money In</Text>
                <Text style={[styles.summaryAmt, { color: Colors.positive }]}>
                  +{formatCurrency(totalCredit)}
                </Text>
              </View>
              <View style={styles.summaryDiv} />
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Money Out</Text>
                <Text style={[styles.summaryAmt, { color: Colors.negative }]}>
                  -{formatCurrency(totalDebit)}
                </Text>
              </View>
            </View>

            {/* ── Scheduled payments ── */}
            {scheduledPayments.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Scheduled Payments</Text>
                {scheduledPayments.map((sp) => {
                  const totalAmt = Object.values(sp.amounts).reduce((s, a) => s + a, 0);
                  return (
                    <View key={sp.id} style={styles.scheduledCard}>
                      <View style={styles.scheduledTop}>
                        {/* Highlighted tappable date */}
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedPayment(sp);
                          }}
                          style={({ pressed }) => [
                            styles.datePill,
                            pressed && { opacity: 0.75 },
                          ]}
                        >
                          <Feather name="calendar" size={13} color={Colors.primary} />
                          <Text style={styles.datePillText}>{formatDateDisplay(sp.date)}</Text>
                          <View style={styles.datePillChevron}>
                            <Feather name="chevron-right" size={11} color={Colors.primary} />
                          </View>
                        </Pressable>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: sp.status === "pending" ? "rgba(108,158,255,0.15)" : "rgba(74,222,170,0.15)" },
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: sp.status === "pending" ? Colors.primary : Colors.positive },
                          ]}>
                            {sp.status === "pending" ? "Pending" : "Completed"}
                          </Text>
                        </View>
                      </View>

                      {sp.note ? <Text style={styles.scheduledNote}>{sp.note}</Text> : null}

                      <View style={styles.scheduledCards}>
                        {sp.cardIds.map((cid) => {
                          const c = cardById[cid];
                          if (!c) return null;
                          return (
                            <View key={cid} style={styles.scheduledCardRow}>
                              <View style={[styles.cardDot, { backgroundColor: CARD_COLORS[cid] || Colors.primary }]} />
                              <Text style={styles.scheduledCardName}>
                                {c.name} ···{c.lastFour}
                              </Text>
                              <Text style={styles.scheduledAmt}>
                                {formatCurrency(sp.amounts[cid] || 0)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      <View style={styles.scheduledTotalRow}>
                        <Text style={styles.scheduledTotalLabel}>Total</Text>
                        <Text style={styles.scheduledTotalValue}>{formatCurrency(totalAmt)}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* ── Transaction history header ── */}
            <View style={styles.filterRow}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <View style={styles.filters}>
                {FILTERS.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      />

      {/* ── Pay All Button ── */}
      <View style={[styles.payAllContainer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Pay All Cards",
              `This will pay all ${cards.length} cards totaling ${formatCurrency(totalBalance)} on the next billing date. Proceed?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", style: "default", onPress: () => {} },
              ]
            );
          }}
          style={({ pressed }) => [styles.payAllBtn, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={[Colors.primaryDark, "#6C9EFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payAllGrad}
          >
            <Feather name="zap" size={18} color="#fff" />
            <Text style={styles.payAllText}>Pay All Cards</Text>
            <Text style={styles.payAllAmt}>{formatCurrency(totalBalance)}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <ScheduleModal visible={scheduleVisible} onClose={() => setScheduleVisible(false)} />
      <CalendarOverviewModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onSelectPayment={(p) => setSelectedPayment(p)}
      />
      <PaymentDetailModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </LinearGradient>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  listContent: {},
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  headerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  calBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryAmt: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  summaryDiv: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  scheduledCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    gap: 10,
  },
  scheduledTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(108,158,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  datePillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  datePillChevron: {
    marginLeft: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  scheduledNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scheduledCards: { gap: 7 },
  scheduledCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  scheduledCardName: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  scheduledAmt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  scheduledTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  scheduledTotalLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
  },
  scheduledTotalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  filterRow: { marginBottom: 8, gap: 8 },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 4,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  filterBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  filterTextActive: { color: "#fff" },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 20,
  },
  empty: { paddingTop: 40, alignItems: "center", gap: 10 },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  payAllContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "rgba(26,16,63,0.9)",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  payAllBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  payAllGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  payAllText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginLeft: -28,
  },
  payAllAmt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
});

// ─── Mini Calendar styles ─────────────────────────────────────────────────────

const cal = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  dowRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  dowCell: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  cell: {
    alignItems: "center",
    marginVertical: 2,
    position: "relative",
    flexDirection: "row",
  },
  colLine: {
    position: "absolute",
    right: 0,
    top: 4,
    bottom: 4,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dayBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: "center",
    gap: 2,
  },
  dayBtnHighlighted: {
    backgroundColor: "rgba(108,158,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.35)",
  },
  dayBtnSelected: {
    backgroundColor: Colors.primaryDark,
  },
  dayText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dayTextHighlighted: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  dayTextSelected: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

// ─── Payment Detail Modal styles ──────────────────────────────────────────────

const pDetail = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1C1048",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(108,158,255,0.1)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.2)",
  },
  totalLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.primary,
  },
  note: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  timelineTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  timeline: {
    marginBottom: 20,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexShrink: 0,
    marginTop: 2,
  },
  stepInfo: {
    flex: 1,
    gap: 3,
    paddingBottom: 4,
  },
  stepTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  stepLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  stepDate: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  stepSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  timelineLine: {
    marginLeft: 15,
    paddingVertical: 4,
  },
  timelineLineInner: {
    borderLeftWidth: 2,
    borderStyle: "dashed",
    height: 22,
    marginLeft: 0,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  cardName: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  cardAmt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
});

// ─── Calendar Overview styles ─────────────────────────────────────────────────

const calOv = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1C1048",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    paddingVertical: 30,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  dayHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  allHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  payCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  payCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  datePillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.primary,
  },
  payCardAmt: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.textPrimary,
  },
  payCardNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  payCardCards: { gap: 6 },
  payCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  payCardName: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  payCardSingle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textPrimary,
  },
  payCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  payCardEst: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
});

// ─── Schedule Modal styles ────────────────────────────────────────────────────

const sch = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1E1248",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: 12,
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  amountCardName: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    minWidth: 90,
  },
  dollarSign: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  amountInput: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    minWidth: 60,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 4,
  },
  dateInput: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  noteInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 4,
    minHeight: 70,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
