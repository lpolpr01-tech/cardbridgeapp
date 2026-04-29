import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { useFinance, type PlaidLinkedAccount } from "@/context/FinanceContext";

// ─── Internal: Plaid Link opener ──────────────────────────────────────────────

function PlaidOpener({
  token,
  onSuccess,
  onExit,
}: {
  token: string;
  onSuccess: PlaidLinkOnSuccess;
  onExit: () => void;
}) {
  const { open, ready } = usePlaidLink({ token, onSuccess, onExit });
  useEffect(() => { if (ready) open(); }, [ready, open]);
  return null;
}

// ─── Public component ─────────────────────────────────────────────────────────

export function PlaidAddBankButton({ style }: { style?: any }) {
  const { isAuthenticated, token: authToken } = useAuth();
  const { addPlaidAccounts } = useFinance();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState(false);

  const fetchToken = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert("Not signed in", "Please sign in to link a bank account.");
      return;
    }
    setLoading(true);
    setErrorMsg(false);
    try {
      const res = await fetch(apiUrl("/api/plaid/link-token"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      if (!res.ok) {
        setErrorMsg(true);
        return;
      }
      const { link_token } = await res.json() as { link_token: string };
      setLinkToken(link_token);
    } catch {
      setErrorMsg(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authToken]);

  const handleSuccess: PlaidLinkOnSuccess = useCallback(async (publicToken, metadata) => {
    const instName = metadata.institution?.name ?? "Linked Bank";
    try {
      const res = await fetch(apiUrl("/api/plaid/exchange"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ public_token: publicToken, institution_name: instName }),
      });
      if (res.ok) {
        const data = await res.json() as { accounts?: PlaidLinkedAccount[] };
        if (data.accounts?.length) addPlaidAccounts(data.accounts);
      }
    } catch { }
    setLinkToken(null);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [authToken, addPlaidAccounts]);

  const handleExit = useCallback(() => {
    setLinkToken(null);
    setErrorMsg(true);
    setTimeout(() => setErrorMsg(false), 4000);
  }, []);

  return (
    <>
      {linkToken && (
        <PlaidOpener token={linkToken} onSuccess={handleSuccess} onExit={handleExit} />
      )}

      {successMsg && (
        <View style={s.toast}>
          <Feather name="check-circle" size={14} color="#4ADEAA" />
          <Text style={s.toastText}>Bank linked successfully</Text>
        </View>
      )}
      {errorMsg && (
        <View style={[s.toast, s.toastError]}>
          <Feather name="x-circle" size={14} color="#FF6B8A" />
          <Text style={[s.toastText, { color: "#FF6B8A" }]}>Bank linking was cancelled. Please try again.</Text>
        </View>
      )}

      <Pressable
        onPress={fetchToken}
        disabled={loading}
        style={({ pressed }) => [s.addBtn, style, pressed && { opacity: 0.75 }]}
      >
        <Feather name="plus" size={15} color={Colors.primary} />
        <Text style={s.addBtnText}>{loading ? "Connecting…" : "＋ Add Another Bank Account"}</Text>
      </Pressable>
    </>
  );
}

const s = StyleSheet.create({
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: `${Colors.primary}50`,
    paddingVertical: 13, paddingHorizontal: 16, marginTop: 4,
    backgroundColor: "rgba(108,158,255,0.07)",
  },
  addBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
  toast: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(74,222,170,0.12)", borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(74,222,170,0.3)", padding: 12, marginBottom: 8,
  },
  toastError: { backgroundColor: "rgba(255,107,138,0.1)", borderColor: "rgba(255,107,138,0.3)" },
  toastText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#4ADEAA", flex: 1 },
});
