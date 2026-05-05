import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useFinance, type PlaidCreditCard } from "@/context/FinanceContext";
import { useTheme } from "@/context/ThemeContext";
import { PlaidAddBankButton } from "@/components/PlaidAddBankButton";

const BG_DAMASK = require("../../assets/images/bg-damask.png");

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyExact(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffMs = d.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function utilizationColor(pct: number): string {
  if (pct >= 70) return "#FF6B8A";
  if (pct >= 30) return "#F59E0B";
  return "#4ADEAA";
}

// ─── Card tile ────────────────────────────────────────────────────────────────

function CardTile({ card }: { card: PlaidCreditCard }) {
  const balance = card.balanceCurrent ?? 0;
  const limit = card.balanceLimit;
  const usagePct = limit && limit > 0 ? Math.min((balance / limit) * 100, 100) : 0;
  const utilTint = utilizationColor(usagePct);
  const due = daysUntil(card.nextPaymentDueDate);
  const dueIsUrgent = due != null && due <= 7;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push({ pathname: "/card-detail/[id]", params: { id: card.accountId } });
      }}
      style={({ pressed }) => [s.tile, pressed && { opacity: 0.85 }]}
    >
      <View style={s.tileTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName} numberOfLines={1}>{card.name}</Text>
          <Text style={s.cardSub} numberOfLines={1}>
            {card.institutionName}
            {card.mask ? ` · •••• ${card.mask}` : ""}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={Colors.textMuted} />
      </View>

      <View style={s.tileBalanceRow}>
        <Text style={s.balanceMain}>{formatCurrencyExact(balance)}</Text>
        {limit ? (
          <Text style={s.balanceLimit}> / {formatCurrency(limit)}</Text>
        ) : null}
      </View>

      {limit ? (
        <>
          <View style={s.progressBg}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${Math.max(usagePct, 2)}%` as any,
                  backgroundColor: utilTint,
                },
              ]}
            />
          </View>
          <Text style={[s.utilText, { color: utilTint }]}>
            {usagePct.toFixed(0)}% utilization
          </Text>
        </>
      ) : (
        <Text style={s.utilText}>Credit limit not reported</Text>
      )}

      <View style={s.tileFooter}>
        <View style={s.footerCol}>
          <Text style={s.footerLabel}>Min Payment</Text>
          <Text style={s.footerValue}>
            {card.minimumPayment != null ? formatCurrencyExact(card.minimumPayment) : "—"}
          </Text>
        </View>
        <View style={s.footerCol}>
          <Text style={s.footerLabel}>Due</Text>
          <Text
            style={[
              s.footerValue,
              dueIsUrgent && { color: "#FF6B8A" },
            ]}
          >
            {card.nextPaymentDueDate ? (
              <>
                {formatDate(card.nextPaymentDueDate)}
                {due != null && due >= 0 && due <= 14 ? (
                  <Text style={[s.footerSub, dueIsUrgent && { color: "#FF6B8A" }]}>
                    {"  "}({due === 0 ? "today" : `in ${due}d`})
                  </Text>
                ) : null}
              </>
            ) : (
              "—"
            )}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Feather name="credit-card" size={32} color={Colors.primary} />
      </View>
      <Text style={s.emptyTitle}>Link your bank to get started</Text>
      <Text style={s.emptyBody}>
        Connect a credit card via Plaid to see live balances, due dates, APR, and rewards. Your data
        comes straight from your bank — nothing is hardcoded.
      </Text>
      <View style={s.emptyCta}>
        <PlaidAddBankButton />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CardListScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveBgStart, effectiveBgEnd } = useTheme();
  const { plaidCards, loadingCards, cardsError, refreshCards, refreshBankAccounts } = useFinance();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshCards(), refreshBankAccounts()]);
    setRefreshing(false);
  }, [refreshCards, refreshBankAccounts]);

  const totalBalance = useMemo(
    () => plaidCards.reduce((sum, c) => sum + (c.balanceCurrent ?? 0), 0),
    [plaidCards],
  );
  const totalLimit = useMemo(
    () => plaidCards.reduce((sum, c) => sum + (c.balanceLimit ?? 0), 0),
    [plaidCards],
  );
  const overallUtil = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  const isEmpty = !loadingCards && plaidCards.length === 0;

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
      <Image source={BG_DAMASK} style={s.bgTexture} resizeMode="cover" />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={s.header}>
          <Text style={s.title}>My Cards</Text>
          {plaidCards.length > 0 && (
            <Text style={s.subtitle}>
              {plaidCards.length} card{plaidCards.length === 1 ? "" : "s"} linked
            </Text>
          )}
        </View>

        {plaidCards.length > 0 && (
          <View style={s.totalCard}>
            <Text style={s.totalLabel}>Total Balance</Text>
            <Text style={s.totalValue}>{formatCurrencyExact(totalBalance)}</Text>
            {totalLimit > 0 && (
              <View style={s.totalUtilRow}>
                <Text style={s.totalUtilLabel}>
                  {formatCurrency(totalBalance)} of {formatCurrency(totalLimit)} used
                </Text>
                <Text style={[s.totalUtilPct, { color: utilizationColor(overallUtil) }]}>
                  {overallUtil.toFixed(0)}%
                </Text>
              </View>
            )}
          </View>
        )}

        {loadingCards && plaidCards.length === 0 && (
          <View style={s.loadingBlock}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={s.loadingText}>Loading your cards…</Text>
          </View>
        )}

        {cardsError && (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color="#FF6B8A" />
            <Text style={s.errorText}>{cardsError}</Text>
          </View>
        )}

        {plaidCards.map((c) => (
          <CardTile key={c.accountId} card={c} />
        ))}

        {plaidCards.length > 0 && (
          <View style={s.addMoreWrap}>
            <PlaidAddBankButton />
          </View>
        )}

        {isEmpty && !cardsError && <EmptyState />}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  bgTexture: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.09,
  },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 16 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  totalCard: {
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    padding: 20,
    marginBottom: 16,
  },
  totalLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  totalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  totalUtilRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  totalUtilLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  totalUtilPct: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  tile: {
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    padding: 18,
    marginBottom: 12,
  },
  tileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tileBalanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  balanceMain: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  balanceLimit: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  progressBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  utilText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginBottom: 12,
  },
  tileFooter: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },
  footerCol: { flex: 1 },
  footerLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  footerValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  footerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  loadingBlock: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textMuted,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,107,138,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,107,138,0.25)",
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#FF6B8A",
    flex: 1,
  },
  addMoreWrap: { marginTop: 8 },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(108,158,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(108,158,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  emptyCta: {
    width: "100%",
    marginTop: 16,
  },
});
