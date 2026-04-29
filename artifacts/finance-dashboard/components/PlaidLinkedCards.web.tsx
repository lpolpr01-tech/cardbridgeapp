import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { useFinance, type PlaidLinkedAccount } from "@/context/FinanceContext";

// ─── Institution → clearbit domain mapping ────────────────────────────────────

const INST_DOMAIN: Record<string, string> = {
  "Chase":              "chase.com",
  "Bank of America":   "bankofamerica.com",
  "Wells Fargo":       "wellsfargo.com",
  "Citi":              "citi.com",
  "Citibank":          "citi.com",
  "Capital One":       "capitalone.com",
  "American Express":  "americanexpress.com",
  "Discover":          "discover.com",
  "TD Bank":           "td.com",
  "US Bank":           "usbank.com",
  "Ally":              "ally.com",
  "SoFi":              "sofi.com",
  "Marcus":            "marcus.com",
  "Goldman Sachs":     "goldmansachs.com",
  "Fidelity":          "fidelity.com",
  "Charles Schwab":    "schwab.com",
  "Navy Federal":      "navyfederal.org",
  "USAA":              "usaa.com",
  "PNC":               "pnc.com",
  "Truist":            "truist.com",
  "Citizens Bank":     "citizensbank.com",
  "Regions":           "regions.com",
  "KeyBank":           "key.com",
  "Santander":         "santander.com",
  "BMO Harris":        "bmoharris.com",
  "Fifth Third":       "53.com",
  "Huntington":        "huntington.com",
};

