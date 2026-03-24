import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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

function ScoreArc({ score, color }: { score: number | null; color: string }) {
  if (score === null) return <Text style={[cs.scoreNum, { color: Colors.textMuted }]}>—</Text>;
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

        {/* Gradient bar */}
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
              {["300", "500", "650", "750", "850"].map((l) => (
                <Text key={l} style={cs.barLabel}>{l}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Bureau row */}
        <View style={cs.bureauxRow}>
          {data.bureaus.map((b, i) => (
            <React.Fragment key={b.name}>
              {i > 0 && <View style={cs.bureauDivider} />}
              <View style={cs.bureauItem}>
                <Text style={cs.bureauName}>{b.name}</Text>
                <ScoreArc score={b.score} color={b.color} />
                {b.score !== null && (
                  <View style={cs.bureauBarBg}>
                    <View style={[cs.bureauBarFill, {
                      width: `${((b.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100}%` as any,
                      backgroundColor: b.color,
                    }]} />
                  </View>
                )}
                <Text style={[cs.bureauCategory, { color: getCategoryColor(b.score) }]}>
                  {getCategory(b.score)}
                </Text>
                {b.change !== undefined && b.change !== 0 && (
                  <View style={[cs.changeChip, { backgroundColor: b.change > 0 ? "rgba(74,222,170,0.15)" : "rgba(255,107,138,0.15)" }]}>
                    <Feather name={b.change > 0 ? "arrow-up" : "arrow-down"} size={9} color={b.change > 0 ? Colors.positive : Colors.negative} />
                    <Text style={[cs.changeText, { color: b.change > 0 ? Colors.positive : Colors.negative }]}>
                      {Math.abs(b.change)}
                    </Text>
                  </View>
                )}
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Footer */}
        <View style={cs.footer}>
          <PrivacyBadge label="Securely synced" />
          <Text style={cs.disclaimer}>
            Scores are educational estimates and may differ from lender-grade reports.
          </Text>
        </View>
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
  icon, label, value, sub, barPct, barColor,
}: { icon: string; label: string; value: string; sub?: string; barPct?: number; barColor?: string }) {
  return (
    <View style={hc.row}>
      <View style={[hc.rowIcon, { backgroundColor: `${barColor || Colors.primary}18` }]}>
        <Feather name={icon as any} size={13} color={barColor || Colors.primary} />
      </View>
      <View style={hc.rowBody}>
        <View style={hc.rowTop}>
          <Text style={hc.rowLabel}>{label}</Text>
          <Text style={[hc.rowValue, { color: barColor || Colors.textPrimary }]}>{value}</Text>
        </View>
        {sub && <Text style={hc.rowSub}>{sub}</Text>}
        {barPct !== undefined && barColor && (
          <HealthBar pct={barPct} color={barColor} />
        )}
      </View>
    </View>
  );
}

export function CreditHealthCard({ data }: { data: CreditHealthData }) {
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
          />
          <View style={sh.divider} />
          <HealthRow
            icon="pie-chart"
            label="Credit Utilization"
            value={`${data.utilizationPct}%`}
            sub={data.utilizationPct <= 30 ? "Ideal range" : "Reduce to below 30%"}
            barPct={Math.min(data.utilizationPct, 100)}
            barColor={utilColor}
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
            value={String(data.recentInquiries)}
            sub={data.recentInquiries <= 2 ? "Low impact" : "May lower score slightly"}
            barColor={data.recentInquiries <= 2 ? Colors.positive : data.recentInquiries <= 4 ? "#FBBF24" : Colors.negative}
          />
          <View style={sh.divider} />
          <HealthRow
            icon="alert-circle"
            label="Derogatory Marks"
            value={data.derogatoryMarks === 0 ? "None reported" : String(data.derogatoryMarks)}
            barColor={data.derogatoryMarks === 0 ? Colors.positive : Colors.negative}
          />
        </View>
        <PrivacyBadge label="Visible only on your account" />
      </View>
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

export function DebtSummaryCard({ data }: { data: DebtSummaryData }) {
  const total = data.totalRevolving + data.totalInstallment;
  const [expanded, setExpanded] = useState(false);

  return (
    <FadeSlideIn delay={160}>
      <View style={[sh.card, GLASS]}>
        <CardHeader icon="bar-chart-2" title="Debt Summary" />

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
            <Text style={ds.keyLabel}>Highest Balance</Text>
            <Text style={[ds.keyVal, { color: Colors.negative }]}>{data.highestBalanceName} · {fmtCurrency(data.highestBalanceAmt)}</Text>
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
            <DebtLine label="Credit Cards"    amount={data.creditCards}   color="#9B5CF5" />
            <DebtLine label="Auto Loans"      amount={data.autoLoans}     color="#3E8EDD" />
            <DebtLine label="Personal Loans"  amount={data.personalLoans} color="#F59E0B" />
            <DebtLine label="Student Loans"   amount={data.studentLoans}  color="#4ADEAA" />
            <DebtLine label="Other"           amount={data.other}         color={Colors.textMuted} />
          </View>
        )}
        <PrivacyBadge />
      </View>
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

export function ScoreFactorsCard({ factors }: { factors: ScoreFactor[] }) {
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
                <View style={sf.item}>
                  <View style={[sf.iconWrap, { backgroundColor: bg, borderColor: `${color}40` }]}>
                    <Feather name={f.icon as any} size={14} color={color} />
                  </View>
                  <View style={sf.body}>
                    <View style={sf.titleRow}>
                      <Text style={sf.title}>{f.title}</Text>
                      <View style={[sf.dot, { backgroundColor: color }]} />
                    </View>
                    <Text style={sf.explanation}>{f.explanation}</Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </View>
        <PrivacyBadge label="Securely synced" />
      </View>
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
}

export function CreditProfileSection({ status = "success", data = MOCK_CREDIT_DATA }: CreditProfileSectionProps) {
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

      <CreditScoreOverviewCard data={data} />
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
    marginBottom: 10,
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    elevation: 8,
    padding: 18,
    gap: 14,
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
  avgRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  avgLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  avgRight: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  avgScore: { fontFamily: "Inter_700Bold", fontSize: 28 },
  avgCategory: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  barWrap: { marginBottom: 16, position: "relative" },
  barTrack: { height: 8, borderRadius: 4, marginBottom: 4 },
  barIndicator: { position: "absolute", top: -4, alignItems: "center" },
  barDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff", borderWidth: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4, marginLeft: -8 },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  barLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },
  bureauxRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", marginHorizontal: -18 },
  bureauItem: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, gap: 5 },
  bureauDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 10 },
  bureauName: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  bureauBarBg: { width: "70%", height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" },
  bureauBarFill: { height: 4, borderRadius: 2 },
  bureauCategory: { fontFamily: "Inter_500Medium", fontSize: 10 },
  arcWrap: { alignItems: "center", gap: 4 },
  arcBg: { width: 48, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  arcFill: { height: 6, borderRadius: 3 },
  scoreNum: { fontFamily: "Inter_700Bold", fontSize: 20 },
  changeChip: { flexDirection: "row", alignItems: "center", gap: 2, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  changeText: { fontFamily: "Inter_700Bold", fontSize: 9 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  disclaimer: { fontFamily: "Inter_400Regular", fontSize: 9.5, color: Colors.textMuted, lineHeight: 14, flex: 1, textAlign: "right" },
});

// Credit Health styles
const hc = StyleSheet.create({
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
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
  hero: { alignItems: "center", paddingVertical: 4 },
  heroTotal: { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.textPrimary, letterSpacing: -0.5 },
  heroLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  grid: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  stat: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 3 },
  statDiv: { width: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 10 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  keyRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
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
