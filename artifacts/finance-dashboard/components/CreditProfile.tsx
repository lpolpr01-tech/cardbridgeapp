import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BureauScore {
  name: "Equifax" | "Experian" | "TransUnion";
  score: number | null;
  color: string;
  change?: number;
}

export interface CreditHealthData {
  overallStatus: "Excellent" | "Good" | "Needs Attention";
  paymentHistoryPct: number;
  utilizationPct: number;
  avgAccountAgeYears: number;
  recentInquiries: number;
  derogatoryMarks: number;
}

export interface DebtSummaryData {
  totalRevolving: number;
  totalInstallment: number;
  openAccounts: number;
  openLoans: number;
  monthlyMinimum: number;
  highestBalanceName: string;
  highestBalanceAmt: number;
  debtToLimitRatio?: number;
  creditCards: number;
  autoLoans: number;
  personalLoans: number;
  studentLoans: number;
  other: number;
}

export interface ScoreFactor {
  id: string;
  title: string;
  explanation: string;
  sentiment: "positive" | "neutral" | "negative";
  icon: string;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  icon: string;
}

export interface CreditProfileData {
  bureaus: BureauScore[];
  lastUpdated: string;
  creditHealth: CreditHealthData;
  debtSummary: DebtSummaryData;
  scoreFactors: ScoreFactor[];
  recommendations: Recommendation[];
  onSimulate?: () => void;
}

export type CreditProfileStatus = "loading" | "success" | "partial" | "no_data" | "error";

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_CREDIT_DATA: CreditProfileData = {
  bureaus: [
    { name: "Equifax",    score: 742, color: "#FF6B9D", change: +5  },
    { name: "Experian",   score: 738, color: "#6C9EFF", change: -2  },
    { name: "TransUnion", score: 745, color: "#4ADEAA", change: +8  },
  ],
  lastUpdated: new Date().toISOString(),
  creditHealth: {
    overallStatus: "Good",
    paymentHistoryPct: 98,
    utilizationPct: 31,
    avgAccountAgeYears: 4.2,
    recentInquiries: 2,
    derogatoryMarks: 0,
  },
  debtSummary: {
    totalRevolving: 8_420,
    totalInstallment: 22_800,
    openAccounts: 5,
    openLoans: 2,
    monthlyMinimum: 385,
    highestBalanceName: "Travel Elite Visa",
    highestBalanceAmt: 4_230,
    debtToLimitRatio: 0.31,
    creditCards: 5_620,
    autoLoans: 15_400,
    personalLoans: 0,
    studentLoans: 7_400,
    other: 0,
  },
  scoreFactors: [
    {
      id: "util",
      title: "Credit Utilization",
      explanation: "Your revolving utilization is at 31%. Keeping it under 30% will help maintain your score.",
      sentiment: "neutral",
      icon: "pie-chart",
    },
    {
      id: "payment",
      title: "On-Time Payment History",
      explanation: "98% on-time payments across all accounts — an excellent record that strongly benefits your score.",
      sentiment: "positive",
      icon: "check-circle",
    },
    {
      id: "age",
      title: "Average Account Age",
      explanation: "Your average account age is 4.2 years. Avoid closing older accounts to preserve this metric.",
      sentiment: "neutral",
      icon: "clock",
    },
    {
      id: "inquiries",
      title: "Recent Hard Inquiries",
      explanation: "2 hard inquiries in the last 12 months. Each typically impacts your score by a few points.",
      sentiment: "neutral",
      icon: "search",
    },
    {
      id: "mix",
      title: "Healthy Credit Mix",
      explanation: "You carry both revolving and installment accounts, which lenders view positively.",
      sentiment: "positive",
      icon: "layers",
    },
  ],
  recommendations: [
    {
      id: "r1",
      title: "Pay down Travel Elite to reduce utilization",
      detail: "Paying an extra $600 on this card would drop your utilization below 25% and could add ~12 points.",
      priority: "high",
      icon: "trending-down",
    },
    {
      id: "r2",
      title: "Keep statement balance below $2,800",
      detail: "Aiming for under 30% of your $9,350 combined limit each month helps all three bureaus.",
      priority: "medium",
      icon: "target",
    },
    {
      id: "r3",
      title: "Avoid new credit applications for 6 months",
      detail: "Two recent hard inquiries are still active. A pause lets them age off without new impact.",
      priority: "medium",
      icon: "slash",
    },
    {
      id: "r4",
      title: "Maintain perfect payment record",
      detail: "Your 98% on-time rate is excellent. A single missed payment can cost 60–110 points.",
      priority: "low",
      icon: "shield",
    },
  ],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORE_MIN = 300;
const SCORE_MAX = 850;
const GLASS = {
  backdropFilter: "blur(20px) saturate(140%)",
  boxShadow: "0px 8px 32px rgba(0,0,0,0.5), inset 0px 1px 0px rgba(180,130,255,0.12)",
} as any;

function getCategory(score: number | null): string {
  if (score === null) return "—";
  if (score >= 750) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 650) return "Fair";
  if (score >= 580) return "Poor";
  return "Very Poor";
}
function getCategoryColor(score: number | null): string {
  if (score === null) return Colors.textMuted;
  if (score >= 750) return Colors.positive;
  if (score >= 700) return "#A3E635";
  if (score >= 650) return "#FBBF24";
  return Colors.negative;
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

// ─── Shared: Privacy Badge ────────────────────────────────────────────────────

function PrivacyBadge({ label = "Private to you" }: { label?: string }) {
  return (
    <View style={sh.privacyBadge}>
      <Feather name="lock" size={9} color={Colors.textMuted} />
      <Text style={sh.privacyText}>{label}</Text>
    </View>
  );
}

// ─── Shared: Skeleton Shimmer ─────────────────────────────────────────────────

function SkeletonLine({ width = "100%", height = 14, radius = 7, style }: { width?: any; height?: number; radius?: number; style?: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.48] });
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: "rgba(255,255,255,0.35)" }, { opacity }, style]}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={[sh.card, GLASS, { gap: 14 }]}>
      <SkeletonLine width="50%" height={13} />
      <SkeletonLine width="100%" height={10} />
      <SkeletonLine width="85%" height={10} />
      <SkeletonLine width="70%" height={10} />
    </View>
  );
}