function getClearbitUrl(institutionName: string): string | null {
  if (!institutionName) return null;
  const domain = INST_DOMAIN[institutionName]
    ?? Object.entries(INST_DOMAIN).find(([k]) => institutionName.toLowerCase().includes(k.toLowerCase()))?.[1];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

function InstitutionLogo({ name, size = 28, borderRadius = 8 }: { name: string; size?: number; borderRadius?: number }) {
  const [failed, setFailed] = useState(false);
  const url = getClearbitUrl(name);
  if (!url || failed) {
    return (
      <View style={[logoS.fallback, { width: size, height: size, borderRadius }]}>
        <Text style={logoS.fallbackText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius, backgroundColor: "#fff" }}
      onError={() => setFailed(true)}
      resizeMode="contain"
    />
  );
}

const logoS = StyleSheet.create({
  fallback: { backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  fallbackText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
});

const CARD_WIDTH = 230;
const CARD_HEIGHT = 148;
const CARD_GAP = 10;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

// ─── Plaid Link opener (web-only) ─────────────────────────────────────────────

function PlaidLinkOpener({
  token,
  onPlaidSuccess,
  onExit,
}: {
  token: string;
  onPlaidSuccess: PlaidLinkOnSuccess;
  onExit: () => void;
}) {
  const { open, ready } = usePlaidLink({ token, onSuccess: onPlaidSuccess, onExit });
  useEffect(() => {
    if (ready) open();
  }, [ready, open]);
  return null;
}

// ─── Card type gradients ──────────────────────────────────────────────────────

const TYPE_GRADIENTS: Record<string, [string, string]> = {
  depository: ["#1A4A8A", "#2563C4"],
  credit:     ["#5A2D9A", "#8B5CF6"],
  investment: ["#1A5F42", "#10B981"],
  loan:       ["#7A2A2A", "#EF4444"],
};

// ─── Single account card ──────────────────────────────────────────────────────

function AccountCard({
  account,
  isHidden,
  onToggleVisibility,
}: {
  account: PlaidLinkedAccount;
  isHidden: boolean;
  onToggleVisibility: () => void;
}) {
  const [c0, c1] = TYPE_GRADIENTS[account.type] ?? ["#2D1B69", "#1A103F"];
  const badge = account.subtype
    ? account.subtype.charAt(0).toUpperCase() + account.subtype.slice(1)
    : account.type.charAt(0).toUpperCase() + account.type.slice(1);
  const balance = account.balanceCurrent ?? account.balanceAvailable;
  const fadeAnim = useRef(new Animated.Value(isHidden ? 0.45 : 1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isHidden ? 0.45 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isHidden, fadeAnim]);

  return (
    <Animated.View style={[cardS.wrap, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={[c0, c1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cardS.grad}
      >
        {/* Decorative circle */}
        <View style={cardS.decorCircle} pointerEvents="none" />

        {/* Top row: logo + badge + visibility toggle */}
        <View style={cardS.topRow}>
          <InstitutionLogo name={account.institutionName ?? ""} size={28} borderRadius={7} />
          <View style={cardS.typeBadge}>
            <Text style={cardS.typeBadgeText}>{badge}</Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onToggleVisibility();
            }}
            style={({ pressed }) => [cardS.eyeBtn, pressed && { opacity: 0.7 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={isHidden ? "eye-off" : "eye"}
              size={14}
              color={isHidden ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.85)"}
            />
          </Pressable>
        </View>

        {/* Institution + account name */}
        <View style={cardS.mid}>
          <Text style={cardS.institution} numberOfLines={1}>
            {account.institutionName}
          </Text>
          <Text style={cardS.name} numberOfLines={1}>
            {account.officialName ?? account.name}
          </Text>
        </View>

        {/* Bottom row: mask + balance */}
        <View style={cardS.bottomRow}>
          <Text style={cardS.mask}>
            {account.mask ? `•••• ${account.mask}` : "••••"}
          </Text>
          {balance != null && (
            <Text style={cardS.balance}>
              {isHidden
                ? "••••"
                : new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(balance)}
            </Text>
          )}
        </View>

        {/* Hidden overlay badge */}
        {isHidden && (
          <View style={cardS.hiddenBadge}>
            <Feather name="eye-off" size={10} color="rgba(255,255,255,0.7)" />
            <Text style={cardS.hiddenBadgeText}>Hidden</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

// ─── "Link Another Bank" add card ─────────────────────────────────────────────

function AddBankCard({
  onPress,
  loading,
}: {
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [cardS.addWrap, pressed && { opacity: 0.75 }]}
    >
      <LinearGradient
        colors={["rgba(108,158,255,0.10)", "rgba(79,127,255,0.04)"]}
        style={cardS.addGrad}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            <View style={cardS.addIcon}>
              <Feather name="plus" size={20} color={Colors.primary} />
            </View>
            <Text style={cardS.addLabel}>Link Bank</Text>
            <View style={cardS.addPlaidRow}>
              <Text style={cardS.addPlaidPowered}>Secured by</Text>
              <View style={cardS.addPlaidBadge}>
                <Text style={cardS.addPlaidText}>plaid</Text>
              </View>
            </View>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ─── Dot indicator ────────────────────────────────────────────────────────────

function DotIndicator({
  total,
  active,
}: {
  total: number;
  active: number;
}) {
  if (total <= 1) return null;
  return (
    <View style={dotS.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotS.dot,
            i === active
              ? dotS.dotActive
              : dotS.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Per-institution rolodex carousel ────────────────────────────────────────

function InstitutionCarousel({
  institutionName,
  accounts,
  hiddenIds,
  onToggle,
  onAddBank,
  addLoading,
  isLastGroup,
}: {
  institutionName: string;
  accounts: PlaidLinkedAccount[];
  hiddenIds: string[];
  onToggle: (id: string) => void;
  onAddBank: () => void;
  addLoading: boolean;
  isLastGroup: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleCount = accounts.filter((a) => !hiddenIds.includes(a.accountId)).length;

  return (
    <View style={groupS.wrap}>
      {/* Institution header */}
      <View style={groupS.header}>
        <InstitutionLogo name={institutionName} size={24} borderRadius={6} />
        <Text style={groupS.name} numberOfLines={1}>
          {institutionName}
        </Text>
        <View style={groupS.connectedDot} />
        <Text style={groupS.connectedText}>Connected</Text>
        <View style={groupS.countBadge}>
          <Text style={groupS.countText}>
            {visibleCount}/{accounts.length} shown
          </Text>
        </View>
      </View>

      {/* Rolodex scroll */}
      <ScrollView
        horizontal
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={groupS.scrollContent}
        onScroll={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / SNAP_INTERVAL
          );
          setActiveIndex(Math.max(0, Math.min(idx, accounts.length - 1)));
        }}
        scrollEventThrottle={16}
      >
        {accounts.map((account) => (
          <AccountCard
            key={account.accountId}
            account={account}
            isHidden={hiddenIds.includes(account.accountId)}
            onToggleVisibility={() => onToggle(account.accountId)}
          />
        ))}
        {/* "Link Another Bank" only appears after the last group */}
        {isLastGroup && (
          <AddBankCard onPress={onAddBank} loading={addLoading} />
        )}
      </ScrollView>

      {/* Position indicator */}
      <DotIndicator total={accounts.length} active={activeIndex} />
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function PlaidLinkedCards() {
  const { plaidAccounts, hiddenPlaidAccountIds, addPlaidAccounts, togglePlaidAccountVisibility } =
    useFinance();
  const { isAuthenticated, token } = useAuth();
  const [linkLoading, setLinkLoading] = useState(false);
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);

  const fetchLinkToken = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) return null;
    try {
      const res = await fetch(apiUrl("/api/plaid/link-token"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        Alert.alert("Plaid Error", err.error ?? "Could not start bank linking.");
        return null;
      }
      return ((await res.json()) as { link_token: string }).link_token;
    } catch {
      Alert.alert(
        "Network Error",
        "Could not reach the API server.\nCheck EXPO_PUBLIC_API_BASE_URL."
      );
      return null;
    }
  }, [isAuthenticated]);

  const exchangeToken = useCallback(
    async (publicToken: string, institutionName: string) => {
      if (!isAuthenticated) return;
      try {
        const res = await fetch(apiUrl("/api/plaid/exchange"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            public_token: publicToken,
            institution_name: institutionName,
          }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          Alert.alert("Linking Error", err.error ?? "Could not link the account.");
          return;
        }
        const data = (await res.json()) as { accounts: PlaidLinkedAccount[] };
        addPlaidAccounts(data.accounts);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Bank Linked!",
          `${data.accounts.length} account${data.accounts.length !== 1 ? "s" : ""} added from ${institutionName}.`
        );
      } catch {
        Alert.alert("Error", "Failed to link bank account.");
      }
    },
    [isAuthenticated, token, addPlaidAccounts]
  );

  const handleAddBankPress = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    if (Platform.OS !== "web") {
      Alert.alert(
        "Web Only",
        "Plaid bank linking is available in the web version of this app."
      );
      return;
    }
    setLinkLoading(true);
    const lt = await fetchLinkToken();
    setLinkLoading(false);
    if (lt) setPlaidLinkToken(lt);
  }, [isAuthenticated, fetchLinkToken]);

  const onPlaidSuccess = useCallback<PlaidLinkOnSuccess>(
    (public_token, metadata) => {
      setPlaidLinkToken(null);
      void exchangeToken(
        public_token,
        metadata.institution?.name ?? "Linked Bank"
      );
    },
    [exchangeToken]
  );

  // Group accounts by institution
  const institutionGroups = React.useMemo(() => {
    const map = new Map<string, PlaidLinkedAccount[]>();
    for (const account of plaidAccounts) {
      const key = account.institutionName;
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, account]);
    }
    return Array.from(map.entries()).map(([name, accounts]) => ({ name, accounts }));
  }, [plaidAccounts]);

  // On native with no accounts, render nothing
  if (Platform.OS !== "web" && plaidAccounts.length === 0) return null;

  const totalVisible = plaidAccounts.filter(
    (a) => !hiddenPlaidAccountIds.includes(a.accountId)
  ).length;

  return (
    <View style={s.container}>
      {/* Section header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.sectionTitle}>Linked Banks</Text>
          <Text style={s.sectionSub}>
            {plaidAccounts.length > 0
              ? `${totalVisible} of ${plaidAccounts.length} account${plaidAccounts.length !== 1 ? "s" : ""} visible`
              : "Securely link your bank via Plaid"}
          </Text>
        </View>
        {isAuthenticated && (
          <View style={s.badge}>
            <Feather name="shield" size={11} color={Colors.positive} />
            <Text style={s.badgeText}>Plaid · Sandbox</Text>
          </View>
        )}
      </View>

      {/* Institution carousels */}
      {institutionGroups.length > 0 ? (
        institutionGroups.map((group, idx) => (
          <InstitutionCarousel
            key={group.name}
            institutionName={group.name}
            accounts={group.accounts}
            hiddenIds={hiddenPlaidAccountIds}
            onToggle={togglePlaidAccountVisibility}
            onAddBank={handleAddBankPress}
            addLoading={linkLoading}
            isLastGroup={idx === institutionGroups.length - 1}
          />
        ))
      ) : (
        /* No banks linked yet — show the add card */
        Platform.OS === "web" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
          >
            <AddBankCard onPress={handleAddBankPress} loading={linkLoading} />
          </ScrollView>
        )
      )}

      {/* Plaid Link opener */}
      {Platform.OS === "web" && plaidLinkToken && (
        <PlaidLinkOpener
          token={plaidLinkToken}
          onPlaidSuccess={onPlaidSuccess}
          onExit={() => setPlaidLinkToken(null)}
        />
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { marginTop: 14, marginBottom: 4 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sectionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(74,222,170,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(74,222,170,0.2)",
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.positive,
  },
});

const groupS = StyleSheet.create({
  wrap: { marginTop: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  institutionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(108,158,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  connectedDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#4ADEAA" },
  connectedText: { fontFamily: "Inter_500Medium", fontSize: 11, color: "#4ADEAA" },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  countText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
  },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 12,
    gap: CARD_GAP,
    alignItems: "flex-start",
  },
});

const cardS = StyleSheet.create({
  wrap: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  grad: {
    flex: 1,
    padding: 14,
  },
  decorCircle: {
    position: "absolute",
    bottom: -18,
    right: -18,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eyeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  mid: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  institution: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "rgba(255,255,255,0.95)",
  },
  name: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  mask: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
  },
  balance: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  hiddenBadge: {
    position: "absolute",
    top: 10,
    left: "50%" as any,
    transform: [{ translateX: -28 }],
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  hiddenBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  addWrap: {
    width: 118,
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(108,158,255,0.28)",
    borderStyle: "dashed",
  },
  addGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  addIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(108,158,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  addLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  addSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textSecondary,
  },
  addPlaidRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  addPlaidPowered: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },
  addPlaidBadge: {
    backgroundColor: "#00B4DB", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  addPlaidText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#fff", letterSpacing: 0.5 },
});

const dotS = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    marginBottom: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 14,
    borderRadius: 3,
  },
  dotInactive: {
    backgroundColor: Colors.divider,
  },
});
