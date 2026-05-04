import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { useFinance } from "@/context/FinanceContext";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function randomCurrency(max: number) {
  return formatCurrency(Math.random() * max);
}

type ScrambleRowProps = {
  label: string;
  value: number;
  delay: number;
  color?: string;
  isTotal?: boolean;
  onReveal?: () => void;
};

function ScrambleRow({ label, value, delay, color, isTotal, onReveal }: ScrambleRowProps) {
  const [displayed, setDisplayed] = useState("···");
  const [revealed, setRevealed] = useState(false);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const startTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideIn, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]).start();

      let count = 0;
      const totalIter = 14;
      const interval = setInterval(() => {
        count++;
        if (count >= totalIter) {
          setDisplayed(formatCurrency(value));
          setRevealed(true);
          clearInterval(interval);
          onReveal?.();
        } else {
          setDisplayed(randomCurrency(value * 1.5 + 10));
        }
      }, 55);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay, value]);

  const textColor = color ?? (isTotal ? Colors.textPrimary : Colors.textSecondary);

  return (
    <Animated.View
      style={[
        styles.feeRow,
        isTotal && styles.feeRowTotal,
        { opacity: fadeIn, transform: [{ translateY: slideIn }] },
      ]}
    >
      <Text style={[styles.feeLabel, isTotal && styles.feeLabelTotal]}>{label}</Text>
      <Text
        style={[
          styles.feeValue,
          { color: textColor },
          isTotal && styles.feeValueTotal,
          !revealed && styles.feeValueScramble,
        ]}
      >
        {displayed}
      </Text>
    </Animated.View>
  );
}

