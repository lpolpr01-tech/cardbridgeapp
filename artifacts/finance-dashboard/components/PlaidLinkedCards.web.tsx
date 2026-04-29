import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { useFinance, type PlaidLinkedAccount } from "@/context/FinanceContext";

// ─── Beta login credentials pre-filled for sandbox testing ───────────────────
const BETA_EMAIL = (process.env["EXPO_PUBLIC_BETA_EMAIL"] as string | undefined) ?? "beta@finapp.com";
const BETA_PASSWORD = (process.env["EXPO_PUBLIC_BETA_PASSWORD"] as string | undefined) ?? "BetaTest2025!";

// ─── Plaid Link opener (web-only) ─────────────────────────────────────────────
// This component is only rendered when Platform.OS === 'web' and we have a link token.
// Defined at module scope so React can track its identity stably.
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

// ─── Inline beta auth modal ───────────────────────────────────────────────────
function LoginModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState(BETA_EMAIL);
  const [password, setPassword] = useState(BETA_PASSWORD);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e: unknown) {
      Alert.alert("Login failed", (e as Error).message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={loginS.overlay}>
        <View style={loginS.sheet}>
          <View style={loginS.handle} />
          <View style={loginS.header}>
            <Text style={loginS.title}>Sign In to Link Bank</Text>
            <Pressable onPress={onClose} style={loginS.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <View style={loginS.badge}>
            <Feather name="shield" size={14} color={Colors.positive} />
            <Text style={loginS.badgeText}>Beta access · Plaid Sandbox</Text>
          </View>
          <Text style={loginS.label}>Email</Text>
          <TextInput
            style={loginS.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={loginS.label}>Password</Text>
          <TextInput
            style={loginS.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={Colors.textMuted}
          />
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [loginS.btn, pressed && { opacity: 0.8 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={loginS.btnText}>Sign In</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Account card colours by Plaid account type ───────────────────────────────
const TYPE_GRADIENTS: Record<string, [string, string]> = {
  depository: ["#1E5FAD", "#2C7DD6"],
  credit: ["#6C3DB8", "#9B5CF5"],
  investment: ["#2A7A5B", "#3EC48A"],
  loan: ["#8B3A3A", "#C05050"],
};

function AccountCard({ account }: { account: PlaidLinkedAccount }) {
  const [c0, c1] = TYPE_GRADIENTS[account.type] ?? ["#2D1B69", "#1A103F"];
  const badge = account.subtype
    ? account.subtype.charAt(0).toUpperCase() + account.subtype.slice(1)
    : account.type.charAt(0).toUpperCase() + account.type.slice(1);
  const balance = account.balanceCurrent ?? account.balanceAvailable;

  return (
    <View style={cardS.wrap}>
      <LinearGradient colors={[c0, c1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardS.grad}>
        <View style={cardS.topRow}>
          <View style={cardS.iconBg}>
            <Feather name="credit-card" size={15} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={cardS.typeBadge}>
            <Text style={cardS.typeBadgeText}>{badge}</Text>
          </View>
        </View>
        <Text style={cardS.institution} numberOfLines={1}>{account.institutionName}</Text>
        <Text style={cardS.name} numberOfLines={1}>{account.officialName ?? account.name}</Text>
        <View style={cardS.bottomRow}>
          <Text style={cardS.mask}>{account.mask ? `•••• ${account.mask}` : "••••"}</Text>
          {balance != null && (
            <Text style={cardS.balance}>
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(balance)}
            </Text>
          )}
        </View>
        <View style={{ position: "absolute", bottom: -10, right: -10, opacity: 0.07 } as any}>
          <Feather name="circle" size={110} color="#fff" />
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── "Link Bank" add-card button ──────────────────────────────────────────────
function AddBankCard({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [cardS.addWrap, pressed && { opacity: 0.75 }]}
    >
      <LinearGradient
        colors={["rgba(108,158,255,0.12)", "rgba(79,127,255,0.05)"]}
        style={cardS.addGrad}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            <View style={cardS.addIcon}>
              <Feather name="plus" size={22} color={Colors.primary} />
            </View>
            <Text style={cardS.addLabel}>Link Bank</Text>
            <Text style={cardS.addSub}>via Plaid</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function PlaidLinkedCards() {
  const { plaidAccounts, addPlaidAccounts } = useFinance();
  const { token, isAuthenticated } = useAuth();
  const [loginVisible, setLoginVisible] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);

  const fetchLinkToken = useCallback(async (): Promise<string | null> => {
    if (!token) return null;
    try {
      const res = await fetch(apiUrl("/api/plaid/link-token"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        Alert.alert("Plaid Error", err.error ?? "Could not start bank linking.");
        return null;
      }
      return ((await res.json()) as { link_token: string }).link_token;
    } catch {
      Alert.alert("Network Error", "Could not reach the API server.\nCheck EXPO_PUBLIC_API_BASE_URL.");
      return null;
    }
  }, [token]);

  const exchangeToken = useCallback(
    async (publicToken: string, institutionName: string) => {
      if (!token) return;
      try {
        const res = await fetch(apiUrl("/api/plaid/exchange"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ public_token: publicToken, institution_name: institutionName }),
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
          `${data.accounts.length} account${data.accounts.length !== 1 ? "s" : ""} added from ${institutionName}.`,
        );
      } catch {
        Alert.alert("Error", "Failed to link bank account.");
      }
    },
    [token, addPlaidAccounts],
  );

  const handleAddBankPress = useCallback(async () => {
    if (!isAuthenticated) { setLoginVisible(true); return; }
    if (Platform.OS !== "web") {
      Alert.alert("Web Only", "Plaid bank linking is available in the web version of this app.");
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
      void exchangeToken(public_token, metadata.institution?.name ?? "Linked Bank");
    },
    [exchangeToken],
  );

  // On native or when there are no accounts to show, render nothing
  if (Platform.OS !== "web" && plaidAccounts.length === 0) return null;

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.sectionTitle}>Linked Banks</Text>
          <Text style={s.sectionSub}>
            {plaidAccounts.length > 0
              ? `${plaidAccounts.length} account${plaidAccounts.length !== 1 ? "s" : ""} via Plaid`
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {plaidAccounts.map((a) => <AccountCard key={a.accountId} account={a} />)}
        {Platform.OS === "web" && (
          <AddBankCard onPress={handleAddBankPress} loading={linkLoading} />
        )}
      </ScrollView>

      {/* PlaidLinkOpener is only mounted on web and only when we have a link token */}
      {Platform.OS === "web" && plaidLinkToken && (
        <PlaidLinkOpener
          token={plaidLinkToken}
          onPlaidSuccess={onPlaidSuccess}
          onExit={() => setPlaidLinkToken(null)}
        />
      )}

      <LoginModal visible={loginVisible} onClose={() => setLoginVisible(false)} />
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
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 2 },
  sectionSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(74,222,170,0.12)",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(74,222,170,0.2)",
  },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.positive },
  scroll: { paddingLeft: 20, paddingRight: 8, gap: 12, alignItems: "flex-start" },
});

const cardS = StyleSheet.create({
  wrap: {
    width: 210, height: 138, borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  grad: { flex: 1, padding: 16, justifyContent: "space-between" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBg: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center",
  },
  typeBadge: {
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  typeBadgeText: {
    fontFamily: "Inter_600SemiBold", fontSize: 10, color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  institution: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2 },
  name: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.65)" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mask: { fontFamily: "Inter_500Medium", fontSize: 13, color: "rgba(255,255,255,0.8)", letterSpacing: 1 },
  balance: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  addWrap: {
    width: 128, height: 138, borderRadius: 18, overflow: "hidden",
    borderWidth: 1.5, borderColor: "rgba(108,158,255,0.28)",
    borderStyle: "dashed",
  },
  addGrad: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  addIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(108,158,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  addLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary },
  addSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
});

const loginS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2,
    alignSelf: "center", marginBottom: 16,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center",
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(74,222,170,0.1)", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "rgba(74,222,170,0.2)", marginBottom: 20,
  },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.positive },
  label: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4,
  },
  input: {
    fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.divider, marginBottom: 12,
  },
  btn: { backgroundColor: Colors.primaryDark, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  btnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});
