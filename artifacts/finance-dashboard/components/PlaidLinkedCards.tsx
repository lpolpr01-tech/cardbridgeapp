import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";

type PlaidCreditCard = {
  accountId: string;
  name: string;
  mask: string | null;
  institutionName: string;
  balanceCurrent: number | null;
  balanceLimit: number | null;
  apr: number | null;
  minimumPayment: number | null;
  nextPaymentDueDate: string | null;
  cashbackTotal: number | null;
  pointsTotal: number | null;
};

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function PlaidLinkedCards() {
  const { isAuthenticated, token: authToken } = useAuth();
  const [cards, setCards] = useState<PlaidCreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/plaid/credit-cards"), {
        method: "GET",
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      });
      if (res.ok) {
        const data = (await res.json()) as { cards: PlaidCreditCard[] };
        setCards(data.cards ?? []);
      }
    } catch {
      // Network error — silently render empty state
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authToken]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  if (loading) {
    return (
      <View style={s.loadingBlock}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (cards.length === 0) {
    // Don't render anything when no Plaid credit cards are linked — keeps the
    // home tab clean. The "Add Bank Account" button lives in Settings.
    return null;
  }

  return (
    <View style={s.wrap}>
      <View style={s.headerRow}>
        <Text style={s.title}>Bank-Linked Cards</Text>
        <Pressable
          onPress={() => router.push("/linked-cards")}
          style={({ pressed }) => [s.viewAllBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.viewAllText}>View all</Text>
          <Feather name="arrow-right" size={13} color={Colors.primary} />
        </Pressable>
      </View>

      {cards.slice(0, 3).map((c) => (
        <Pressable
          key={c.accountId}
          onPress={() => router.push({ pathname: "/card-detail/[id]", params: { id: c.accountId } })}
          style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={["#1E5FAD", "#3E8EDD"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.cardChip}
          >
            <Feather name="credit-card" size={14} color="#fff" />
          </LinearGradient>
          <View style={s.info}>
            <Text style={s.cardName} numberOfLines={1}>
              {c.name}
              {c.mask ? ` ···${c.mask}` : ""}
            </Text>
            <Text style={s.cardSub} numberOfLines={1}>
              {c.institutionName}
              {c.apr != null ? ` · APR ${c.apr.toFixed(2)}%` : ""}
            </Text>
          </View>
          <View style={s.right}>
            <Text style={s.balance}>{formatCurrency(c.balanceCurrent)}</Text>
            {c.balanceLimit != null && (
              <Text style={s.limitText}>of {formatCurrency(c.balanceLimit)}</Text>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  loadingBlock: {
    paddingVertical: 16,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.primary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  cardChip: {
    width: 40,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, minWidth: 0, gap: 2 },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  right: { alignItems: "flex-end", flexShrink: 0 },
  balance: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  limitText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, marginTop: 1 },
});
