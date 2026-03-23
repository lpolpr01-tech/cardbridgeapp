import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import type { BankAccount } from "@/context/FinanceContext";

const BANK_ICONS: Record<string, string> = {
  "Chase Bank": "🏦",
  "Bank of America": "🏦",
  "Wells Fargo": "🏦",
  "Citi Bank": "🏦",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function AddBankModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { addBankAccount } = useFinance();
  const insets = useSafeAreaInsets();
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<"checking" | "savings">("checking");
  const [lastFour, setLastFour] = useState("");
  const [nickname, setNickname] = useState("");
  const [routing, setRouting] = useState("");

  const handleAdd = () => {
    if (!bankName.trim() || lastFour.length < 4) {
      Alert.alert("Required Fields", "Please enter your bank name and last 4 digits.");
      return;
    }
    addBankAccount({ bankName: bankName.trim(), accountType, lastFour: lastFour.slice(-4), nickname: nickname.trim() || undefined });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    setBankName(""); setLastFour(""); setNickname(""); setRouting("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={addBank.overlay}>
        <View style={[addBank.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={addBank.handle} />
          <View style={addBank.header}>
            <Text style={addBank.title}>Link Bank Account</Text>
            <Pressable onPress={onClose} style={addBank.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={addBank.achBadge}>
              <Feather name="shield" size={14} color={Colors.positive} />
              <Text style={addBank.achText}>ACH Secure Transfer · 256-bit encryption</Text>
            </View>

            <Text style={addBank.label}>Bank Name</Text>
            <TextInput style={addBank.input} value={bankName} onChangeText={setBankName} placeholder="e.g. Chase Bank" placeholderTextColor={Colors.textMuted} />

            <Text style={addBank.label}>Account Type</Text>
            <View style={addBank.typeRow}>
              {(["checking", "savings"] as const).map((t) => (
                <Pressable key={t} onPress={() => setAccountType(t)}
                  style={[addBank.typeBtn, accountType === t && addBank.typeBtnActive]}>
                  <Text style={[addBank.typeText, accountType === t && addBank.typeTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={addBank.label}>Last 4 Digits of Account</Text>
            <TextInput style={addBank.input} value={lastFour} onChangeText={setLastFour} placeholder="1234" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={4} />

            <Text style={addBank.label}>Routing Number</Text>
            <TextInput style={addBank.input} value={routing} onChangeText={setRouting} placeholder="123456789" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={9} />

            <Text style={addBank.label}>Nickname (optional)</Text>
            <TextInput style={addBank.input} value={nickname} onChangeText={setNickname} placeholder="e.g. My Primary Checking" placeholderTextColor={Colors.textMuted} />

            <Text style={addBank.disclaimer}>
              By linking your account you authorize ACH debit transactions. Your banking information is encrypted and never stored on our servers.
            </Text>

            <Pressable onPress={handleAdd} style={({ pressed }) => [addBank.saveBtn, pressed && { opacity: 0.8 }]}>
              <Feather name="link" size={16} color="#fff" />
              <Text style={addBank.saveBtnText}>Link Account</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function BankSelectScreen() {
  const { bankAccounts, pendingPayment, cards } = useFinance();
  const insets = useSafeAreaInsets();
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [addBankVisible, setAddBankVisible] = useState(false);

  const totalPayment = pendingPayment
    ? Object.values(pendingPayment.amounts).reduce((s, a) => s + a, 0)
    : 0;

  const selectedCardNames = pendingPayment
    ? cards
        .filter((c) => pendingPayment.cardIds.includes(c.id))
        .map((c) => `···${c.lastFour}`)
        .join(", ")
    : "";

  const handleProceed = () => {
    if (!selectedBankId) {
      Alert.alert("Select Bank", "Please choose a bank account to continue.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/payment/review",
      params: { bankAccountId: selectedBankId },
    });
  };

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.pageTitle}>Choose Bank Account</Text>
            <Text style={styles.pageSubtitle}>ACH transfer · typically 1–3 business days</Text>
          </View>
        </View>

        {pendingPayment && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cards</Text>
              <Text style={styles.summaryValue}>{selectedCardNames}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>{pendingPayment.date}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(totalPayment)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>Linked Bank Accounts</Text>

        {bankAccounts.map((bank) => {
          const isSelected = selectedBankId === bank.id;
          return (
            <Pressable
              key={bank.id}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedBankId(bank.id);
              }}
              style={[styles.bankCard, isSelected && styles.bankCardSelected]}
            >
              <View style={[styles.bankIcon, isSelected && styles.bankIconSelected]}>
                <Feather name="database" size={20} color={isSelected ? "#fff" : Colors.primary} />
              </View>
              <View style={styles.bankInfo}>
                <Text style={styles.bankName}>{bank.bankName}</Text>
                <Text style={styles.bankSub}>
                  {bank.accountType.charAt(0).toUpperCase() + bank.accountType.slice(1)} ···{bank.lastFour}
                  {bank.nickname ? `  ·  ${bank.nickname}` : ""}
                </Text>
              </View>
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => setAddBankVisible(true)}
          style={({ pressed }) => [styles.addBankBtn, pressed && { opacity: 0.7 }]}
        >
          <Feather name="plus-circle" size={18} color={Colors.primary} />
          <Text style={styles.addBankText}>Link a New Bank Account</Text>
        </Pressable>
      </ScrollView>

      {/* Proceed button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={handleProceed}
          style={({ pressed }) => [
            styles.proceedBtn,
            !selectedBankId && styles.proceedBtnDisabled,
            pressed && selectedBankId && { opacity: 0.88 },
          ]}
        >
          <LinearGradient
            colors={selectedBankId ? ["#2563EB", "#4F7FFF"] : ["#3A3A5A", "#3A3A5A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.proceedGrad}
          >
            <View style={styles.proceedContent}>
              <View>
                <Text style={styles.proceedLabel}>Proceed to Payment</Text>
                {totalPayment > 0 && (
                  <Text style={styles.proceedAmt}>{formatCurrency(totalPayment)} total</Text>
                )}
              </View>
              <Feather name="arrow-right" size={20} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      <AddBankModal visible={addBankVisible} onClose={() => setAddBankVisible(false)} />
    </LinearGradient>
  );
}

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
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  summaryTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  summaryTotal: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  summaryTotalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.primary,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  bankCardSelected: {
    borderColor: Colors.primaryDark,
    backgroundColor: "rgba(79,127,255,0.1)",
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "rgba(108,158,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bankIconSelected: {
    backgroundColor: Colors.primaryDark,
  },
  bankInfo: { flex: 1, gap: 3 },
  bankName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  bankSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.divider,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: Colors.primaryDark,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Colors.primaryDark,
  },
  addBankBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(108,158,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.2)",
    padding: 16,
    marginTop: 4,
  },
  addBankText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.primary,
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
  proceedBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  proceedBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedGrad: {
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  proceedContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  proceedLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  proceedAmt: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
});

const addBank = StyleSheet.create({
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
  achBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(74,222,170,0.1)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(74,222,170,0.2)",
    marginBottom: 20,
  },
  achText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.positive,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  typeBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  typeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  typeTextActive: { color: "#fff" },
  disclaimer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 8,
    marginBottom: 16,
    textAlign: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 8,
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
