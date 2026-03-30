import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { useTheme } from "@/context/ThemeContext";
import { TransactionItem } from "@/components/TransactionItem";
import type { ScheduledPayment } from "@/context/FinanceContext";

const BG_DAMASK = require("../../assets/images/bg-damask.png");
const GLASS_INLINE = {
  backdropFilter: "blur(20px) saturate(140%)",
  boxShadow: "0px 8px 32px rgba(0,0,0,0.5), inset 0px 1px 0px rgba(180,130,255,0.12)",
} as any;

const { width } = Dimensions.get("window");

const FILTERS = ["All", "Debit", "Credit"] as const;
type Filter = (typeof FILTERS)[number];

const CARD_COLORS: Record<string, string> = {
  "card-1": "#9B5CF5",
  "card-2": "#3E8EDD",
  "card-3": "#3EC48A",
};

// ─── Crypto constants ────────────────────────────────────────────────────────

type TokenKey = "btc" | "eth" | "sol";

const CRYPTO_TOKENS: Record<TokenKey, {
  symbol: string; name: string; logo: string;
  address: string; balance: number; usdPrice: number;
  color: string; network: string;
}> = {
  btc: {
    symbol: "BTC", name: "Bitcoin", logo: "₿",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    balance: 0.2483, usdPrice: 62480,
    color: "#F7931A", network: "Bitcoin Network",
  },
  eth: {
    symbol: "ETH", name: "Ethereum", logo: "Ξ",
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    balance: 2.1547, usdPrice: 3245,
    color: "#627EEA", network: "Ethereum Mainnet",
  },
  sol: {
    symbol: "SOL", name: "Solana", logo: "◎",
    address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
    balance: 42.85, usdPrice: 142,
    color: "#9945FF", network: "Solana Mainnet",
  },
};

const GAS_FEES: Record<TokenKey, { usd: number; level: "low" | "moderate" | "high" }> = {
  btc: { usd: 8.50,  level: "moderate" },
  eth: { usd: 32.40, level: "high"     },
  sol: { usd: 0.002, level: "low"      },
};