// ─── Shared: Entrance Animator ─────────────────────────────────────────────────

function FadeSlideIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Shared: Card Header ──────────────────────────────────────────────────────

function CardHeader({ icon, title, badge }: { icon: string; title: string; badge?: React.ReactNode }) {
  return (
    <View style={sh.cardHeader}>
      <View style={sh.cardHeaderLeft}>
        <View style={sh.iconWrap}>
          <Feather name={icon as any} size={14} color={Colors.primary} />
        </View>
        <Text style={sh.cardTitle}>{title}</Text>
      </View>
      {badge}
    </View>
  );
}

// ─── No Data Connected Card ───────────────────────────────────────────────────

function NoDataCard() {
  return (
    <FadeSlideIn delay={0}>
      <View style={[sh.card, GLASS]}>
        <View style={sh.noDataCenter}>
          <LinearGradient
            colors={["rgba(108,158,255,0.22)", "rgba(79,127,255,0.08)"]}
            style={sh.noDataIcon}
          >
            <Feather name="shield" size={28} color={Colors.primary} />
          </LinearGradient>
          <Text style={sh.noDataTitle}>Connect your credit profile</Text>
          <Text style={sh.noDataSub}>
            Privately view your 3-bureau scores, credit health, debt summary, and personalized insights — all in one place.
          </Text>
          <Pressable style={({ pressed }) => [sh.noDataBtn, pressed && { opacity: 0.82 }]}>
            <LinearGradient
              colors={["#7C3AED", "#4F7FFF"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={sh.noDataBtnGrad}
            >
              <Feather name="lock" size={14} color="#fff" />
              <Text style={sh.noDataBtnText}>Connect Securely</Text>
            </LinearGradient>
          </Pressable>
          <View style={sh.noDataFooter}>
            <Feather name="lock" size={10} color={Colors.textMuted} />
            <Text style={sh.noDataFooterText}>Bank-level encryption · Visible only on your account</Text>
          </View>
        </View>
      </View>
    </FadeSlideIn>
  );
}

// ─── 1. Credit Score Overview Card ───────────────────────────────────────────

export function CreditScoreOverviewCard({ data }: { data: CreditProfileData }) {
  const available = data.bureaus.filter((b) => b.score !== null);
  const avgScore  = available.length
    ? Math.round(available.reduce((s, b) => s + (b.score ?? 0), 0) / available.length)
    : null;
  const avgColor = getCategoryColor(avgScore);
  const avgCat   = getCategory(avgScore);

  const updated = (() => {
    const diff = Date.now() - new Date(data.lastUpdated).getTime();
    const hrs = Math.floor(diff / 3_600_000);
    if (hrs < 1) return "Updated today";
    if (hrs < 24) return `Updated ${hrs}h ago`;
    return `Updated ${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <FadeSlideIn delay={0}>
      <View style={[cs.panel, GLASS]}>
        {/* Header */}
        <View style={cs.header}>
          <View style={cs.headerLeft}>
            <Feather name="shield" size={15} color={Colors.primary} />
            <Text style={cs.title}>Credit Scores</Text>
          </View>
          <View style={cs.updatedBadge}>
            <View style={cs.updatedDot} />
            <Text style={cs.updatedText}>{updated}</Text>
          </View>
        </View>

        {/* Average */}
        <View style={cs.avgRow}>
          <Text style={cs.avgLabel}>Average Score</Text>
          <View style={cs.avgRight}>
            <Text style={[cs.avgScore, { color: avgColor }]}>
              {avgScore ?? "—"}
            </Text>
            <Text style={[cs.avgCategory, { color: avgColor }]}>{avgCat}</Text>
          </View>
        </View>

        {/* Compact thermometer — average score position */}
        {avgScore !== null && (
          <View style={cs.barWrap}>
            <LinearGradient
              colors={["#FF6B6B", "#FBBF24", "#A3E635", "#4ADEAA"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={cs.barTrack}
            />
            <View style={[cs.barIndicator, { left: `${((avgScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100}%` as any }]}>
              <View style={[cs.barDot, { borderColor: avgColor }]} />
            </View>
            <View style={cs.barLabels}>
              {["300", "580", "670", "740", "850"].map((l) => (
                <Text key={l} style={cs.barLabel}>{l}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Bureau scores — vertical stack: one row per bureau */}
        <View style={cs.bureauSection}>
          {data.bureaus.map((b, i) => {
            const pct = b.score !== null ? ((b.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100 : 0;
            const catColor = getCategoryColor(b.score);
            return (
              <React.Fragment key={b.name}>
                {i > 0 && <View style={cs.bureauRowDivider} />}
                <View style={cs.bureauRow}>
                  <Text style={cs.bureauName}>{b.name}</Text>
                  <Text style={[cs.bureauScore, { color: b.color }]}>
                    {b.score ?? "—"}
                  </Text>
                  <View style={cs.bureauBarBg}>
                    {b.score !== null && (
                      <View style={[cs.bureauBarFill, {
                        width: `${pct}%` as any,
                        backgroundColor: b.color,
                      }]} />
                    )}
                  </View>
                  <Text style={[cs.bureauCategory, { color: catColor }]}>
                    {getCategory(b.score)}
                  </Text>
                  {b.change !== undefined && b.change !== 0 && (
                    <View style={[cs.changeChip, { backgroundColor: b.change > 0 ? "rgba(74,222,170,0.13)" : "rgba(255,107,138,0.13)" }]}>
                      <Feather
                        name={b.change > 0 ? "trending-up" : "trending-down"}
                        size={9}
                        color={b.change > 0 ? Colors.positive : Colors.negative}
                      />
                      <Text style={[cs.changeText, { color: b.change > 0 ? Colors.positive : Colors.negative }]}>
                        {b.change > 0 ? "+" : ""}{b.change}
                      </Text>
                    </View>
                  )}
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* Footer */}
        <View style={cs.footer}>
          <PrivacyBadge label="Securely synced" />
          <Text style={cs.disclaimer}>
            Scores are educational estimates and may differ from lender-grade reports.
          </Text>
        </View>

        {/* Score Simulator button */}
        {data.onSimulate && (
          <Pressable onPress={data.onSimulate} style={({ pressed }) => [cs.simBtn, pressed && { opacity: 0.8 }]}>
            <LinearGradient
              colors={["rgba(124,58,237,0.22)", "rgba(79,127,255,0.22)"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={cs.simBtnGrad}
            >
              <Feather name="bar-chart-2" size={14} color="#C084FC" />
              <Text style={cs.simBtnText}>Simulate Score Changes</Text>
              <Feather name="chevron-right" size={13} color="rgba(192,132,252,0.6)" />
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </FadeSlideIn>
  );
}

// ─── 2. Credit Health Card ────────────────────────────────────────────────────

function HealthBar({ pct, color }: { pct: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: pct, duration: 700, delay: 200, useNativeDriver: false }).start();
  }, []);
  return (
    <View style={hc.barBg}>
      <Animated.View
        style={[hc.barFill, {
          width: width.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
          backgroundColor: color,
        }]}
      />
    </View>
  );
}

function HealthRow({
  icon, label, value, sub, barPct, barColor, onPress,
}: { icon: string; label: string; value: string; sub?: string; barPct?: number; barColor?: string; onPress?: () => void }) {
  const content = (
    <View style={hc.row}>
      <View style={[hc.rowIcon, { backgroundColor: `${barColor || Colors.primary}18` }]}>
        <Feather name={icon as any} size={13} color={barColor || Colors.primary} />
      </View>
      <View style={hc.rowBody}>
        <View style={hc.rowTop}>
          <Text style={hc.rowLabel}>{label}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[hc.rowValue, { color: barColor || Colors.textPrimary }]}>{value}</Text>
            {onPress && <Feather name="chevron-right" size={12} color={Colors.textMuted} />}
          </View>
        </View>
        {sub && <Text style={hc.rowSub}>{sub}</Text>}
        {barPct !== undefined && barColor && (
          <HealthBar pct={barPct} color={barColor} />
        )}
      </View>
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>{content}</Pressable>;
  }
  return content;
}

// ── Utilization Drill-Down Modal ──────────────────────────────────────────────

const MOCK_UTIL_ACCOUNTS = [
  { name: "Sapphire Reserve", limit: 15000, balance: 2800, color: "#6C9EFF" },
  { name: "Gold Card", limit: 10000, balance: 4200, color: "#FFD700" },
  { name: "Ink Business", limit: 8000, balance: 950, color: "#4ADEAA" },
  { name: "Freedom Flex", limit: 5000, balance: 3300, color: "#FF6B8A" },
];

function UtilizationModal({ visible, onClose, utilPct }: { visible: boolean; onClose: () => void; utilPct: number }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={drill.overlay}>
        <View style={drill.sheet}>
          <View style={drill.handle} />
          <View style={drill.header}>
            <View style={drill.headerLeft}>
              <View style={[drill.iconWrap, { backgroundColor: "rgba(108,158,255,0.15)" }]}>
                <Feather name="pie-chart" size={16} color={Colors.primary} />
              </View>
              <Text style={drill.title}>Credit Utilization</Text>
            </View>
            <Pressable onPress={onClose} style={drill.closeBtn}>
              <Feather name="x" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={drill.heroRow}>
            <Text style={[drill.heroNum, { color: utilPct <= 30 ? Colors.positive : utilPct <= 50 ? "#FBBF24" : Colors.negative }]}>
              {utilPct}%
            </Text>
            <Text style={drill.heroLabel}>Overall Utilization</Text>
            <View style={[drill.heroBadge, { backgroundColor: utilPct <= 30 ? "rgba(74,222,170,0.12)" : "rgba(251,191,36,0.12)", borderColor: utilPct <= 30 ? "rgba(74,222,170,0.3)" : "rgba(251,191,36,0.3)" }]}>
              <Text style={[drill.heroBadgeText, { color: utilPct <= 30 ? Colors.positive : "#FBBF24" }]}>
                {utilPct <= 30 ? "Ideal" : "High — reduce to below 30%"}
              </Text>
            </View>
          </View>

          <Text style={drill.subLabel}>Per Account</Text>
          {MOCK_UTIL_ACCOUNTS.map((acct) => {
            const pct = Math.round((acct.balance / acct.limit) * 100);
            const color = pct <= 30 ? Colors.positive : pct <= 50 ? "#FBBF24" : Colors.negative;
            return (
              <View key={acct.name} style={drill.acctRow}>
                <View style={drill.acctLeft}>
                  <View style={[drill.acctDot, { backgroundColor: acct.color }]} />
                  <Text style={drill.acctName}>{acct.name}</Text>
                </View>
                <View style={drill.acctRight}>
                  <Text style={[drill.acctPct, { color }]}>{pct}%</Text>
                  <Text style={drill.acctBal}>${acct.balance.toLocaleString()} / ${acct.limit.toLocaleString()}</Text>
                  <View style={drill.acctBarBg}>
                    <View style={[drill.acctBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
                  </View>
                </View>
              </View>
            );
          })}

          <Text style={drill.tip}>Tip: Keep each card below 30% for the best score impact.</Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Payment History Calendar Modal ────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function PaymentHistoryModal({ visible, onClose, historyPct }: { visible: boolean; onClose: () => void; historyPct: number }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();
  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);

  // Simulate: most days paid on time, occasional missed
  const getStatus = (day: number): "paid" | "missed" | "pending" | "none" => {
    const cellDate = new Date(year, month, day);
    if (cellDate > now) return "pending";
    // Simulate ~97% on time, randomly missed
    const seed = (year * 12 + month + day * 7) % 31;
    if (seed === 5 || seed === 14) return "missed";
    return "paid";
  };

  const cells = Array.from({ length: firstDay }, () => null).concat(Array.from({ length: days }, (_, i) => i + 1));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={drill.overlay}>
        <View style={drill.sheet}>
          <View style={drill.handle} />
          <View style={drill.header}>
            <View style={drill.headerLeft}>
              <View style={[drill.iconWrap, { backgroundColor: "rgba(74,222,170,0.15)" }]}>
                <Feather name="check-circle" size={16} color={Colors.positive} />
              </View>
              <Text style={drill.title}>Payment History</Text>
            </View>
            <Pressable onPress={onClose} style={drill.closeBtn}>
              <Feather name="x" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={drill.heroRow}>
            <Text style={[drill.heroNum, { color: historyPct >= 97 ? Colors.positive : "#FBBF24" }]}>{historyPct}%</Text>
            <Text style={drill.heroLabel}>On-Time Payments</Text>
          </View>

          <View style={drill.calNav}>
            <Pressable onPress={prevMonth} style={drill.calNavBtn}>
              <Feather name="chevron-left" size={18} color={Colors.textSecondary} />
            </Pressable>
            <Text style={drill.calMonth}>{MONTHS[month]} {year}</Text>
            <Pressable onPress={nextMonth} style={drill.calNavBtn}>
              <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={drill.calDays}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <Text key={d} style={drill.calDayLabel}>{d}</Text>
            ))}
          </View>
          <View style={drill.calGrid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`empty-${i}`} style={drill.calCell} />;
              const status = getStatus(day);
              const bgColor = status === "paid" ? "rgba(74,222,170,0.15)" : status === "missed" ? "rgba(255,107,138,0.15)" : "transparent";
              const dotColor = status === "paid" ? Colors.positive : status === "missed" ? Colors.negative : "transparent";
              return (
                <View key={day} style={[drill.calCell, { backgroundColor: bgColor, borderRadius: 6 }]}>
                  <Text style={[drill.calDayNum, { color: status === "pending" ? Colors.textMuted : Colors.textSecondary }]}>{day}</Text>
                  {status !== "pending" && <View style={[drill.calDot, { backgroundColor: dotColor }]} />}
                </View>
              );
            })}
          </View>

          <View style={drill.calLegend}>
            <View style={drill.legendItem}>
              <View style={[drill.legendDot, { backgroundColor: Colors.positive }]} />
              <Text style={drill.legendLabel}>On-time</Text>
            </View>
            <View style={drill.legendItem}>
              <View style={[drill.legendDot, { backgroundColor: Colors.negative }]} />
              <Text style={drill.legendLabel}>Missed</Text>
            </View>
            <View style={drill.legendItem}>
              <View style={[drill.legendDot, { backgroundColor: Colors.divider }]} />
              <Text style={drill.legendLabel}>Upcoming</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function CreditHealthCard({ data }: { data: CreditHealthData }) {
  const [showUtil, setShowUtil] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const statusColor =
    data.overallStatus === "Excellent" ? Colors.positive
    : data.overallStatus === "Good" ? "#A3E635"
    : "#FBBF24";

  const utilColor = data.utilizationPct <= 30 ? Colors.positive : data.utilizationPct <= 50 ? "#FBBF24" : Colors.negative;

  return (
    <FadeSlideIn delay={80}>
      <View style={[sh.card, GLASS]}>
        <CardHeader
          icon="activity"
          title="Credit Health"
          badge={
            <View style={[hc.statusPill, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
              <View style={[hc.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[hc.statusText, { color: statusColor }]}>{data.overallStatus}</Text>
            </View>
          }
        />
        <View style={sh.rows}>
          <HealthRow
            icon="check-circle"
            label="Payment History"
            value={`${data.paymentHistoryPct}%`}
            sub="On-time payments"
            barPct={data.paymentHistoryPct}
            barColor={data.paymentHistoryPct >= 97 ? Colors.positive : data.paymentHistoryPct >= 90 ? "#A3E635" : "#FBBF24"}
            onPress={() => setShowHistory(true)}
          />
          <View style={sh.divider} />
          <HealthRow
            icon="pie-chart"
            label="Credit Utilization"
            value={`${data.utilizationPct}%`}
            sub={data.utilizationPct <= 30 ? "Ideal range" : "Reduce to below 30%"}
            barPct={Math.min(data.utilizationPct, 100)}
            barColor={utilColor}
            onPress={() => setShowUtil(true)}
          />
          <View style={sh.divider} />
          <HealthRow
            icon="clock"
            label="Avg. Account Age"
            value={`${data.avgAccountAgeYears.toFixed(1)} yrs`}
            barColor={data.avgAccountAgeYears >= 5 ? Colors.positive : data.avgAccountAgeYears >= 3 ? "#A3E635" : "#FBBF24"}
          />
          <View style={sh.divider} />
          <HealthRow
            icon="search"
            label="Recent Inquiries"
            value={data.recentInquiries === 0 ? "None" : `${data.recentInquiries} inquiry${data.recentInquiries !== 1 ? "s" : ""}`}
            sub={data.recentInquiries === 0 ? "No recent impact" : data.recentInquiries <= 2 ? "Low impact — fading in 12 mo" : "Moderate impact on score"}
            barPct={Math.min((data.recentInquiries / 6) * 100, 100)}
            barColor={data.recentInquiries === 0 ? Colors.positive : data.recentInquiries <= 2 ? "#FBBF24" : Colors.negative}
          />
          <View style={sh.divider} />
          <HealthRow
            icon="alert-circle"
            label="Derogatory Marks"
            value={data.derogatoryMarks === 0 ? "Clear" : `${data.derogatoryMarks} mark${data.derogatoryMarks !== 1 ? "s" : ""}`}
            sub={data.derogatoryMarks === 0 ? "No negative records on file" : "Negative impact — contact bureau to dispute"}
            barPct={data.derogatoryMarks === 0 ? 100 : Math.min((data.derogatoryMarks / 3) * 100, 100)}
            barColor={data.derogatoryMarks === 0 ? Colors.positive : Colors.negative}
          />
        </View>
        <PrivacyBadge label="Visible only on your account" />
      </View>

      <UtilizationModal visible={showUtil} onClose={() => setShowUtil(false)} utilPct={data.utilizationPct} />
      <PaymentHistoryModal visible={showHistory} onClose={() => setShowHistory(false)} historyPct={data.paymentHistoryPct} />
    </FadeSlideIn>
  );
}

// ─── 3. Debt Summary Card ─────────────────────────────────────────────────────

function DebtLine({ label, amount, color }: { label: string; amount: number; color?: string }) {
  if (amount === 0) return null;
  return (
    <View style={ds.debtLine}>
      <View style={[ds.debtDot, { backgroundColor: color || Colors.textMuted }]} />
      <Text style={ds.debtLineLabel}>{label}</Text>
      <Text style={[ds.debtLineAmt, { color: color || Colors.textPrimary }]}>{fmtCurrency(amount)}</Text>
    </View>
  );
}

// ── Debt Summary Drill-Down Modal ─────────────────────────────────────────────

// TODO: Replace static labels with lender names fetched from connected account API
const DEBT_SEGMENTS = [
  { key: "creditCards",   label: "Chase Visa",   color: "#9B5CF5" },
  { key: "autoLoans",     label: "Wells Auto",   color: "#3E8EDD" },
  { key: "personalLoans", label: "Upstart Loan", color: "#F59E0B" },
  { key: "studentLoans",  label: "Navient Edu",  color: "#4ADEAA" },
  { key: "other",         label: "Other Debt",   color: "#94A3B8" },
];

function DebtDrillDownModal({ visible, onClose, data }: { visible: boolean; onClose: () => void; data: DebtSummaryData }) {
  const total = data.totalRevolving + data.totalInstallment;
  const segments = DEBT_SEGMENTS.filter((s) => (data as any)[s.key] > 0);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={drill.overlay}>
        <View style={drill.sheet}>
          <View style={drill.handle} />
          <View style={drill.header}>
            <View style={drill.headerLeft}>
              <View style={[drill.iconWrap, { backgroundColor: "rgba(255,107,138,0.15)" }]}>
                <Feather name="bar-chart-2" size={16} color={Colors.negative} />
              </View>
              <Text style={drill.title}>Debt Breakdown</Text>
            </View>
            <Pressable onPress={onClose} style={drill.closeBtn}>
              <Feather name="x" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={drill.debtHeroRow}>
            <Text style={[drill.heroNum, { color: Colors.textPrimary }]}>{fmtCurrency(total)}</Text>
            <Text style={drill.heroLabel}>Total Debt Balance</Text>
            <View style={drill.debtBar}>
              {segments.map((s) => {
                const amt = (data as any)[s.key] as number;
                const pct = total > 0 ? (amt / total) * 100 : 0;
                return <View key={s.key} style={[drill.debtBarSeg, { width: `${pct}%` as any, backgroundColor: s.color }]} />;
              })}
            </View>
          </View>

          <Text style={drill.subLabel}>By Category</Text>
          <View style={drill.debtLegend}>
            {segments.map((s) => {
              const amt = (data as any)[s.key] as number;
              const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : "0";
              return (
                <View key={s.key} style={drill.debtLegRow}>
                  <View style={[drill.debtLegDot, { backgroundColor: s.color }]} />
                  <Text style={drill.debtLegLabel}>{s.label}</Text>
                  <Text style={drill.debtLegPct}>{pct}%</Text>
                  <Text style={drill.debtLegAmt}>{fmtCurrency(amt)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function DebtSummaryCard({ data }: { data: DebtSummaryData }) {
  const total = data.totalRevolving + data.totalInstallment;
  const [expanded, setExpanded] = useState(false);
  const [showDrill, setShowDrill] = useState(false);

  return (
    <FadeSlideIn delay={160}>
      <View style={[sh.card, GLASS]}>
        <CardHeader
          icon="bar-chart-2"
          title="Debt Summary"
          badge={
            <Pressable
              onPress={() => setShowDrill(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 4 }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,107,138,0.1)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(255,107,138,0.2)" }}>
                <Feather name="pie-chart" size={11} color={Colors.negative} />
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.negative }}>Breakdown</Text>
              </View>
            </Pressable>
          }
        />

        {/* Total hero */}
        <View style={ds.hero}>
          <Text style={ds.heroTotal}>{fmtCurrency(total)}</Text>
          <Text style={ds.heroLabel}>Total Debt</Text>
        </View>

        {/* Stats grid */}
        <View style={ds.grid}>
          <View style={ds.stat}>
            <Text style={ds.statValue}>{fmtCurrency(data.totalRevolving)}</Text>
            <Text style={ds.statLabel}>Revolving</Text>
          </View>
          <View style={ds.statDiv} />
          <View style={ds.stat}>
            <Text style={ds.statValue}>{fmtCurrency(data.totalInstallment)}</Text>
            <Text style={ds.statLabel}>Installment</Text>
          </View>
          <View style={ds.statDiv} />
          <View style={ds.stat}>
            <Text style={ds.statValue}>{data.openAccounts + data.openLoans}</Text>
            <Text style={ds.statLabel}>Open Accts</Text>
          </View>
        </View>

        {/* Key stats */}
        <View style={sh.rows}>
          <View style={ds.keyRow}>
            <Feather name="calendar" size={13} color={Colors.primary} />
            <Text style={ds.keyLabel}>Monthly Minimum</Text>
            <Text style={ds.keyVal}>{fmtCurrency(data.monthlyMinimum)}</Text>
          </View>
          <View style={sh.divider} />
          <View style={ds.keyRow}>
            <Feather name="credit-card" size={13} color={Colors.negative} />
            <Text style={ds.keyLabel} numberOfLines={1}>Highest Balance</Text>
            <View style={{ alignItems: "flex-end", gap: 1 }}>
              <Text style={[ds.keyVal, { color: Colors.negative }]} numberOfLines={1}>{data.highestBalanceName}</Text>
              <Text style={[ds.keyVal, { color: Colors.negative, fontSize: 11, fontFamily: "Inter_400Regular" }]}>{fmtCurrency(data.highestBalanceAmt)}</Text>
            </View>
          </View>
          {data.debtToLimitRatio !== undefined && (
            <>
              <View style={sh.divider} />
              <View style={ds.keyRow}>
                <Feather name="percent" size={13} color={Colors.textMuted} />
                <Text style={ds.keyLabel}>Debt-to-Limit Ratio</Text>
                <Text style={[ds.keyVal, { color: data.debtToLimitRatio <= 0.3 ? Colors.positive : "#FBBF24" }]}>
                  {(data.debtToLimitRatio * 100).toFixed(0)}%
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Account type breakdown */}
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          style={({ pressed }) => [ds.expandBtn, pressed && { opacity: 0.75 }]}
        >
          <Text style={ds.expandLabel}>Account Breakdown</Text>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={Colors.textMuted} />
        </Pressable>
        {expanded && (
          <View style={ds.breakdown}>
            {DEBT_SEGMENTS.map((seg) => (
              <DebtLine
                key={seg.key}
                label={seg.label}
                amount={(data as any)[seg.key] as number}
                color={seg.color}
              />
            ))}
          </View>
        )}
        <PrivacyBadge />
      </View>
      <DebtDrillDownModal visible={showDrill} onClose={() => setShowDrill(false)} data={data} />
    </FadeSlideIn>
  );
}

// ─── 4. Score Factors Card ────────────────────────────────────────────────────

const SENTIMENT_COLORS = {
  positive: Colors.positive,
  neutral: "#F59E0B",
  negative: Colors.negative,
};
const SENTIMENT_BG = {
  positive: "rgba(74,222,170,0.12)",
  neutral: "rgba(245,158,11,0.12)",
  negative: "rgba(255,107,138,0.12)",
};

// ─── Factor Detail Modal ──────────────────────────────────────────────────────

interface FactorDetail {
  what: string;
  why: string;
  impact: string;
  tips: string[];
}

const FACTOR_DETAILS: Record<string, FactorDetail> = {
  util: {
    what: "Credit utilization is the percentage of your available revolving credit you're currently using. It compares your total credit card balances to your total credit limits.",
    why: "Lenders view high utilization as a sign of financial stress. It's the second most important factor in your credit score, accounting for about 30% of your FICO score.",
    impact: "Your current utilization is 31% — just above the ideal 30% threshold. Bringing this below 30% could add up to 20 points to your score.",
    tips: [
      "Pay down balances before your statement closes to lower reported utilization.",
      "Request a credit limit increase on existing cards (without spending more).",
      "Spread balances across cards to avoid a single card exceeding 50% utilization.",
      "Keep your total utilization under 10% for maximum score benefit.",
    ],
  },
  payment: {
    what: "Payment history is a record of whether you've paid your bills on time across all accounts — credit cards, loans, and other credit lines.",
    why: "This is the single biggest factor in your credit score, making up 35% of your FICO score. Even one late payment can significantly drop your score.",
    impact: "Your 98% on-time payment rate is excellent and strongly benefits your score. This record shows lenders you are a reliable borrower.",
    tips: [
      "Set up autopay for at least the minimum payment to avoid accidental late payments.",
      "Pay before the due date, not the grace period end — banks report to bureaus on due dates.",
      "If you missed a payment, bring it current quickly — the damage grows over time.",
      "Contact your lender about goodwill adjustments for isolated late payments.",
    ],
  },
  age: {
    what: "Average account age is calculated by adding up the ages of all your credit accounts and dividing by the total number of accounts. Both open and closed accounts count.",
    why: "Longer credit history gives lenders more data to evaluate your reliability. Account age accounts for about 15% of your FICO score.",
    impact: "Your average account age is 4.2 years, which is moderate. Older accounts and a longer history will gradually improve this metric over time.",
    tips: [
      "Never close your oldest credit card — it anchors your average account age.",
      "Keep old accounts open even if you rarely use them; charge a small recurring bill monthly.",
      "Avoid opening many new accounts at once, which lowers your average age.",
      "Be patient — this metric only improves with time.",
    ],
  },
  inquiries: {
    what: "Hard inquiries occur when a lender checks your credit report as part of a loan or credit card application. They differ from soft inquiries (like checking your own credit), which don't affect your score.",
    why: "Multiple applications in a short period can signal financial distress to lenders. Hard inquiries account for about 10% of your FICO score and typically stay on your report for 2 years.",
    impact: "You have 2 hard inquiries in the last 12 months. Each typically reduces your score by 3–7 points temporarily. Both should age off within the next 12 months.",
    tips: [
      "Avoid applying for new credit unless necessary — especially in the months before a major loan.",
      "Rate-shopping for mortgages or auto loans within 14–45 days counts as a single inquiry.",
      "Hard inquiries naturally lose impact after 12 months and drop off after 24 months.",
      "Check if you have any unauthorized inquiries — you can dispute them.",
    ],
  },
  mix: {
    what: "Credit mix refers to the variety of credit account types you have, including credit cards (revolving credit), mortgages, auto loans, and student loans (installment credit).",
    why: "Lenders like to see that you can manage different types of credit responsibly. Credit mix accounts for about 10% of your FICO score.",
    impact: "You carry both revolving credit (credit cards) and installment accounts (auto, student loans) — this diversity is viewed positively by all three bureaus.",
    tips: [
      "Don't open accounts you don't need just to improve mix — the benefit is small.",
      "If you only have credit cards, a small installment loan or secured loan can help.",
      "Focus on payment history and utilization first — they matter far more.",
      "Maintaining your current mix without closing accounts preserves this benefit.",
    ],
  },
};

function FactorDetailModal({ factor, visible, onClose }: { factor: ScoreFactor | null; visible: boolean; onClose: () => void }) {
  if (!factor) return null;
  const detail = FACTOR_DETAILS[factor.id];
  const color = SENTIMENT_COLORS[factor.sentiment];
  const bg    = SENTIMENT_BG[factor.sentiment];
  const sentimentLabel = factor.sentiment === "positive" ? "Helping Your Score" : factor.sentiment === "negative" ? "Hurting Your Score" : "Neutral Impact";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={fdm.overlay}>
        <Pressable style={fdm.dismiss} onPress={onClose} />
        <View style={fdm.sheet}>
          {/* Handle */}
          <View style={fdm.handle} />

          {/* Header */}
          <View style={fdm.header}>
            <View style={[fdm.iconWrap, { backgroundColor: bg, borderColor: `${color}40` }]}>
              <Feather name={factor.icon as any} size={20} color={color} />
            </View>
            <View style={fdm.headerText}>
              <Text style={fdm.title}>{factor.title}</Text>
              <View style={[fdm.pill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
                <View style={[fdm.pillDot, { backgroundColor: color }]} />
                <Text style={[fdm.pillLabel, { color }]}>{sentimentLabel}</Text>
              </View>
            </View>
          </View>

          <ScrollView style={fdm.body} showsVerticalScrollIndicator={false}>
            {detail ? (
              <>
                <Text style={fdm.sectionLabel}>What is it?</Text>
                <Text style={fdm.paragraph}>{detail.what}</Text>

                <Text style={fdm.sectionLabel}>Why it matters</Text>
                <Text style={fdm.paragraph}>{detail.why}</Text>

                <Text style={fdm.sectionLabel}>Your status</Text>
                <View style={[fdm.statusBox, { borderColor: `${color}40`, backgroundColor: `${color}0D` }]}>
                  <Text style={[fdm.statusText, { color }]}>{detail.impact}</Text>
                </View>

                <Text style={fdm.sectionLabel}>How to improve</Text>
                {detail.tips.map((tip, i) => (
                  <View key={i} style={fdm.tipRow}>
                    <View style={[fdm.tipBullet, { backgroundColor: color }]} />
                    <Text style={fdm.tipText}>{tip}</Text>
                  </View>
                ))}
                <View style={{ height: 20 }} />
              </>
            ) : (
              <Text style={fdm.paragraph}>{factor.explanation}</Text>
            )}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [fdm.closeBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={fdm.closeBtnText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const fdm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: "#1A103F",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingBottom: 32,
    maxHeight: "88%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)", alignSelf: "center", marginTop: 10, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  headerText: { flex: 1, gap: 6 },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
  body: { paddingHorizontal: 20, paddingTop: 16, flexGrow: 0 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  paragraph: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 22 },
  statusBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  statusText: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 21 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  tipBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  tipText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 21, flex: 1 },
  closeBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: "#4F7FFF", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  closeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});

export function ScoreFactorsCard({ factors }: { factors: ScoreFactor[] }) {
  const [selectedFactor, setSelectedFactor] = useState<ScoreFactor | null>(null);

  return (
    <FadeSlideIn delay={240}>
      <View style={[sh.card, GLASS]}>
        <CardHeader icon="trending-up" title="What's Affecting Your Score" />
        <View style={sf.list}>
          {factors.map((f, i) => {
            const color = SENTIMENT_COLORS[f.sentiment];
            const bg    = SENTIMENT_BG[f.sentiment];
            return (
              <React.Fragment key={f.id}>
                {i > 0 && <View style={sh.divider} />}
                <Pressable
                  onPress={() => setSelectedFactor(f)}
                  style={({ pressed }) => [sf.item, pressed && { opacity: 0.75 }]}
                >
                  <View style={[sf.iconWrap, { backgroundColor: bg, borderColor: `${color}40` }]}>
                    <Feather name={f.icon as any} size={14} color={color} />
                  </View>
                  <View style={sf.body}>
                    <View style={sf.titleRow}>
                      <Text style={sf.title}>{f.title}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={[sf.dot, { backgroundColor: color }]} />
                        <Feather name="chevron-right" size={13} color="rgba(255,255,255,0.3)" />
                      </View>
                    </View>
                    <Text style={sf.explanation}>{f.explanation}</Text>
                  </View>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>
        <PrivacyBadge label="Securely synced" />
      </View>
      <FactorDetailModal
        factor={selectedFactor}
        visible={selectedFactor !== null}
        onClose={() => setSelectedFactor(null)}
      />
    </FadeSlideIn>
  );
}

// ─── 5. Personalized Recommendations Card ────────────────────────────────────

const PRIORITY_COLORS = { high: Colors.negative, medium: "#F59E0B", low: Colors.positive };
const PRIORITY_LABELS = { high: "Priority", medium: "Suggested", low: "Maintain" };

export function PersonalizedRecommendationsCard({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <FadeSlideIn delay={320}>
      <View style={[sh.card, GLASS]}>
        <CardHeader
          icon="zap"
          title="Personalized Recommendations"
          badge={
            <View style={sh.recBadge}>
              <Text style={sh.recBadgeText}>{recommendations.length} actions</Text>
            </View>
          }
        />
        <View style={sf.list}>
          {recommendations.map((r, i) => {
            const color = PRIORITY_COLORS[r.priority];
            return (
              <React.Fragment key={r.id}>
                {i > 0 && <View style={sh.divider} />}
                <View style={rec.item}>
                  <View style={[rec.iconWrap, { backgroundColor: `${color}15` }]}>
                    <Feather name={r.icon as any} size={15} color={color} />
                  </View>
                  <View style={rec.body}>
                    <View style={rec.titleRow}>
                      <Text style={rec.title} numberOfLines={2}>{r.title}</Text>
                      <View style={[rec.pill, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
                        <Text style={[rec.pillText, { color }]}>{PRIORITY_LABELS[r.priority]}</Text>
                      </View>
                    </View>
                    <Text style={rec.detail}>{r.detail}</Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </View>
        <View style={rec.footer}>
          <Feather name="lock" size={10} color={Colors.textMuted} />
          <Text style={rec.footerText}>Personalized for Luis Pol · Updated daily</Text>
        </View>
      </View>
    </FadeSlideIn>
  );
}

// ─── Parent: Credit Profile Section ──────────────────────────────────────────

interface CreditProfileSectionProps {
  status?: CreditProfileStatus;
  data?: CreditProfileData;
  onSimulate?: () => void;
}

export function CreditProfileSection({ status = "success", data = MOCK_CREDIT_DATA, onSimulate }: CreditProfileSectionProps) {
  if (status === "loading") {
    return (
      <View style={root.section}>
        <Text style={root.sectionLabel}>Credit Profile</Text>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (status === "no_data") {
    return (
      <View style={root.section}>
        <Text style={root.sectionLabel}>Credit Profile</Text>
        <NoDataCard />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={root.section}>
        <Text style={root.sectionLabel}>Credit Profile</Text>
        <View style={[sh.card, GLASS]}>
          <View style={sh.errorWrap}>
            <Feather name="wifi-off" size={28} color={Colors.textMuted} />
            <Text style={sh.errorTitle}>Unable to load credit data</Text>
            <Text style={sh.errorSub}>Check your connection and try again.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={root.section}>
      <View style={root.labelRow}>
        <Text style={root.sectionLabel}>Credit Profile</Text>
        <View style={root.syncBadge}>
          <View style={root.syncDot} />
          <Text style={root.syncText}>Live</Text>
        </View>
      </View>

      <CreditScoreOverviewCard data={{ ...data, onSimulate }} />
      <CreditHealthCard data={data.creditHealth} />
      <DebtSummaryCard data={data.debtSummary} />
      <ScoreFactorsCard factors={data.scoreFactors} />
      <PersonalizedRecommendationsCard recommendations={data.recommendations} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const root = StyleSheet.create({
  section: { marginTop: 8 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginBottom: 6, marginTop: 12 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2 },
  syncBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(74,222,170,0.1)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(74,222,170,0.2)" },
  syncDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.positive },
  syncText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.positive },
});

const sh = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    elevation: 8,
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(108,158,255,0.12)", borderWidth: 1, borderColor: "rgba(108,158,255,0.2)", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  rows: { gap: 0 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 2 },
  privacyBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  privacyText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  recBadge: { backgroundColor: "rgba(108,158,255,0.14)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(108,158,255,0.3)" },
  recBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.primary },
  noDataCenter: { alignItems: "center", gap: 14, paddingVertical: 12 },
  noDataIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  noDataTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary, textAlign: "center" },
  noDataSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  noDataBtn: { borderRadius: 14, overflow: "hidden", width: "100%", marginTop: 4 },
  noDataBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  noDataBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  noDataFooter: { flexDirection: "row", alignItems: "center", gap: 5 },
  noDataFooterText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  errorWrap: { alignItems: "center", gap: 10, paddingVertical: 16 },
  errorTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary },
  errorSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
});

// Credit Score Overview styles
const cs = StyleSheet.create({
  panel: { gap: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  updatedBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(74,222,170,0.1)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(74,222,170,0.2)" },
  updatedDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.positive },
  updatedText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.positive },
  avgRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  avgLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  avgRight: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  avgScore: { fontFamily: "Inter_700Bold", fontSize: 26 },
  avgCategory: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  // Compact thermometer bar
  barWrap: { marginBottom: 10, position: "relative" },
  barTrack: { height: 5, borderRadius: 2.5, marginBottom: 3 },
  barIndicator: { position: "absolute", top: -3.5, alignItems: "center" },
  barDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff", borderWidth: 2.5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 3, elevation: 4, marginLeft: -6 },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  barLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },
  // Bureau vertical stack
  bureauSection: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", marginHorizontal: -18 },
  bureauRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 18, gap: 10 },
  bureauRowDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginHorizontal: 18 },
  bureauName: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted, width: 84 },
  bureauScore: { fontFamily: "Inter_700Bold", fontSize: 16, width: 40, textAlign: "right" },
  bureauBarBg: { flex: 1, height: 5, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2.5, overflow: "hidden" },
  bureauBarFill: { height: 5, borderRadius: 2.5 },
  bureauCategory: { fontFamily: "Inter_500Medium", fontSize: 11, width: 56, textAlign: "right" },
  changeChip: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  changeText: { fontFamily: "Inter_700Bold", fontSize: 9 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  disclaimer: { fontFamily: "Inter_400Regular", fontSize: 9.5, color: Colors.textMuted, lineHeight: 14, flex: 1, textAlign: "right" },
  simBtn: { marginTop: 12, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(192,132,252,0.25)" },
  simBtnGrad: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  simBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#C084FC", flex: 1 },
});

// Credit Health styles
const hc = StyleSheet.create({
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  rowValue: { fontFamily: "Inter_700Bold", fontSize: 13 },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  barBg: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
});

// Debt Summary styles
const ds = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 2 },
  heroTotal: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.textPrimary, letterSpacing: -0.5 },
  heroLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  grid: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  stat: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  statDiv: { width: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 10 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  keyRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  keyLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  keyVal: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  expandBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", marginTop: 4 },
  expandLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  breakdown: { gap: 8 },
  debtLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  debtDot: { width: 7, height: 7, borderRadius: 3.5 },
  debtLineLabel: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  debtLineAmt: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});

// Score Factors styles
const sf = StyleSheet.create({
  list: { gap: 0 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  explanation: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
});

// Drill-down modal styles
const drill = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#140D38", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "88%", gap: 0 },
  handle: { width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  heroRow: { alignItems: "center", gap: 4, marginBottom: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  heroNum: { fontFamily: "Inter_700Bold", fontSize: 40, letterSpacing: -1 },
  heroLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  heroBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, marginTop: 4 },
  heroBadgeText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  subLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  acctRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  acctLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  acctDot: { width: 8, height: 8, borderRadius: 4 },
  acctName: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  acctRight: { alignItems: "flex-end", gap: 2, minWidth: 120 },
  acctPct: { fontFamily: "Inter_700Bold", fontSize: 15 },
  acctBal: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  acctBarBg: { width: 100, height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden", marginTop: 2 },
  acctBarFill: { height: 4, borderRadius: 2 },
  tip: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "center", marginTop: 14, lineHeight: 16 },
  calNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calNavBtn: { padding: 8 },
  calMonth: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary },
  calDays: { flexDirection: "row", marginBottom: 6 },
  calDayLabel: { flex: 1, textAlign: "center", fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: "center", justifyContent: "center", gap: 1 },
  calDayNum: { fontFamily: "Inter_400Regular", fontSize: 11 },
  calDot: { width: 4, height: 4, borderRadius: 2 },
  calLegend: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  debtHeroRow: { alignItems: "center", gap: 3, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)", marginBottom: 14 },
  debtBar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", width: "100%", marginTop: 10 },
  debtBarSeg: { height: 8 },
  debtLegend: { gap: 10 },
  debtLegRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  debtLegDot: { width: 8, height: 8, borderRadius: 4 },
  debtLegLabel: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  debtLegAmt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  debtLegPct: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, width: 36, textAlign: "right" },
});

// Recommendations styles
const rec = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  body: { flex: 1, gap: 6 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary, flex: 1, lineHeight: 18 },
  pill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, alignSelf: "flex-start", flexShrink: 0 },
  pillText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  detail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  footer: { flexDirection: "row", alignItems: "center", gap: 5, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", marginTop: 4 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
});