export default function ReviewScreen() {
  const { bankAccountId } = useLocalSearchParams<{ bankAccountId: string }>();
  const { pendingPayment, bankAccounts, cards, addScheduledPayment, setPendingPayment } = useFinance();
  const { token: authToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [revealedCount, setRevealedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const bank = bankAccounts.find((b) => b.id === bankAccountId);
  const selectedCards = cards.filter((c) => pendingPayment?.cardIds.includes(c.id));

  const cardBalanceTotal = pendingPayment
    ? Object.values(pendingPayment.amounts).reduce((s, a) => s + a, 0)
    : 0;

  const lateFees = selectedCards.some((c) => c.balance / c.limit > 0.85) ? 25.00 : 0;
  const platformFee = Math.max(cardBalanceTotal * 0.005, 1.99);
  const achFee = cardBalanceTotal >= 100 ? 0 : 0.25;
  const grandTotal = cardBalanceTotal + lateFees + platformFee + achFee;

  const TOTAL_ROWS = 5;
  const allRevealed = revealedCount >= TOTAL_ROWS;

  const onReveal = () => setRevealedCount((n) => n + 1);

  // Pulse animation when button turns green
  useEffect(() => {
    if (allRevealed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.spring(btnScale, { toValue: 1.04, useNativeDriver: true, tension: 200 }),
        Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 200 }),
      ]).start();
    }
  }, [allRevealed]);

  const handleConfirm = async () => {
    if (!allRevealed || submitting) return;
    if (!pendingPayment) return;

    setSubmitting(true);

    // Submit to backend: POST /api/stripe/schedule-payment.
    // Backend expects a Plaid-linked depository account_id. Try to resolve one;
    // if none, fall back to local-only scheduling so the demo still works.
    let confNum = `PAY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    let backendOk = false;

    try {
      // Resolve a Plaid-linked depository account to fund the scheduled payment
      let plaidAccountId: string | null = null;
      try {
        const accountsRes = await fetch(apiUrl("/api/plaid/accounts"), {
          method: "GET",
          headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        });
        if (accountsRes.ok) {
          const data = (await accountsRes.json()) as {
            accounts: { accountId: string; type: string; subtype: string | null }[];
          };
          const dep = data.accounts?.find(
            (a) => a.type === "depository" || a.subtype === "checking" || a.subtype === "savings",
          );
          plaidAccountId = dep?.accountId ?? null;
        }
      } catch {}

      if (plaidAccountId) {
        const res = await fetch(apiUrl("/api/stripe/schedule-payment"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            account_id: plaidAccountId,
            amounts: pendingPayment.amounts,
            date: pendingPayment.date,
            note: pendingPayment.note,
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          confirmation_number?: string;
          error?: string;
          details?: string;
        };
        if (!res.ok || !data.success) {
          const errMsg = data.details ?? data.error ?? "Server rejected the request.";
          setSubmitting(false);
          router.push({ pathname: "/payment/error", params: { message: errMsg } });
          return;
        }
        backendOk = true;
        if (data.confirmation_number) confNum = data.confirmation_number;
      } else {
        // No Plaid bank linked — confirm local-only with the user before continuing
        await new Promise<void>((resolve) =>
          Alert.alert(
            "No bank linked to backend",
            "This payment will be saved locally only. Link a bank in Settings to enable real ACH scheduling.",
            [{ text: "Continue", onPress: () => resolve() }],
          ),
        );
      }
    } catch {
      setSubmitting(false);
      router.push({
        pathname: "/payment/error",
        params: { message: "Network connection lost. Could not reach the payment server." },
      });
      return;
    }

    addScheduledPayment({ ...pendingPayment });
    setPendingPayment(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(false);
    router.replace({ pathname: "/payment/confirm", params: { confirmationNumber: confNum } });
  };

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.pageTitle}>Payment Review</Text>
            <Text style={styles.pageSubtitle}>Confirm all details before proceeding</Text>
          </View>
        </View>

        {/* Bank info */}
        {bank && (
          <View style={styles.bankRow}>
            <View style={styles.bankIcon}>
              <Feather name="database" size={18} color={Colors.primary} />
            </View>
            <View style={styles.bankInfo}>
              <Text style={styles.bankName}>{bank.bankName}</Text>
              <Text style={styles.bankSub}>
                {bank.accountType.charAt(0).toUpperCase() + bank.accountType.slice(1)} ···{bank.lastFour}
                {bank.nickname ? `  ·  ${bank.nickname}` : ""}
              </Text>
            </View>
            <View style={styles.achBadge}>
              <Text style={styles.achText}>ACH</Text>
            </View>
          </View>
        )}

        {/* Cards included */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cards Being Paid</Text>
          {selectedCards.map((card) => (
            <View key={card.id} style={styles.cardRow}>
              <View style={[styles.cardDot, { backgroundColor: card.color[1] }]} />
              <Text style={styles.cardName}>{card.name} ···{card.lastFour}</Text>
              <Text style={styles.cardAmt}>
                {formatCurrency(pendingPayment?.amounts[card.id] ?? 0)}
              </Text>
            </View>
          ))}
        </View>

        {/* Fee breakdown */}
        <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
        <View style={styles.feeCard}>
          <ScrambleRow label="Card Balance Total" value={cardBalanceTotal} delay={300} onReveal={onReveal} />
          <View style={styles.feeDivider} />
          <ScrambleRow
            label={lateFees > 0 ? "Late Fee (high utilization)" : "Late Fees"}
            value={lateFees}
            delay={700}
            color={lateFees > 0 ? Colors.negative : Colors.textSecondary}
            onReveal={onReveal}
          />
          <View style={styles.feeDivider} />
          <ScrambleRow label="Platform Fee (0.5%)" value={platformFee} delay={1100} onReveal={onReveal} />
          <View style={styles.feeDivider} />
          <ScrambleRow
            label={achFee === 0 ? "ACH Transfer Fee · Free" : "ACH Transfer Fee"}
            value={achFee}
            delay={1500}
            color={achFee === 0 ? Colors.positive : Colors.textSecondary}
            onReveal={onReveal}
          />
          <View style={[styles.feeDivider, styles.feeDividerBold]} />
          <ScrambleRow label="Total Amount Due" value={grandTotal} delay={1900} isTotal onReveal={onReveal} />
        </View>

        {/* ACH settlement timeline disclosure */}
        <View style={feeS.disclosureCard}>
          <View style={feeS.disclosureHeader}>
            <Feather name="info" size={14} color={Colors.primary} />
            <Text style={feeS.disclosureTitle}>Settlement Timeline</Text>
          </View>
          <View style={feeS.timelineRow}>
            <View style={feeS.timelineDot} />
            <View style={feeS.timelineInfo}>
              <Text style={feeS.timelineLabel}>Today</Text>
              <Text style={feeS.timelineText}>Authorization & ACH debit initiated</Text>
            </View>
          </View>
          <View style={feeS.timelineConnector} />
          <View style={feeS.timelineRow}>
            <View style={[feeS.timelineDot, { backgroundColor: "#F59E0B" }]} />
            <View style={feeS.timelineInfo}>
              <Text style={feeS.timelineLabel}>1–3 business days</Text>
              <Text style={feeS.timelineText}>Funds clear and transfer to card issuer</Text>
            </View>
          </View>
          <View style={feeS.timelineConnector} />
          <View style={feeS.timelineRow}>
            <View style={[feeS.timelineDot, { backgroundColor: Colors.positive }]} />
            <View style={feeS.timelineInfo}>
              <Text style={feeS.timelineLabel}>Settlement complete</Text>
              <Text style={feeS.timelineText}>Card balance reduced by paid amount</Text>
            </View>
          </View>
          <Text style={feeS.disclosureFootnote}>
            Per Reg E, you may dispute any unauthorized ACH debit within 60 days of your statement.
            Tap "Report a Problem" in Settings to start a dispute.
          </Text>
        </View>

        {!allRevealed && (
          <View style={styles.loadingHint}>
            <Feather name="loader" size={14} color={Colors.textMuted} />
            <Text style={styles.loadingText}>Calculating your payment details…</Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            onPress={handleConfirm}
            disabled={!allRevealed}
            style={({ pressed }) => [pressed && allRevealed && { opacity: 0.88 }]}
          >
            <LinearGradient
              colors={allRevealed ? ["#16A34A", "#22C55E"] : ["#2D2D4A", "#2D2D4A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGrad}
            >
              <Feather
                name={allRevealed ? "check-circle" : "clock"}
                size={20}
                color={allRevealed ? "#fff" : Colors.textMuted}
              />
              <View>
                <Text style={[styles.confirmLabel, !allRevealed && { color: Colors.textMuted }]}>
                  {allRevealed ? "Confirm Payment" : "Calculating…"}
                </Text>
                {allRevealed && (
                  <Text style={styles.confirmAmt}>{formatCurrency(grandTotal)} total</Text>
                )}
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const feeS = StyleSheet.create({
  disclosureCard: {
    backgroundColor: "rgba(108,158,255,0.06)",
    borderColor: "rgba(108,158,255,0.18)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    marginHorizontal: 20,
  },
  disclosureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  disclosureTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  timelineInfo: { flex: 1 },
  timelineLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textPrimary,
  },
  timelineText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  timelineConnector: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginLeft: 4,
  },
  disclosureFootnote: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
});

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: { paddingHorizontal: 20 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(108,158,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bankInfo: { flex: 1, gap: 2 },
  bankName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  bankSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  achBadge: {
    backgroundColor: "rgba(74,222,170,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(74,222,170,0.25)",
  },
  achText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: Colors.positive,
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    fontSize: 13,
    color: Colors.textPrimary,
  },
  breakdownTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  feeCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
    marginBottom: 14,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  feeRowTotal: {
    paddingVertical: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  feeLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  feeLabelTotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  feeValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    minWidth: 80,
    textAlign: "right",
  },
  feeValueTotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  feeValueScramble: {
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  feeDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 16,
  },
  feeDividerBold: {
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  loadingHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 4,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "rgba(26,16,63,0.95)",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  confirmGrad: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  confirmLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  confirmAmt: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
});