const GAS_COLOR: Record<string, string> = {
  low: Colors.positive,
  moderate: "#F59E0B",
  high: Colors.negative,
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
  dueMap?: Record<number, string[]>;    // day → card colors (solid border)
  closeMap?: Record<number, string[]>; // day → card colors (dashed border)
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
  dueMap = {},
  closeMap = {},
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
          const isDue = day !== null && !!dueMap[day];
          const isClose = day !== null && !!closeMap[day];
          const dueColor = isDue ? (dueMap[day][0] || Colors.primary) : undefined;
          const closeColor = isClose ? (closeMap[day][0] || Colors.primary) : undefined;
          // Payment circle: gradient if multiple colors, else solid
          const payBg = isHighlighted && !isSelected
            ? (dots.length > 1 ? undefined : dots[0])
            : undefined;

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
                    isHighlighted && !isSelected && payBg
                      ? { backgroundColor: `${payBg}55`, borderWidth: 1.5, borderColor: payBg, borderStyle: "solid" }
                      : isHighlighted && !isSelected && dots.length > 1
                      ? { backgroundColor: "rgba(108,158,255,0.2)", borderWidth: 1.5, borderColor: Colors.primary, borderStyle: "solid" }
                      : isHighlighted && !isSelected
                      ? cal.dayBtnHighlighted
                      : null,
                    isDue && !isHighlighted && !isSelected
                      ? { borderWidth: 1.5, borderColor: dueColor, borderStyle: "solid" }
                      : null,
                    isClose && !isHighlighted && !isSelected && !isDue
                      ? { borderWidth: 1.5, borderColor: closeColor, borderStyle: "dashed" }
                      : null,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[
                    cal.dayText,
                    isSelected && cal.dayTextSelected,
                    isHighlighted && !isSelected && { color: dots[0] || Colors.primary, fontFamily: "Inter_700Bold" },
                    isDue && !isHighlighted && !isSelected && { color: dueColor, fontFamily: "Inter_600SemiBold" },
                    isClose && !isHighlighted && !isSelected && !isDue && { color: closeColor },
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
                  {/* Due or close marker when no payment */}
                  {!isHighlighted && (isDue || isClose) && (
                    <View style={cal.dotsRow}>
                      {isDue && <View style={[cal.dot, { backgroundColor: dueColor }]} />}
                      {isClose && <View style={[cal.dot, { backgroundColor: closeColor, opacity: 0.6 }]} />}
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

      {/* Legend */}
      <View style={cal.legend}>
        <View style={cal.legendItem}>
          <View style={[cal.legendDot, { backgroundColor: Colors.primary }]} />
          <Text style={cal.legendText}>Payment</Text>
        </View>
        <View style={cal.legendItem}>
          <View style={[cal.legendBorder, { borderColor: "#9B5CF5", borderStyle: "solid" }]} />
          <Text style={cal.legendText}>Due Date</Text>
        </View>
        <View style={cal.legendItem}>
          <View style={[cal.legendBorder, { borderColor: "#F59E0B", borderStyle: "dashed" }]} />
          <Text style={cal.legendText}>Statement Close</Text>
        </View>
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
  const { cards, cancelScheduledPayment } = useFinance();
  const insets = useSafeAreaInsets();
  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));

  if (!payment) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const payDate = parseDate(payment.date);
  const businessDaysAway = (() => {
    let d = new Date(today);
    let count = 0;
    while (d < payDate) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  })();
  const isPast = payDate < today;
  const isProcessing = !isPast && businessDaysAway <= 2;
  const canCancel = !isPast && !isProcessing;

  const handleCancel = () => {
    Alert.alert(
      "Cancel Payment",
      "Are you sure you want to cancel this scheduled payment? This action cannot be undone.",
      [
        { text: "Keep Payment", style: "cancel" },
        {
          text: "Cancel Payment",
          style: "destructive",
          onPress: () => {
            cancelScheduledPayment(payment.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onClose();
          },
        },
      ]
    );
  };

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

            {/* ── Cancel / Status section ── */}
            <View style={pDetail.cancelSection}>
              {isPast ? (
                <View style={pDetail.statusRow}>
                  <Feather name="check-circle" size={15} color={Colors.positive} />
                  <Text style={[pDetail.statusText, { color: Colors.positive }]}>
                    Payment completed
                  </Text>
                </View>
              ) : isProcessing ? (
                <View style={pDetail.processingBanner}>
                  <Feather name="loader" size={14} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={pDetail.processingTitle}>Payment In Processing</Text>
                    <Text style={pDetail.processingSubtitle}>
                      Within 2 business days — cancellation is no longer available
                    </Text>
                  </View>
                </View>
              ) : canCancel ? (
                <Pressable
                  onPress={handleCancel}
                  style={({ pressed }) => [pDetail.cancelBtn, pressed && { opacity: 0.8 }]}
                >
                  <Feather name="x-circle" size={16} color={Colors.negative} />
                  <Text style={pDetail.cancelBtnText}>Cancel Payment</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Billing data for calendar markers ────────────────────────────────────────

const BILLING_DATA: Record<string, { dueDay: number; statementClose: number }> = {
  "card-1": { dueDay: 15, statementClose: 30 },
  "card-2": { dueDay: 20, statementClose: 2  },
  "card-3": { dueDay: 25, statementClose: 7  },
};

// ─── Calendar Overview Modal ───────────────────────────────────────────────────

type CalendarOverviewModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectPayment: (p: ScheduledPayment) => void;
};

// Month jump picker options (18 months: 6 back + current + 11 forward)
const CAL_MONTH_OPTIONS = (() => {
  const now = new Date();
  const opts: { label: string; year: number; month: number }[] = [];
  for (let i = -6; i <= 11; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return opts;
})();

function CalendarOverviewModal({ visible, onClose, onSelectPayment }: CalendarOverviewModalProps) {
  const { scheduledPayments, cards } = useFinance();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));

  const { dotMap, highlightedDays, paymentsOnDay, dueMap, closeMap } = useMemo(() => {
    const dots: Record<number, string[]> = {};
    const highlighted = new Set<number>();
    const onDay: Record<number, ScheduledPayment[]> = {};
    const due: Record<number, string[]> = {};
    const close: Record<number, string[]> = {};

    // Scheduled payments
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

    // Billing due dates and statement close dates
    for (const [cardId, bd] of Object.entries(BILLING_DATA)) {
      const color = CARD_COLORS[cardId] || Colors.primary;
      due[bd.dueDay] = [...(due[bd.dueDay] ?? []), color];
      close[bd.statementClose] = [...(close[bd.statementClose] ?? []), color];
    }

    return { dotMap: dots, highlightedDays: highlighted, paymentsOnDay: onDay, dueMap: due, closeMap: close };
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
              dueMap={dueMap}
              closeMap={closeMap}
              selectedDay={selectedDay}
              onDayPress={(d) => {
                Haptics.selectionAsync();
                setSelectedDay(paymentsOnDay[d] ? d : null);
              }}
              onPrevMonth={goBack}
              onNextMonth={goNext}
            />

            {/* Month jump picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={calOv.monthPickerRow}
              style={{ marginBottom: 12 }}
            >
              {CAL_MONTH_OPTIONS.map((opt) => {
                const active = opt.year === viewYear && opt.month === viewMonth;
                return (
                  <Pressable
                    key={`${opt.year}-${opt.month}`}
                    onPress={() => { Haptics.selectionAsync(); setViewYear(opt.year); setViewMonth(opt.month); setSelectedDay(null); }}
                    style={[calOv.monthChip, active && calOv.monthChipActive]}
                  >
                    <Text style={[calOv.monthChipText, active && calOv.monthChipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

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
  const [autoPay, setAutoPay] = useState(false);
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
    const fullNote = [autoPay ? "Auto-pay: Monthly" : "", note].filter(Boolean).join(" · ");
    setPendingPayment({ cardIds: selectedCardIds, date, amounts: amountMap, note: fullNote });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    setSelectedCards({});
    setAmounts({});
    setNote("");
    setAutoPay(false);
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

            {/* ── Auto-pay toggle (bank account only) ── */}
            <View style={sch.autoPayRow}>
              <View style={{ flex: 1 }}>
                <Text style={sch.autoPayTitle}>Auto-pay (Bank Account)</Text>
                <Text style={sch.autoPaySub}>Repeat monthly on the same date via ACH</Text>
              </View>
              <Switch
                value={autoPay}
                onValueChange={(v) => { Haptics.selectionAsync(); setAutoPay(v); }}
                trackColor={{ false: Colors.divider, true: Colors.primaryDark }}
                thumbColor={autoPay ? "#fff" : "#aaa"}
              />
            </View>
            {autoPay && (
              <View style={sch.autoPayBanner}>
                <Feather name="refresh-cw" size={13} color={Colors.primary} />
                <Text style={sch.autoPayBannerText}>
                  Payment will automatically repeat every month on the selected date. Cancel anytime from the scheduled payments list.
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [sch.saveBtn, pressed && { opacity: 0.8 }]}
            >
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={sch.saveBtnText}>{autoPay ? "Enable Auto-pay" : "Schedule Payment"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Crypto Logo ─────────────────────────────────────────────────────────────

function CryptoLogo({ token, size = 40 }: { token: TokenKey; size?: number }) {
  const t = CRYPTO_TOKENS[token];
  return (
    <View style={[cr.logoWrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${t.color}22`, borderColor: `${t.color}55` }]}>
      <Text style={[cr.logoText, { color: t.color, fontSize: size * 0.4 }]}>{t.logo}</Text>
    </View>
  );
}

// ─── Crypto Schedule Modal ────────────────────────────────────────────────────

function CryptoScheduleModal({
  visible,
  onClose,
  defaultToken,
}: { visible: boolean; onClose: () => void; defaultToken?: TokenKey }) {
  const { cards, addScheduledPayment } = useFinance();
  const insets = useSafeAreaInsets();

  // multi-token state: each token can be selected independently
  const [selectedTokens, setSelectedTokens] = useState<Record<TokenKey, boolean>>({
    btc: defaultToken === "btc" || defaultToken == null,
    eth: defaultToken === "eth",
    sol: defaultToken === "sol",
  });
  const [cryptoAmts, setCryptoAmts] = useState<Record<TokenKey, string>>({ btc: "", eth: "", sol: "" });
  const [selectedCards, setSelectedCards] = useState<Record<string, boolean>>({});
  const [cardAmounts, setCardAmounts] = useState<Record<string, string>>({});
  const [date, setDate] = useState("2026-04-15");
  const [note, setNote] = useState("");

  const activeTokenKeys = (["btc", "eth", "sol"] as TokenKey[]).filter((tk) => selectedTokens[tk]);
  const selectedCardIds  = cards.filter((c) => !!selectedCards[c.id]).map((c) => c.id);

  const totalUsd = activeTokenKeys.reduce((sum, tk) => {
    const n = parseFloat(cryptoAmts[tk] || "0") || 0;
    return sum + n * CRYPTO_TOKENS[tk].usdPrice;
  }, 0);

  const totalGas = activeTokenKeys.reduce((sum, tk) => sum + GAS_FEES[tk].usd, 0);
  const highGasTokens = activeTokenKeys.filter((tk) => GAS_FEES[tk].level === "high");

  const toggleToken = (tk: TokenKey) => {
    Haptics.selectionAsync();
    setSelectedTokens((p) => ({ ...p, [tk]: !p[tk] }));
  };
  const toggleCard = (id: string) => {
    Haptics.selectionAsync();
    setSelectedCards((p) => ({ ...p, [id]: !p[id] }));
  };

  const doSchedule = () => {
    const amtMap: Record<string, number> = {};
    for (const id of selectedCardIds) {
      const v = parseFloat(cardAmounts[id] || "0");
      amtMap[id] = isNaN(v) ? 0 : v;
    }
    const tokenSummary = activeTokenKeys
      .map((tk) => `${CRYPTO_TOKENS[tk].logo} ${cryptoAmts[tk] || "0"} ${CRYPTO_TOKENS[tk].symbol}`)
      .join(" + ");
    const cryptoNote = `${tokenSummary} → USD${note ? ` · ${note}` : ""}`;
    addScheduledPayment({ cardIds: selectedCardIds, date, amounts: amtMap, note: cryptoNote });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    setSelectedTokens({ btc: true, eth: false, sol: false });
    setCryptoAmts({ btc: "", eth: "", sol: "" });
    setSelectedCards({});
    setCardAmounts({});
    setNote("");
  };

  const handleSchedule = () => {
    if (activeTokenKeys.length === 0) {
      Alert.alert("Select Tokens", "Choose at least one crypto token.");
      return;
    }
    if (selectedCardIds.length === 0) {
      Alert.alert("Select Cards", "Choose at least one card to pay.");
      return;
    }
    const hasAmount = activeTokenKeys.some((tk) => parseFloat(cryptoAmts[tk] || "0") > 0);
    if (!hasAmount) {
      Alert.alert("Enter Amount", "Enter a crypto amount for at least one selected token.");
      return;
    }

    if (highGasTokens.length > 0) {
      const gasLines = activeTokenKeys
        .map((tk) => {
          const g = GAS_FEES[tk];
          const label = g.level === "high" ? " ⚠️ HIGH" : g.level === "moderate" ? " (moderate)" : " ✓";
          return `${CRYPTO_TOKENS[tk].logo} ${CRYPTO_TOKENS[tk].symbol}: $${g.usd.toFixed(3)}${label}`;
        })
        .join("\n");
      const highNames = highGasTokens.map((tk) => CRYPTO_TOKENS[tk].name).join(", ");

      Alert.alert(
        "⚠️ High Gas Fees Detected",
        `${highNames} currently has high network fees.\n\nEstimated fees:\n${gasLines}\n\nTotal gas: $${totalGas.toFixed(2)}\n\nDo you want to continue?`,
        [
          {
            text: "Remove Expensive Tokens",
            style: "cancel",
            onPress: () => {
              const updated = { ...selectedTokens };
              for (const tk of highGasTokens) updated[tk] = false;
              setSelectedTokens(updated);
            },
          },
          {
            text: "Continue Anyway",
            style: "destructive",
            onPress: doSchedule,
          },
        ]
      );
    } else {
      doSchedule();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={csch.overlay}>
        <View style={[csch.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={csch.handle} />
          <View style={csch.header}>
            <Text style={csch.title}>Schedule Crypto Payment</Text>
            <Pressable onPress={onClose} style={csch.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ── Multi-token selector ── */}
            <Text style={csch.label}>Select Tokens (pick one or more)</Text>
            <View style={csch.tokenRow}>
              {(["btc", "eth", "sol"] as TokenKey[]).map((tk) => {
                const t = CRYPTO_TOKENS[tk];
                const gas = GAS_FEES[tk];
                const sel = selectedTokens[tk];
                return (
                  <Pressable
                    key={tk}
                    onPress={() => toggleToken(tk)}
                    style={[csch.tokenBtn, sel && { borderColor: t.color, backgroundColor: `${t.color}18` }]}
                  >
                    <View style={csch.tokenBtnTop}>
                      <Text style={[csch.tokenLogo, { color: t.color }]}>{t.logo}</Text>
                      <View style={[csch.tokenCheck, sel && { backgroundColor: t.color, borderColor: t.color }]}>
                        {sel && <Feather name="check" size={10} color="#fff" />}
                      </View>
                    </View>
                    <Text style={[csch.tokenSymbol, sel && { color: t.color }]}>{t.symbol}</Text>
                    <View style={[csch.gasPill, { backgroundColor: `${GAS_COLOR[gas.level]}18` }]}>
                      <Text style={[csch.gasText, { color: GAS_COLOR[gas.level] }]}>
                        {gas.level === "high" ? "⚠️ " : ""}{gas.level === "low" ? `$${gas.usd.toFixed(3)}` : `$${gas.usd.toFixed(2)}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Amount per token ── */}
            {activeTokenKeys.length > 0 && (
              <>
                <Text style={csch.label}>Amount to Convert</Text>
                {activeTokenKeys.map((tk) => {
                  const t = CRYPTO_TOKENS[tk];
                  const num = parseFloat(cryptoAmts[tk] || "0") || 0;
                  return (
                    <View key={tk} style={csch.tokenAmtBlock}>
                      <View style={csch.amtRow}>
                        <View style={[csch.amtIcon, { backgroundColor: `${t.color}22` }]}>
                          <Text style={[csch.amtLogo, { color: t.color }]}>{t.logo}</Text>
                        </View>
                        <TextInput
                          style={csch.amtInput}
                          value={cryptoAmts[tk]}
                          onChangeText={(v) => setCryptoAmts((p) => ({ ...p, [tk]: v }))}
                          keyboardType="decimal-pad"
                          placeholder={`0.00 ${t.symbol}`}
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                      <View style={csch.tokenAmtMeta}>
                        {num > 0 && (
                          <Text style={csch.usdText}>≈ {formatCurrency(num * t.usdPrice)}</Text>
                        )}
                        <Text style={csch.balanceLabel}>
                          Avail: <Text style={{ color: t.color }}>{t.balance} {t.symbol}</Text>
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* ── Gas fee panel ── */}
            {activeTokenKeys.length > 0 && (
              <View style={csch.gasBanner}>
                <View style={csch.gasBannerTop}>
                  <Feather name="zap" size={14} color="#F59E0B" />
                  <Text style={csch.gasBannerTitle}>Estimated Network Fees</Text>
                  <Text style={[csch.gasBannerTotal, highGasTokens.length > 0 && { color: Colors.negative }]}>
                    ${totalGas.toFixed(2)}
                  </Text>
                </View>
                {activeTokenKeys.map((tk) => {
                  const g = GAS_FEES[tk];
                  const t = CRYPTO_TOKENS[tk];
                  return (
                    <View key={tk} style={csch.gasRow}>
                      <Text style={[csch.gasRowLogo, { color: t.color }]}>{t.logo}</Text>
                      <Text style={csch.gasRowName}>{t.symbol}</Text>
                      <View style={[csch.gasLevelBadge, { backgroundColor: `${GAS_COLOR[g.level]}18` }]}>
                        <Text style={[csch.gasLevelText, { color: GAS_COLOR[g.level] }]}>
                          {g.level.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[csch.gasRowAmt, { color: GAS_COLOR[g.level] }]}>
                        {g.level === "low" ? `$${g.usd.toFixed(3)}` : `$${g.usd.toFixed(2)}`}
                      </Text>
                      {g.level === "high" && (
                        <Pressable onPress={() => toggleToken(tk)} style={csch.gasRemoveBtn}>
                          <Feather name="x" size={12} color={Colors.negative} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
                {highGasTokens.length > 0 && (
                  <Text style={csch.gasWarning}>
                    ⚠️ High fees detected. Tap ✕ to remove expensive tokens.
                  </Text>
                )}
              </View>
            )}

            {/* ── Cards ── */}
            <Text style={csch.label}>Apply to Cards</Text>
            {cards.map((card) => {
              const selected = !!selectedCards[card.id];
              const color = CARD_COLORS[card.id] || Colors.primary;
              return (
                <Pressable
                  key={card.id}
                  onPress={() => toggleCard(card.id)}
                  style={[csch.cardRow, selected && { borderColor: color, backgroundColor: `${color}12` }]}
                >
                  <View style={[csch.dot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={csch.cardName}>{card.name}</Text>
                    <Text style={csch.cardSub}>···{card.lastFour}</Text>
                  </View>
                  {selected && (
                    <TextInput
                      style={csch.cardAmt}
                      value={cardAmounts[card.id] || ""}
                      onChangeText={(v) => setCardAmounts((p) => ({ ...p, [card.id]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="$0.00"
                      placeholderTextColor={Colors.textMuted}
                    />
                  )}
                  <View style={[csch.checkbox, selected && { backgroundColor: color, borderColor: color }]}>
                    {selected && <Feather name="check" size={11} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}

            {/* ── Date ── */}
            <Text style={csch.label}>Payment Date</Text>
            <View style={csch.dateRow}>
              <Feather name="calendar" size={16} color={Colors.primary} />
              <TextInput
                style={csch.dateInput}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* ── Note ── */}
            <Text style={csch.label}>Note (optional)</Text>
            <TextInput
              style={csch.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Pay card minimum..."
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            {/* ── Info ── */}
            <View style={csch.infoBanner}>
              <Feather name="info" size={14} color={Colors.primary} />
              <Text style={csch.infoText}>
                Each selected token is swapped to USD at market rate on the payment date. Standard ACH processing applies after conversion. Crypto payments cannot be automated.
              </Text>
            </View>

            {/* ── Total summary ── */}
            {activeTokenKeys.length > 0 && (
              <View style={csch.totalRow}>
                <Text style={csch.totalLabel}>Total Conversion</Text>
                <Text style={csch.totalVal}>{formatCurrency(totalUsd)} USD</Text>
              </View>
            )}

            <Pressable
              onPress={handleSchedule}
              style={({ pressed }) => [csch.schedBtn, pressed && { opacity: 0.8 }]}
            >
              <LinearGradient
                colors={["#7C3AED", "#4F7FFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={csch.schedBtnGrad}
              >
                <Feather name="zap" size={16} color="#fff" />
                <Text style={csch.schedBtnText}>Schedule Crypto Payment</Text>
                {highGasTokens.length > 0 && (
                  <View style={csch.schedBtnWarn}>
                    <Text style={csch.schedBtnWarnText}>⚠️</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Crypto Main Modal ────────────────────────────────────────────────────────

type SwapDir = "usdc_to_usd" | "usd_to_usdc";
type SwapStatus = "idle" | "loading" | "success" | "error";

const USDC_RATE = 1.0; // 1 USDC = $1.00 USD (scaffold; replace with live feed)
const SWAP_FEE_PCT = 0.003; // 0.3% fee

function CryptoModal({
  visible,
  onClose,
  onPayAllSuccess,
}: { visible: boolean; onClose: () => void; onPayAllSuccess?: (amt: number) => void }) {
  const { cards } = useFinance();
  const insets = useSafeAreaInsets();
  const [activeToken, setActiveToken] = useState<TokenKey>("btc");
  const [sendAddr, setSendAddr] = useState("");
  const [sendAmt, setSendAmt] = useState("");
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [view, setView] = useState<"main" | "send" | "receive" | "swap">("main");

  // Copy feedback — no Alert (Alert can freeze modal state)
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swap state
  const [swapDir, setSwapDir] = useState<SwapDir>("usdc_to_usd");
  const [swapAmt, setSwapAmt] = useState("");
  const [swapStatus, setSwapStatus] = useState<SwapStatus>("idle");

  const token = CRYPTO_TOKENS[activeToken];
  const usdValue = token.balance * token.usdPrice;
  const allTokens: TokenKey[] = ["btc", "eth", "sol"];

  // Reset all local state when closing — prevents stale state freeze
  const handleClose = () => {
    setView("main");
    setSendAddr("");
    setSendAmt("");
    setCopied(false);
    setSwapAmt("");
    setSwapStatus("idle");
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    onClose();
  };

  const handleCopyAddress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2200);
  };

  const handleSend = () => {
    if (!sendAddr || !sendAmt) {
      Alert.alert("Missing Info", "Enter a destination address and amount.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Transaction Submitted",
      `Sending ${sendAmt} ${token.symbol} to ${sendAddr.slice(0, 8)}...${sendAddr.slice(-6)}`,
      [{ text: "OK", onPress: () => { setView("main"); setSendAddr(""); setSendAmt(""); } }]
    );
  };

  // Swap logic
  const swapNum = parseFloat(swapAmt) || 0;
  const swapFee = swapNum * SWAP_FEE_PCT;
  const swapReceived = swapDir === "usdc_to_usd"
    ? (swapNum - swapFee) * USDC_RATE
    : (swapNum - swapFee) / USDC_RATE;
  const swapFromLabel = swapDir === "usdc_to_usd" ? "USDC" : "USD";
  const swapToLabel   = swapDir === "usdc_to_usd" ? "USD"  : "USDC";

  const handleSwap = () => {
    if (swapNum <= 0) {
      Alert.alert("Invalid Amount", "Enter an amount greater than zero.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSwapStatus("loading");
    setTimeout(() => {
      setSwapStatus("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1400);
  };

  const resetSwap = () => {
    setSwapAmt("");
    setSwapStatus("idle");
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <View style={cry.overlay}>
          <View style={[cry.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={cry.handle} />

            {/* Header */}
            <View style={cry.header}>
              {view !== "main" ? (
                <Pressable onPress={() => setView("main")} style={cry.backBtn}>
                  <Feather name="chevron-left" size={20} color={Colors.textPrimary} />
                  <Text style={cry.backText}>Crypto Wallet</Text>
                </Pressable>
              ) : (
                <Text style={cry.title}>Crypto Wallet</Text>
              )}
              <Pressable onPress={handleClose} style={cry.closeBtn}>
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Token tabs */}
            <View style={cry.tokenTabs}>
              {allTokens.map((tk) => {
                const t = CRYPTO_TOKENS[tk];
                return (
                  <Pressable
                    key={tk}
                    onPress={() => { Haptics.selectionAsync(); setActiveToken(tk); setView("main"); }}
                    style={[cry.tokenTab, activeToken === tk && { backgroundColor: `${t.color}22`, borderColor: `${t.color}55` }]}
                  >
                    <Text style={[cry.tokenTabLogo, { color: t.color }]}>{t.logo}</Text>
                    <Text style={[cry.tokenTabText, activeToken === tk && { color: t.color }]}>{t.symbol}</Text>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {view === "main" && (
                <>
                  {/* Balance card */}
                  <LinearGradient
                    colors={[`${token.color}33`, `${token.color}11`]}
                    style={cry.balanceCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={cry.balanceTop}>
                      <View>
                        <Text style={cry.balanceNetwork}>{token.network}</Text>
                        <Text style={cry.balanceSymbol}>{token.name}</Text>
                      </View>
                      <View style={[cry.logoCircle, { backgroundColor: `${token.color}33`, borderColor: `${token.color}66` }]}>
                        <Text style={[cry.logoGlyph, { color: token.color }]}>{token.logo}</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={[cry.balanceMain, { color: token.color }]}>
                        {token.balance} {token.symbol}
                      </Text>
                      <Text style={cry.balanceUSD}>{formatCurrency(usdValue)} USD</Text>
                    </View>
                    <View style={cry.ratePill}>
                      <Feather name="trending-up" size={11} color={token.color} />
                      <Text style={[cry.rateText, { color: token.color }]}>
                        ${token.usdPrice.toLocaleString()}/{token.symbol}
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* Address section */}
                  <View style={cry.addressSection}>
                    <Text style={cry.addressLabel}>{token.network} Address</Text>
                    <View style={cry.addressRow}>
                      <Text style={cry.addressText} numberOfLines={1} ellipsizeMode="middle">
                        {token.address}
                      </Text>
                      <Pressable onPress={handleCopyAddress} style={[cry.copyBtn, copied && { backgroundColor: "rgba(74,222,170,0.18)" }]}>
                        {copied
                          ? <Feather name="check" size={14} color={Colors.positive} />
                          : <Feather name="copy" size={14} color={Colors.primary} />}
                      </Pressable>
                    </View>
                    {copied && (
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.positive, marginTop: 4, marginLeft: 2 }}>
                        Copied to clipboard
                      </Text>
                    )}
                  </View>

                  {/* All token summary */}
                  <Text style={cry.allTokensLabel}>All Wallets</Text>
                  <View style={cry.allTokensList}>
                    {allTokens.map((tk) => {
                      const t = CRYPTO_TOKENS[tk];
                      return (
                        <Pressable
                          key={tk}
                          onPress={() => { setActiveToken(tk); Haptics.selectionAsync(); }}
                          style={[cry.tokenRow, activeToken === tk && { borderColor: `${t.color}44`, backgroundColor: `${t.color}0A` }]}
                        >
                          <View style={[cry.tokenRowIcon, { backgroundColor: `${t.color}22` }]}>
                            <Text style={[cry.tokenRowLogo, { color: t.color }]}>{t.logo}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={cry.tokenRowName}>{t.name}</Text>
                            <Text style={cry.tokenRowAddr} numberOfLines={1} ellipsizeMode="middle">
                              {t.address}
                            </Text>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={[cry.tokenRowBal, { color: t.color }]}>{t.balance} {t.symbol}</Text>
                            <Text style={cry.tokenRowUSD}>{formatCurrency(t.balance * t.usdPrice)}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Action buttons */}
                  <View style={cry.actionRow}>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setView("send"); }}
                      style={[cry.actionBtn, { borderColor: `${token.color}44` }]}
                    >
                      <Feather name="arrow-up-right" size={18} color={token.color} />
                      <Text style={[cry.actionBtnText, { color: token.color }]}>Send</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setView("receive"); }}
                      style={[cry.actionBtn, { borderColor: `${token.color}44` }]}
                    >
                      <Feather name="arrow-down-left" size={18} color={token.color} />
                      <Text style={[cry.actionBtnText, { color: token.color }]}>Receive</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); resetSwap(); setView("swap"); }}
                      style={[cry.actionBtn, { borderColor: "rgba(108,158,255,0.44)", backgroundColor: "rgba(108,158,255,0.08)" }]}
                    >
                      <Feather name="refresh-cw" size={18} color={Colors.primary} />
                      <Text style={[cry.actionBtnText, { color: Colors.primary }]}>Swap</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setScheduleVisible(true); }}
                      style={[cry.actionBtn, { borderColor: Colors.positive + "66", backgroundColor: "rgba(74,222,170,0.08)" }]}
                    >
                      <Feather name="credit-card" size={18} color={Colors.positive} />
                      <Text style={[cry.actionBtnText, { color: Colors.positive }]}>Pay Card</Text>
                    </Pressable>
                  </View>

                  {/* Schedule payment button */}
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setScheduleVisible(true); }}
                    style={({ pressed }) => [cry.schedBtn, pressed && { opacity: 0.8 }]}
                  >
                    <LinearGradient
                      colors={[token.color, `${token.color}AA`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={cry.schedBtnGrad}
                    >
                      <Feather name="zap" size={16} color="#fff" />
                      <Text style={cry.schedBtnText}>Schedule Crypto Payment</Text>
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              {view === "send" && (
                <>
                  <View style={cry.balanceCard}>
                    <View style={cry.balanceTop}>
                      <View>
                        <Text style={cry.balanceNetwork}>Sending from</Text>
                        <Text style={cry.balanceSymbol}>{token.name} Wallet</Text>
                      </View>
                      <View style={[cry.logoCircle, { backgroundColor: `${token.color}33`, borderColor: `${token.color}66` }]}>
                        <Text style={[cry.logoGlyph, { color: token.color }]}>{token.logo}</Text>
                      </View>
                    </View>
                    <Text style={cry.sendBalLabel}>Available: <Text style={{ color: token.color }}>{token.balance} {token.symbol} ({formatCurrency(usdValue)})</Text></Text>
                  </View>

                  <Text style={cry.sendLabel}>Destination Address</Text>
                  <TextInput
                    style={cry.sendInput}
                    value={sendAddr}
                    onChangeText={setSendAddr}
                    placeholder={`${token.symbol} wallet address or exchange...`}
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={cry.sendLabel}>Amount</Text>
                  <View style={cry.sendAmtRow}>
                    <TextInput
                      style={[cry.sendInput, { flex: 1 }]}
                      value={sendAmt}
                      onChangeText={setSendAmt}
                      placeholder={`0.00 ${token.symbol}`}
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                    {parseFloat(sendAmt) > 0 && (
                      <Text style={cry.sendUsd}>≈ {formatCurrency(parseFloat(sendAmt) * token.usdPrice)}</Text>
                    )}
                  </View>

                  <View style={cry.sendWarning}>
                    <Feather name="alert-triangle" size={14} color="#F59E0B" />
                    <Text style={cry.sendWarningText}>
                      Crypto transactions are irreversible. Double-check the address before sending.
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleSend}
                    style={({ pressed }) => [cry.sendBtn, { backgroundColor: token.color }, pressed && { opacity: 0.8 }]}
                  >
                    <Feather name="arrow-up-right" size={16} color="#fff" />
                    <Text style={cry.sendBtnText}>Send {token.symbol}</Text>
                  </Pressable>
                </>
              )}

              {view === "receive" && (
                <>
                  <View style={[cry.balanceCard, { alignItems: "center" }]}>
                    <View style={[cry.qrPlaceholder, { borderColor: `${token.color}44` }]}>
                      <Text style={[cry.logoGlyph, { color: token.color, fontSize: 48 }]}>{token.logo}</Text>
                      <Text style={cry.qrLabel}>QR Code</Text>
                    </View>
                    <Text style={cry.receiveNetwork}>{token.network}</Text>
                  </View>

                  <Text style={cry.sendLabel}>{token.symbol} Address</Text>
                  <View style={cry.receiveAddrBox}>
                    <Text style={cry.receiveAddr}>{token.address}</Text>
                  </View>
                  <Pressable
                    onPress={handleCopyAddress}
                    style={[cry.copyAddrBtn, copied && { backgroundColor: "rgba(74,222,170,0.15)", borderColor: "rgba(74,222,170,0.4)" }]}
                  >
                    {copied
                      ? <Feather name="check" size={15} color={Colors.positive} />
                      : <Feather name="copy" size={15} color={Colors.primary} />}
                    <Text style={[cry.copyAddrText, copied && { color: Colors.positive }]}>
                      {copied ? "Copied!" : "Copy Address"}
                    </Text>
                  </Pressable>

                  <View style={cry.sendWarning}>
                    <Feather name="info" size={14} color={Colors.primary} />
                    <Text style={cry.sendWarningText}>
                      Only send {token.symbol} on the {token.network}. Sending other assets may result in permanent loss.
                    </Text>
                  </View>
                </>
              )}

              {view === "swap" && (
                <>
                  {/* Swap header card */}
                  <LinearGradient
                    colors={["rgba(108,158,255,0.18)", "rgba(79,127,255,0.08)"]}
                    style={cry.swapHeader}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Feather name="refresh-cw" size={22} color={Colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={cry.swapHeaderTitle}>USDC ↔ USD Swap</Text>
                      <Text style={cry.swapHeaderSub}>Convert between stablecoin and cash</Text>
                    </View>
                  </LinearGradient>

                  {/* Direction toggle */}
                  <Text style={cry.sendLabel}>Direction</Text>
                  <View style={cry.swapDirRow}>
                    <Pressable
                      onPress={() => { Haptics.selectionAsync(); setSwapDir("usdc_to_usd"); resetSwap(); }}
                      style={[cry.swapDirBtn, swapDir === "usdc_to_usd" && cry.swapDirBtnActive]}
                    >
                      <Text style={[cry.swapDirText, swapDir === "usdc_to_usd" && cry.swapDirTextActive]}>USDC → USD</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { Haptics.selectionAsync(); setSwapDir("usd_to_usdc"); resetSwap(); }}
                      style={[cry.swapDirBtn, swapDir === "usd_to_usdc" && cry.swapDirBtnActive]}
                    >
                      <Text style={[cry.swapDirText, swapDir === "usd_to_usdc" && cry.swapDirTextActive]}>USD → USDC</Text>
                    </Pressable>
                  </View>

                  {swapStatus === "success" ? (
                    <View style={cry.swapSuccess}>
                      <Feather name="check-circle" size={36} color={Colors.positive} />
                      <Text style={cry.swapSuccessTitle}>Swap Complete!</Text>
                      <Text style={cry.swapSuccessAmt}>
                        {formatCurrency(swapNum)} {swapFromLabel} → {formatCurrency(swapReceived)} {swapToLabel}
                      </Text>
                      <Text style={cry.swapSuccessSub}>
                        Funds will appear in your {swapToLabel === "USD" ? "bank account" : "USDC wallet"} within 1 business day.
                      </Text>
                      <Pressable
                        onPress={() => { resetSwap(); setView("main"); }}
                        style={cry.swapDoneBtn}
                      >
                        <Text style={cry.swapDoneBtnText}>Done</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      {/* Amount input */}
                      <Text style={cry.sendLabel}>You Send ({swapFromLabel})</Text>
                      <View style={cry.swapInputRow}>
                        <Text style={cry.swapCurrLabel}>{swapFromLabel}</Text>
                        <TextInput
                          style={[cry.sendInput, { flex: 1, marginBottom: 0 }]}
                          value={swapAmt}
                          onChangeText={(v) => { setSwapAmt(v); setSwapStatus("idle"); }}
                          placeholder="0.00"
                          placeholderTextColor={Colors.textMuted}
                          keyboardType="decimal-pad"
                        />
                      </View>

                      {/* Conversion summary */}
                      {swapNum > 0 && (
                        <View style={cry.swapSummary}>
                          <View style={cry.swapSummaryRow}>
                            <Text style={cry.swapSummaryLabel}>You Receive</Text>
                            <Text style={[cry.swapSummaryVal, { color: Colors.positive }]}>
                              {formatCurrency(swapReceived)} {swapToLabel}
                            </Text>
                          </View>
                          <View style={cry.swapSummaryRow}>
                            <Text style={cry.swapSummaryLabel}>Network Fee (0.3%)</Text>
                            <Text style={cry.swapSummaryVal}>{formatCurrency(swapFee)} {swapFromLabel}</Text>
                          </View>
                          <View style={cry.swapSummaryRow}>
                            <Text style={cry.swapSummaryLabel}>Rate</Text>
                            <Text style={cry.swapSummaryVal}>1 USDC = {formatCurrency(USDC_RATE)} USD</Text>
                          </View>
                        </View>
                      )}

                      <View style={cry.sendWarning}>
                        <Feather name="info" size={14} color={Colors.primary} />
                        <Text style={cry.sendWarningText}>
                          Swaps are processed via Circle's USDC settlement network. USD arrives via ACH within 1 business day. Rates are locked at time of submission.
                        </Text>
                      </View>

                      <Pressable
                        onPress={handleSwap}
                        style={({ pressed }) => [cry.sendBtn, { backgroundColor: swapStatus === "loading" ? Colors.textMuted : Colors.primaryDark }, pressed && { opacity: 0.8 }]}
                        disabled={swapStatus === "loading"}
                      >
                        {swapStatus === "loading" ? (
                          <>
                            <Feather name="loader" size={16} color="#fff" />
                            <Text style={cry.sendBtnText}>Processing…</Text>
                          </>
                        ) : (
                          <>
                            <Feather name="refresh-cw" size={16} color="#fff" />
                            <Text style={cry.sendBtnText}>Confirm Swap</Text>
                          </>
                        )}
                      </Pressable>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CryptoScheduleModal
        visible={scheduleVisible}
        onClose={() => setScheduleVisible(false)}
        defaultToken={activeToken}
      />
    </>
  );
}

// ─── Cycle picker modal (transaction mode) ───────────────────────────────────

const TX_MONTHS = (() => {
  const now = new Date();
  const months: { label: string; year: number; month: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return months;
})();

function TxCyclePickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: { year: number; month: number } | null;
  onSelect: (v: { year: number; month: number } | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={tcp.overlay}>
        <View style={[tcp.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={tcp.handle} />
          <View style={tcp.header}>
            <Text style={tcp.title}>Filter by Month</Text>
            <Pressable onPress={onClose} style={tcp.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tcp.grid}>
            <Pressable
              onPress={() => { onSelect(null); onClose(); }}
              style={[tcp.chip, selected === null && tcp.chipActive]}
            >
              <Text style={[tcp.chipText, selected === null && tcp.chipTextActive]}>All Time</Text>
            </Pressable>
            {TX_MONTHS.map((m) => {
              const active = selected?.year === m.year && selected?.month === m.month;
              return (
                <Pressable
                  key={`${m.year}-${m.month}`}
                  onPress={() => { onSelect({ year: m.year, month: m.month }); onClose(); }}
                  style={[tcp.chip, active && tcp.chipActive]}
                >
                  <Text style={[tcp.chipText, active && tcp.chipTextActive]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const tcp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0E0828",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    maxHeight: "60%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: Colors.divider,
  },
  chipActive: { backgroundColor: "rgba(108,158,255,0.2)", borderColor: "rgba(108,158,255,0.5)" },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
});

// ─── Confetti Overlay ─────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#9B5CF5", "#6C9EFF", "#4ADEAA", "#FF6B8A", "#F59E0B", "#fff"];
const PARTICLE_COUNT = 28;

type ConfettiParticle = {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  color: string;
  size: number;
  startX: number;
};

function ConfettiOverlay({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const { width: W, height: H } = Dimensions.get("window");
  const particles = useRef<ConfettiParticle[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
      startX: (i / PARTICLE_COUNT) * W,
    }))
  ).current;

  React.useEffect(() => {
    if (!visible) return;
    particles.forEach((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(1);
      p.rotate.setValue(0);
    });
    const anims = particles.map((p) =>
      Animated.parallel([
        Animated.timing(p.x, {
          toValue: (Math.random() - 0.5) * 160,
          duration: 1400 + Math.random() * 400,
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: H * 0.6 + Math.random() * H * 0.3,
          duration: 1400 + Math.random() * 400,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: (Math.random() - 0.5) * 720,
          duration: 1400 + Math.random() * 400,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ])
    );
    Animated.parallel(anims).start();
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[confSt.wrap, { pointerEvents: "none" } as any]}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            confSt.particle,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              left: p.startX,
              top: "35%",
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { rotate: p.rotate.interpolate({ inputRange: [-720, 720], outputRange: ["-720deg", "720deg"] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const confSt = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  particle: { position: "absolute" },
});

// ─── Pay Success Overlay ───────────────────────────────────────────────────────

type PaySuccessType = "ach" | "crypto";

// ─── Receipt Modal ─────────────────────────────────────────────────────────────

function ReceiptModal({
  visible, type, amount, confirmationNum, onClose,
}: { visible: boolean; type: PaySuccessType; amount: number; confirmationNum: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const isAch = type === "ach";

  const ReceiptRow = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
    <View style={rcpt.row}>
      <Text style={rcpt.rowLabel}>{label}</Text>
      <Text style={[rcpt.rowValue, accent && { color: Colors.positive }]}>{value}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={rcpt.overlay}>
        <View style={[rcpt.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={rcpt.handle} />
          <View style={rcpt.header}>
            <View style={rcpt.headerLeft}>
              <Feather name="file-text" size={20} color={Colors.positive} />
              <Text style={rcpt.title}>Payment Receipt</Text>
            </View>
            <Pressable onPress={onClose} style={rcpt.closeBtn}>
              <Feather name="x" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={rcpt.heroSection}>
            <View style={rcpt.heroIcon}>
              <Feather name="check-circle" size={32} color={Colors.positive} />
            </View>
            <Text style={rcpt.heroAmt}>{formatCurrency(amount)}</Text>
            <Text style={rcpt.heroLabel}>{isAch ? "ACH Payment" : "Crypto Payment"}</Text>
          </View>

          <View style={rcpt.card}>
            <ReceiptRow label="Date" value={dateStr} />
            <View style={rcpt.rowDivider} />
            <ReceiptRow label="Time" value={timeStr} />
            <View style={rcpt.rowDivider} />
            <ReceiptRow label="Amount" value={formatCurrency(amount)} accent />
            <View style={rcpt.rowDivider} />
            <ReceiptRow label="Method" value={isAch ? "ACH Transfer" : "Crypto → ACH"} />
            <View style={rcpt.rowDivider} />
            <ReceiptRow label="Status" value={isAch ? "Submitted" : "Queued"} accent />
            <View style={rcpt.rowDivider} />
            <ReceiptRow label="Est. Arrival" value={isAch ? "1–4 Business Days" : "On Scheduled Date"} />
          </View>

          <View style={rcpt.confirmWrap}>
            <Text style={rcpt.confirmLabel}>Confirmation Number</Text>
            <Text style={rcpt.confirmNum}>{confirmationNum}</Text>
          </View>

          <Text style={rcpt.disclaimer}>Keep this confirmation number for your records. CardFlow will send a confirmation email within 5 minutes.</Text>

          <Pressable onPress={onClose} style={({ pressed }) => [rcpt.doneBtn, pressed && { opacity: 0.85 }]}>
            <Text style={rcpt.doneBtnText}>Close Receipt</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const rcpt = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#140D38", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: "92%" },
  handle: { width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  heroSection: { alignItems: "center", gap: 6, marginBottom: 20 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(74,222,170,0.12)", borderWidth: 1.5, borderColor: "rgba(74,222,170,0.3)", alignItems: "center", justifyContent: "center" },
  heroAmt: { fontFamily: "Inter_700Bold", fontSize: 34, color: Colors.positive, letterSpacing: -0.5 },
  heroLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  card: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13 },
  rowLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  rowValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  rowDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginHorizontal: 16 },
  confirmWrap: { backgroundColor: "rgba(108,158,255,0.08)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(108,158,255,0.2)", padding: 16, alignItems: "center", gap: 6, marginBottom: 12 },
  confirmLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  confirmNum: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.primary, letterSpacing: 2 },
  disclaimer: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "center", lineHeight: 17, marginBottom: 18, paddingHorizontal: 8 },
  doneBtn: { backgroundColor: "rgba(108,158,255,0.15)", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(108,158,255,0.3)" },
  doneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.primary },
});

function PaySuccessOverlay({
  visible,
  type,
  amount,
  confirmationNum,
  onDone,
  onViewReceipt,
}: { visible: boolean; type: PaySuccessType; amount: number; confirmationNum: string; onDone: () => void; onViewReceipt: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 120 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  const msg = type === "ach"
    ? "Payment sent via ACH. Funds arrive within 1–4 business days."
    : "Crypto payment queued. Conversion and ACH transfer will process on the scheduled date.";
  const title = type === "ach" ? "Payments Submitted!" : "Crypto Payment Queued!";

  return (
    <View style={[pSucc.backdrop, { pointerEvents: "box-none" } as any]}>
      <Animated.View style={[pSucc.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={pSucc.iconWrap}>
          <Feather name="check-circle" size={40} color={Colors.positive} />
        </View>
        <Text style={pSucc.title}>{title}</Text>
        <Text style={pSucc.amount}>{formatCurrency(amount)}</Text>
        <Text style={pSucc.msg}>{msg}</Text>

        {/* Confirmation number */}
        <View style={pSucc.confirmRow}>
          <Text style={pSucc.confirmLabel}>Confirmation</Text>
          <Text style={pSucc.confirmNum}>{confirmationNum}</Text>
        </View>

        <Pressable
          onPress={onViewReceipt}
          style={({ pressed }) => [pSucc.receiptBtn, pressed && { opacity: 0.8 }]}
        >
          <Feather name="file-text" size={14} color={Colors.primary} />
          <Text style={pSucc.receiptBtnText}>View Receipt</Text>
        </Pressable>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [pSucc.doneBtn, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={["#7C3AED", "#4F7FFF"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={pSucc.doneBtnGrad}
          >
            <Text style={pSucc.doneBtnText}>Done</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const pSucc = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#0E0828",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 12,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#9B5CF5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(74,222,170,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(74,222,170,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, textAlign: "center" },
  amount: { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.positive, letterSpacing: -0.5 },
  msg: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  confirmRow: { backgroundColor: "rgba(108,158,255,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(108,158,255,0.2)", paddingHorizontal: 14, paddingVertical: 10, alignItems: "center", gap: 3, width: "100%" },
  confirmLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  confirmNum: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.primary, letterSpacing: 1.5 },
  receiptBtn: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, borderWidth: 1, borderColor: "rgba(108,158,255,0.3)", paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "rgba(108,158,255,0.08)", width: "100%", justifyContent: "center" },
  receiptBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
  doneBtn: { borderRadius: 14, overflow: "hidden", width: "100%" },
  doneBtnGrad: { paddingVertical: 15, alignItems: "center" },
  doneBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});

// ─── Pay All Preview Modal (ACH) ──────────────────────────────────────────────

type PayAllPreviewProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cards: { id: string; name: string; lastFour: string; balance: number }[];
  totalAmount: number;
};

function PayAllPreviewModal({ visible, onClose, onConfirm, cards: cardList, totalAmount }: PayAllPreviewProps) {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const nextBillingDate = new Date(today);
  nextBillingDate.setDate(today.getDate() + ((15 - today.getDate() + 30) % 30 || 30));
  const settlementDate = addBusinessDays(nextBillingDate, 3);

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={prev.overlay}>
        <View style={[prev.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={prev.handle} />
          <View style={prev.header}>
            <Text style={prev.title}>Payment Preview</Text>
            <Pressable onPress={onClose} style={prev.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount hero */}
            <View style={prev.amtHero}>
              <Text style={prev.amtLabel}>Total Payment</Text>
              <Text style={prev.amtValue}>{formatCurrency(totalAmount)}</Text>
              <View style={prev.typePill}>
                <Feather name="credit-card" size={12} color={Colors.primary} />
                <Text style={prev.typePillText}>ACH Bank Transfer</Text>
              </View>
            </View>

            {/* Date + timing block */}
            <View style={prev.dateBlock}>
              <View style={prev.dateRow}>
                <Feather name="calendar" size={15} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={prev.dateLabel}>Payment Date</Text>
                  <Text style={prev.dateVal}>{fmt(nextBillingDate)}</Text>
                </View>
              </View>
              <View style={prev.dateDivider} />
              <View style={prev.dateRow}>
                <Feather name="clock" size={15} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={prev.dateLabel}>Estimated Settlement</Text>
                  <Text style={[prev.dateVal, { color: "#F59E0B" }]}>By {fmt(settlementDate)}</Text>
                  <Text style={prev.dateSub}>1–4 business days via ACH</Text>
                </View>
              </View>
            </View>

            {/* Cards breakdown */}
            <Text style={prev.sectionLabel}>Cards Included</Text>
            <View style={prev.cardsList}>
              {cardList.map((c) => (
                <View key={c.id} style={prev.cardRow}>
                  <View style={[prev.cardDot, { backgroundColor: CARD_COLORS[c.id] || Colors.primary }]} />
                  <Text style={prev.cardName}>{c.name} ···{c.lastFour}</Text>
                  <Text style={prev.cardAmt}>{formatCurrency(c.balance)}</Text>
                </View>
              ))}
            </View>

            {/* Source */}
            <Text style={prev.sectionLabel}>Payment Source</Text>
            <View style={prev.sourceRow}>
              <Feather name="database" size={15} color={Colors.positive} />
              <Text style={prev.sourceText}>Chase Bank · Checking ···8842 (Primary)</Text>
            </View>

            {/* Notice */}
            <View style={prev.noticeBanner}>
              <Feather name="info" size={14} color={Colors.primary} />
              <Text style={prev.noticeText}>
                By confirming, you authorize CardFlow to initiate an ACH debit from your linked bank account. Payments cannot be cancelled once processing begins.
              </Text>
            </View>

            {/* Action buttons */}
            <Pressable
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onConfirm(); onClose(); }}
              style={({ pressed }) => [prev.confirmBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={[Colors.primaryDark, "#6C9EFF"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={prev.confirmBtnGrad}
              >
                <Feather name="zap" size={16} color="#fff" />
                <Text style={prev.confirmBtnText}>Confirm Pay All — {formatCurrency(totalAmount)}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onClose} style={({ pressed }) => [prev.cancelBtn, pressed && { opacity: 0.7 }]}>
              <Text style={prev.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Crypto Pay All Preview Modal ─────────────────────────────────────────────

type CryptoPayAllPreviewProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalUsd: number;
};

function CryptoPayAllPreviewModal({ visible, onClose, onConfirm, totalUsd }: CryptoPayAllPreviewProps) {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const execDate = addBusinessDays(today, 1);
  const settlementDate = addBusinessDays(execDate, 3);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const totalCrypto = Object.values(CRYPTO_TOKENS).reduce((s, t) => s + t.balance * t.usdPrice, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={prev.overlay}>
        <View style={[prev.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={prev.handle} />
          <View style={prev.header}>
            <Text style={prev.title}>Crypto Payment Preview</Text>
            <Pressable onPress={onClose} style={prev.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount hero */}
            <View style={prev.amtHero}>
              <Text style={prev.amtLabel}>Total Crypto Portfolio Value</Text>
              <Text style={prev.amtValue}>{formatCurrency(totalCrypto)}</Text>
              <View style={[prev.typePill, { backgroundColor: "rgba(153,69,255,0.15)", borderColor: "rgba(153,69,255,0.35)" }]}>
                <Text style={{ fontSize: 12, marginRight: 4 }}>₿ Ξ ◎</Text>
                <Text style={[prev.typePillText, { color: "#9945FF" }]}>Crypto → USD Conversion</Text>
              </View>
            </View>

            {/* Tokens breakdown */}
            <Text style={prev.sectionLabel}>Wallets</Text>
            <View style={prev.cardsList}>
              {(["btc", "eth", "sol"] as TokenKey[]).map((tk) => {
                const t = CRYPTO_TOKENS[tk];
                const val = t.balance * t.usdPrice;
                const gas = GAS_FEES[tk];
                return (
                  <View key={tk} style={prev.cardRow}>
                    <Text style={[prev.cardDot as any, { color: t.color, fontSize: 16, width: 8 }]}>{t.logo}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={prev.cardName}>{t.name} ({t.balance} {t.symbol})</Text>
                      <Text style={[prev.dateSub, { marginTop: 2 }]}>Gas: ${gas.usd.toFixed(3)} · {gas.level}</Text>
                    </View>
                    <Text style={prev.cardAmt}>{formatCurrency(val)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Date + timing */}
            <View style={prev.dateBlock}>
              <View style={prev.dateRow}>
                <Feather name="calendar" size={15} color="#9945FF" />
                <View style={{ flex: 1 }}>
                  <Text style={prev.dateLabel}>Conversion Date</Text>
                  <Text style={[prev.dateVal, { color: "#9945FF" }]}>{fmt(execDate)}</Text>
                </View>
              </View>
              <View style={prev.dateDivider} />
              <View style={prev.dateRow}>
                <Feather name="clock" size={15} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={prev.dateLabel}>USD Available By</Text>
                  <Text style={[prev.dateVal, { color: "#F59E0B" }]}>{fmt(settlementDate)}</Text>
                  <Text style={prev.dateSub}>Swap → ACH settlement: 3–5 business days</Text>
                </View>
              </View>
            </View>

            <View style={prev.noticeBanner}>
              <Feather name="alert-triangle" size={14} color="#F59E0B" />
              <Text style={prev.noticeText}>
                Crypto is converted to USD at market rate at time of execution. Gas fees apply per network. Transactions are irreversible.
              </Text>
            </View>

            <Pressable
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onConfirm(); onClose(); }}
              style={({ pressed }) => [prev.confirmBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={["#7C3AED", "#9945FF"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={prev.confirmBtnGrad}
              >
                <Text style={{ fontSize: 16, marginRight: 4 }}>₿</Text>
                <Text style={prev.confirmBtnText}>Confirm Crypto Pay All</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onClose} style={({ pressed }) => [prev.cancelBtn, pressed && { opacity: 0.7 }]}>
              <Text style={prev.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const prev = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0E0828",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  handle: { width: 40, height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  amtHero: { alignItems: "center", paddingVertical: 20, gap: 8, marginBottom: 8 },
  amtLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  amtValue: { fontFamily: "Inter_700Bold", fontSize: 36, color: Colors.textPrimary, letterSpacing: -1 },
  typePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(108,158,255,0.14)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(108,158,255,0.3)",
  },
  typePillText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  dateBlock: {
    backgroundColor: "rgba(28,14,70,0.85)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.11)",
    padding: 16, marginBottom: 20, gap: 14,
  },
  dateRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dateDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 4 },
  dateLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  dateVal: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  dateSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  cardsList: { backgroundColor: "rgba(28,14,70,0.85)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", padding: 4, marginBottom: 20, gap: 2 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  cardDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  cardName: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  cardAmt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(74,222,170,0.08)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(74,222,170,0.2)", marginBottom: 20 },
  sourceText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  noticeBanner: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: "rgba(108,158,255,0.08)", borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "rgba(108,158,255,0.2)" },
  noticeText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  confirmBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 10, shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  confirmBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 17, gap: 8 },
  confirmBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textMuted },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PayScreen() {
  const { transactions, cards, scheduledPayments, totalBalance } = useFinance();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("All");
  const [scheduleVisible, setScheduleVisible]           = useState(false);
  const [calendarVisible, setCalendarVisible]           = useState(false);
  const [cryptoVisible, setCryptoVisible]               = useState(false);
  const [selectedPayment, setSelectedPayment]           = useState<ScheduledPayment | null>(null);
  const [txMode, setTxMode]                             = useState(false);
  const [txCycleVisible, setTxCycleVisible]             = useState(false);
  const [txCycle, setTxCycle]                           = useState<{ year: number; month: number } | null>(null);
  const [payAllPreviewVisible, setPayAllPreviewVisible] = useState(false);
  const [cryptoPreviewVisible, setCryptoPreviewVisible] = useState(false);
  const [successVisible, setSuccessVisible]             = useState(false);
  const [successType, setSuccessType]                   = useState<PaySuccessType>("ach");
  const [successAmount, setSuccessAmount]               = useState(0);
  const [successConfirmNum, setSuccessConfirmNum]       = useState("");
  const [receiptVisible, setReceiptVisible]             = useState(false);
  const [confettiVisible, setConfettiVisible]           = useState(false);
  const [txStatus, setTxStatus]                         = useState<"pending" | "posted">("posted");

  // Swipe gesture for Pending / Posted toggle
  const txSwipeRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 10,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -15) {
          setTxStatus("posted");
          Haptics.selectionAsync();
        } else if (gs.dx > 15) {
          setTxStatus("pending");
          Haptics.selectionAsync();
        }
      },
    })
  ).current;

  // Scroll tracking
  const listRef = useRef<FlatList<any>>(null);
  const scrollYRef = useRef(0);
  const contentHRef = useRef(0);
  const listHRef = useRef(0);
  const headerHRef = useRef(0);
  const thumbAnim = useRef(new Animated.Value(0)).current;
  const thumbTopAnim = useRef(new Animated.Value(0)).current;
  const thumbHAnim = useRef(new Animated.Value(40)).current;
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TX_PENDING_CUTOFF = useMemo(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), []);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filter === "Debit") return t.type === "debit";
        if (filter === "Credit") return t.type === "credit";
        return true;
      })
      .filter((t) => {
        if (!txCycle) return true;
        const d = new Date(t.date);
        return d.getFullYear() === txCycle.year && d.getMonth() === txCycle.month;
      })
      .filter((t) => {
        const d = new Date(t.date);
        if (txStatus === "pending") return d >= TX_PENDING_CUTOFF;
        return d < TX_PENDING_CUTOFF;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter, txCycle, txStatus, TX_PENDING_CUTOFF]);

  const cardById = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);

  const generateConfirmationNumber = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const segment = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `CF-${segment(4)}-${segment(4)}-${segment(4)}`;
  };

  const triggerSuccess = (type: PaySuccessType, amount: number) => {
    const confirmNum = generateConfirmationNumber();
    setSuccessType(type);
    setSuccessAmount(amount);
    setSuccessConfirmNum(confirmNum);
    setConfettiVisible(true);
    setTimeout(() => {
      setConfettiVisible(false);
      setSuccessVisible(true);
    }, 800);
  };

  const handlePayAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPayAllPreviewVisible(true);
  };

  const handleCryptoPayAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCryptoPreviewVisible(true);
  };

  const updateScrollbar = useCallback((y: number) => {
    const total = contentHRef.current;
    const visible = listHRef.current;
    if (total <= visible) return;
    const h = Math.max(32, (visible / total) * visible);
    const maxTop = visible - h;
    const top = (y / (total - visible)) * maxTop;
    thumbHAnim.setValue(h);
    thumbTopAnim.setValue(Math.max(0, Math.min(top, maxTop)));
  }, [thumbHAnim, thumbTopAnim]);

  const showScrollbar = useCallback(() => {
    Animated.timing(thumbAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      Animated.timing(thumbAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, 1500);
  }, [thumbAnim]);

  const handleScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollYRef.current = y;
    const threshold = headerHRef.current > 0 ? headerHRef.current - 80 : 420;
    setTxMode(y > threshold);
    updateScrollbar(y);
    showScrollbar();
  }, [updateScrollbar, showScrollbar]);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const txCycleLabel = txCycle
    ? new Date(txCycle.year, txCycle.month, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "All";

  const { theme, effectiveBgStart, effectiveBgEnd } = useTheme();

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={styles.gradient}>
      <Image source={BG_DAMASK} style={styles.bgTexture} resizeMode="cover" />

      {/* ── Full-page FlatList — everything scrolls ── */}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(_, h) => { contentHRef.current = h; }}
        onLayout={(e) => { listHRef.current = e.nativeEvent.layout.height; }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
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
            {/* ── Page header ── */}
            <View
              style={[styles.pageHeaderWrap, { paddingTop: insets.top + 12 }]}
              onLayout={(e) => { headerHRef.current = e.nativeEvent.layout.height; }}
            >
              {/* Title row */}
              <View style={styles.pageHeader}>
                <View>
                  <Text style={styles.pageTitle}>Pay</Text>
                  <Text style={styles.pageSubtitle}>Manage & schedule payments</Text>
                </View>
                <View style={styles.headerBtns}>
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); setCalendarVisible(true); }}
                    style={({ pressed }) => [styles.calBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Feather name="calendar" size={19} color={Colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setScheduleVisible(true); }}
                    style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
                  >
                    <Feather name="plus" size={26} color="#fff" />
                  </Pressable>
                </View>
              </View>

              {/* Scheduled payments */}
              {scheduledPayments.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Scheduled Payments</Text>
                  {scheduledPayments.map((sp) => {
                    const totalAmt = Object.values(sp.amounts).reduce((s, a) => s + a, 0);
                    return (
                      <View key={sp.id} style={[styles.scheduledCard, GLASS_INLINE]}>
                        <View style={styles.scheduledTop}>
                          <View style={styles.datePill}>
                            <Feather name="calendar" size={13} color={Colors.primary} />
                            <Text style={styles.datePillText}>{formatDateDisplay(sp.date)}</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={[styles.statusBadge, { backgroundColor: sp.status === "pending" ? "rgba(108,158,255,0.15)" : "rgba(74,222,170,0.15)" }]}>
                              <Text style={[styles.statusText, { color: sp.status === "pending" ? Colors.primary : Colors.positive }]}>
                                {sp.status === "pending" ? "Pending" : "Completed"}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => { Haptics.selectionAsync(); setSelectedPayment(sp); }}
                              style={({ pressed }) => [styles.schedInfoBtn, pressed && { opacity: 0.7 }]}
                            >
                              <Feather name="info" size={15} color={Colors.primary} />
                            </Pressable>
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
                                <Text style={styles.scheduledCardName}>{c.name} ···{c.lastFour}</Text>
                                <Text style={styles.scheduledAmt}>{formatCurrency(sp.amounts[cid] || 0)}</Text>
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
            </View>

            {/* ── Action icon buttons: Pay | Crypto ── */}
            <View style={styles.actionIconsRow}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setScheduleVisible(true); }}
                style={({ pressed }) => [styles.actionIconCard, pressed && { opacity: 0.85 }]}
              >
                <LinearGradient
                  colors={[Colors.primaryDark, "#6C9EFF"]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionIconGrad}
                >
                  <View style={styles.actionIconInner}>
                    <Feather name="credit-card" size={26} color="#fff" />
                    <Text style={styles.actionIconLabel}>Pay</Text>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); handlePayAll(); }}
                      style={styles.payAllPill}
                    >
                      <Feather name="zap" size={11} color={Colors.primaryDark} />
                      <Text style={styles.payAllPillText}>Pay All</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setCryptoVisible(true); }}
                style={({ pressed }) => [styles.actionIconCard, pressed && { opacity: 0.85 }]}
              >
                <LinearGradient
                  colors={["#1a1033", "#2d1060"]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionIconGrad}
                >
                  <View style={styles.actionIconInner}>
                    <View style={styles.cryptoIconStack}>
                      {(["btc", "eth", "sol"] as TokenKey[]).map((tk, i) => (
                        <Text key={tk} style={[styles.cryptoStackLogo, { color: CRYPTO_TOKENS[tk].color, marginLeft: i > 0 ? -6 : 0 }]}>
                          {CRYPTO_TOKENS[tk].logo}
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.actionIconLabel}>Crypto</Text>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); handleCryptoPayAll(); }}
                      style={[styles.payAllPill, { backgroundColor: "rgba(153,69,255,0.15)", borderColor: "rgba(153,69,255,0.4)" }]}
                    >
                      <Text style={[styles.payAllPillText, { color: "#9945FF" }]}>Pay All</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Transaction History: pending/posted toggle + type filter */}
            <View style={styles.filterRow} {...txSwipeRef.panHandlers}>
              <View style={styles.txStatusRow}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                <View style={styles.txStatusToggle}>
                  {(["pending", "posted"] as const).map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => { Haptics.selectionAsync(); setTxStatus(s); }}
                      style={[styles.txStatusBtn, txStatus === s && styles.txStatusBtnActive]}
                    >
                      {s === "pending" && (
                        <View style={[styles.txStatusDot, { backgroundColor: txStatus === "pending" ? "#F59E0B" : Colors.textMuted }]} />
                      )}
                      <Text style={[styles.txStatusText, txStatus === s && styles.txStatusTextActive]}>
                        {s === "pending" ? "Pending" : "Posted"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.filters}>
                {FILTERS.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      />

      {/* ── Custom thin scrollbar ── */}
      <Animated.View
        style={[
          styles.scrollTrack,
          { top: insets.top, bottom: insets.bottom + 80, opacity: thumbAnim, pointerEvents: "none" } as any,
        ]}
      >
        <Animated.View
          style={[
            styles.scrollThumb,
            {
              height: thumbHAnim,
              transform: [{ translateY: thumbTopAnim }],
            },
          ]}
        />
      </Animated.View>

      {/* ── Transaction mode overlay header ── */}
      {txMode && (
        <View style={[styles.txOverlay, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); scrollToTop(); }}
            style={({ pressed }) => [styles.txBackBtn, pressed && { opacity: 0.6 }]}
          >
            <Feather name="chevron-left" size={20} color={Colors.textPrimary} />
            <Text style={styles.txBackText}>Back</Text>
          </Pressable>
          <Text style={styles.txOverlayTitle}>Transaction History</Text>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setTxCycleVisible(true); }}
            style={({ pressed }) => [styles.txCycleBtn, pressed && { opacity: 0.7 }]}
          >
            <Feather name="calendar" size={14} color={Colors.primary} />
            <Text style={styles.txCycleBtnText}>{txCycleLabel}</Text>
          </Pressable>
        </View>
      )}

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
      <CryptoModal
        visible={cryptoVisible}
        onClose={() => setCryptoVisible(false)}
        onPayAllSuccess={(amt) => { setCryptoVisible(false); triggerSuccess("crypto", amt); }}
      />
      <TxCyclePickerModal
        visible={txCycleVisible}
        selected={txCycle}
        onSelect={setTxCycle}
        onClose={() => setTxCycleVisible(false)}
      />
      <PayAllPreviewModal
        visible={payAllPreviewVisible}
        onClose={() => setPayAllPreviewVisible(false)}
        onConfirm={() => triggerSuccess("ach", totalBalance)}
        cards={cards}
        totalAmount={totalBalance}
      />
      <CryptoPayAllPreviewModal
        visible={cryptoPreviewVisible}
        onClose={() => setCryptoPreviewVisible(false)}
        onConfirm={() => triggerSuccess("crypto", Object.values(CRYPTO_TOKENS).reduce((s, t) => s + t.balance * t.usdPrice, 0))}
        totalUsd={Object.values(CRYPTO_TOKENS).reduce((s, t) => s + t.balance * t.usdPrice, 0)}
      />
      <ConfettiOverlay visible={confettiVisible} onDone={() => setConfettiVisible(false)} />
      <PaySuccessOverlay
        visible={successVisible}
        type={successType}
        amount={successAmount}
        confirmationNum={successConfirmNum}
        onDone={() => setSuccessVisible(false)}
        onViewReceipt={() => { setSuccessVisible(false); setReceiptVisible(true); }}
      />
      <ReceiptModal
        visible={receiptVisible}
        type={successType}
        amount={successAmount}
        confirmationNum={successConfirmNum}
        onClose={() => setReceiptVisible(false)}
      />
    </LinearGradient>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  bgTexture: {
    ...StyleSheet.absoluteFillObject,
    width: "100%", height: "100%", opacity: 0.09,
  },
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
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    overflow: "hidden",
    elevation: 8,
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
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    padding: 16,
    gap: 10,
    elevation: 8,
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
  schedInfoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
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
  txHistoryBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(108,158,255,0.1)", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 8, alignSelf: "flex-start",
    borderWidth: 1, borderColor: "rgba(108,158,255,0.25)",
  },
  txHistoryBtnText: {
    fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.primary,
  },
  txStatusRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 6,
  },
  txStatusToggle: {
    flexDirection: "row", gap: 4,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 20, padding: 3,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  txStatusBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
  },
  txStatusBtnActive: { backgroundColor: Colors.primaryDark },
  txStatusDot: { width: 6, height: 6, borderRadius: 3 },
  txStatusText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  txStatusTextActive: { color: "#fff" },
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

  // Page header wrapper (has onLayout for threshold detection)
  pageHeaderWrap: {
    paddingBottom: 4,
  },

  // Custom thin scrollbar
  scrollTrack: {
    position: "absolute",
    right: 3,
    width: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  scrollThumb: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.28)",
  },

  // Transaction mode overlay header
  txOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "rgba(13,8,35,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  txBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
    paddingRight: 12,
  },
  txBackText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  txOverlayTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  txCycleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.3)",
  },
  txCycleBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  actionIconsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  actionIconCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  actionIconGrad: {
    padding: 2,
    borderRadius: 20,
  },
  actionIconInner: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 6,
  },
  actionIconLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
    letterSpacing: 0.3,
  },
  payAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  payAllPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.primaryDark,
  },
  cryptoIconStack: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
  },
  cryptoStackLogo: {
    fontSize: 22,
    lineHeight: 28,
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
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: 4,
    marginHorizontal: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendBorder: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  legendText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
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
  cancelSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,107,138,0.1)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,107,138,0.3)",
    paddingVertical: 14,
  },
  cancelBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.negative,
  },
  processingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    padding: 14,
  },
  processingTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#F59E0B",
    marginBottom: 2,
  },
  processingSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 10,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
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
  monthPickerRow: {
    paddingHorizontal: 4,
    gap: 6,
    paddingVertical: 4,
  },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  monthChipActive: {
    backgroundColor: "rgba(108,158,255,0.2)",
    borderColor: Colors.primary,
  },
  monthChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
  },
  monthChipTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
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
  autoPayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  autoPayTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  autoPaySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  autoPayBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "rgba(108,158,255,0.08)",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.25)",
  },
  autoPayBannerText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});

// ─── CryptoLogo styles ────────────────────────────────────────────────────────

const cr = StyleSheet.create({
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
});

// ─── CryptoScheduleModal styles ───────────────────────────────────────────────

const csch = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#12093A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "92%",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
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
    fontSize: 18,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 14,
  },
  tokenRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  tokenBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 4,
  },
  tokenLogo: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  tokenSymbol: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  amtRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
  },
  amtIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  amtLogo: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  amtInput: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: 14,
    paddingRight: 14,
  },
  usdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  usdText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.positive,
  },
  usdRate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  balanceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  balanceVal: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.divider,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  cardName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  cardAmt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 80,
    textAlign: "right",
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
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
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
    minHeight: 60,
    textAlignVertical: "top",
  },
  infoBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  infoText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  schedBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 8,
  },
  schedBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  schedBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  schedBtnWarn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  schedBtnWarnText: {
    fontSize: 12,
  },

  // multi-token selector extras
  tokenBtnTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  tokenCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  gasPill: {
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  gasText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },

  // per-token amount block
  tokenAmtBlock: {
    marginBottom: 12,
  },
  tokenAmtMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 6,
  },

  // gas fee panel
  gasBanner: {
    backgroundColor: "rgba(245,158,11,0.07)",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    gap: 10,
  },
  gasBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gasBannerTitle: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#F59E0B",
  },
  gasBannerTotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#F59E0B",
  },
  gasRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gasRowLogo: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    width: 18,
    textAlign: "center",
  },
  gasRowName: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    width: 32,
  },
  gasLevelBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gasLevelText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  gasRowAmt: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textAlign: "right",
  },
  gasRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,107,138,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  gasWarning: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.negative,
    lineHeight: 18,
  },

  // total row
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  totalLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  totalVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.positive,
  },
});

// ─── CryptoModal styles ───────────────────────────────────────────────────────

const cry = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0E0828",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "94%",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  tokenTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  tokenTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tokenTabLogo: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  tokenTabText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  balanceNetwork: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  balanceSymbol: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  logoCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  logoGlyph: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  balanceMain: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  balanceUSD: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ratePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rateText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  addressSection: {
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: 8,
  },
  addressLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addressText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(108,158,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  allTokensLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  allTokensList: { gap: 8, marginBottom: 20 },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.divider,
  },
  tokenRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenRowLogo: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  tokenRowName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tokenRowAddr: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
  },
  tokenRowBal: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  tokenRowUSD: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  actionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  schedBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  schedBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  schedBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  sendLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 14,
  },
  sendInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  sendAmtRow: {
    gap: 8,
  },
  sendUsd: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.positive,
    paddingHorizontal: 4,
  },
  sendBalLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sendWarning: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  sendWarningText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sendBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 12,
    gap: 8,
  },
  qrLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  receiveNetwork: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  receiveAddrBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 10,
  },
  receiveAddr: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  copyAddrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(108,158,255,0.14)",
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.3)",
    marginBottom: 8,
  },
  copyAddrText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
  swapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 18,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.2)",
  },
  swapHeaderTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  swapHeaderSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  swapDirRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  swapDirBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  swapDirBtnActive: {
    borderColor: "rgba(108,158,255,0.5)",
    backgroundColor: "rgba(108,158,255,0.12)",
  },
  swapDirText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  swapDirTextActive: {
    color: Colors.primary,
  },
  swapInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 4,
  },
  swapCurrLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.divider,
  },
  swapSummary: {
    backgroundColor: "rgba(28,14,70,0.85)",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    marginBottom: 4,
  },
  swapSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  swapSummaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  swapSummaryVal: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  swapSuccess: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 14,
  },
  swapSuccessTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.positive,
  },
  swapSuccessAmt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  swapSuccessSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  swapDoneBtn: {
    marginTop: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  swapDoneBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
