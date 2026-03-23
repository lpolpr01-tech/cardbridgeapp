import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import type { BankAccount } from "@/context/FinanceContext";

type SettingRowProps = {
  icon: string;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
};

function SettingRow({
  icon,
  label,
  subtitle,
  value,
  onPress,
  showChevron = true,
  toggle,
  toggleValue,
  onToggle,
}: SettingRowProps) {
  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          Haptics.selectionAsync();
          onPress();
        }
      }}
      style={({ pressed }) => [
        styles.settingRow,
        pressed && styles.settingRowPressed,
      ]}
    >
      <View style={styles.settingIcon}>
        <Feather name={icon as any} size={18} color={Colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle ? (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {value && !toggle ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : null}
      {toggle ? (
        <Switch
          value={!!toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.divider, true: Colors.primaryDark }}
          thumbColor="#fff"
        />
      ) : showChevron ? (
        <Feather name="chevron-right" size={16} color={Colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function AddBankModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { addBankAccount } = useFinance();
  const insets = useSafeAreaInsets();
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<"checking" | "savings">("checking");
  const [lastFour, setLastFour] = useState("");
  const [routing, setRouting] = useState("");
  const [nickname, setNickname] = useState("");

  const handleAdd = () => {
    if (!bankName.trim() || lastFour.length < 4) {
      Alert.alert("Required Fields", "Please enter the bank name and last 4 digits of your account.");
      return;
    }
    addBankAccount({ bankName: bankName.trim(), accountType, lastFour: lastFour.slice(-4), nickname: nickname.trim() || undefined });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    setBankName(""); setLastFour(""); setNickname(""); setRouting("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={bankModal.overlay}>
        <View style={[bankModal.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={bankModal.handle} />
          <View style={bankModal.header}>
            <Text style={bankModal.title}>Link Bank Account</Text>
            <Pressable onPress={onClose} style={bankModal.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={bankModal.achBadge}>
              <Feather name="shield" size={13} color={Colors.positive} />
              <Text style={bankModal.achText}>ACH Secure Transfer · 256-bit Encryption</Text>
            </View>
            <Text style={bankModal.fieldLabel}>Bank Name</Text>
            <TextInput style={bankModal.input} value={bankName} onChangeText={setBankName} placeholder="e.g. Chase Bank" placeholderTextColor={Colors.textMuted} />
            <Text style={bankModal.fieldLabel}>Account Type</Text>
            <View style={bankModal.typeRow}>
              {(["checking", "savings"] as const).map((t) => (
                <Pressable key={t} onPress={() => setAccountType(t)} style={[bankModal.typeBtn, accountType === t && bankModal.typeBtnActive]}>
                  <Text style={[bankModal.typeText, accountType === t && bankModal.typeTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={bankModal.fieldLabel}>Last 4 Account Digits</Text>
            <TextInput style={bankModal.input} value={lastFour} onChangeText={setLastFour} placeholder="1234" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={4} />
            <Text style={bankModal.fieldLabel}>Routing Number</Text>
            <TextInput style={bankModal.input} value={routing} onChangeText={setRouting} placeholder="123456789" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={9} />
            <Text style={bankModal.fieldLabel}>Nickname (optional)</Text>
            <TextInput style={bankModal.input} value={nickname} onChangeText={setNickname} placeholder="e.g. Primary Checking" placeholderTextColor={Colors.textMuted} />
            <Text style={bankModal.disclaimer}>
              By linking your account you authorize ACH debit transactions. Banking information is encrypted and never stored on our servers.
            </Text>
            <Pressable onPress={handleAdd} style={({ pressed }) => [bankModal.saveBtn, pressed && { opacity: 0.8 }]}>
              <Feather name="link" size={16} color="#fff" />
              <Text style={bankModal.saveBtnText}>Link Account</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function OptionsScreen() {
  const insets = useSafeAreaInsets();
  const { totalBalance, cards, transactions, bankAccounts } = useFinance();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);
  const [addBankVisible, setAddBankVisible] = useState(false);

  const totalCredit = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AJ</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Alex Johnson</Text>
            <Text style={styles.profileEmail}>alex.johnson@email.com</Text>
          </View>
          <View style={[styles.premiumBadge]}>
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{cards.length}</Text>
            <Text style={styles.statLabel}>Cards</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.positive }]}>
              ${totalCredit.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total In</Text>
          </View>
        </View>

        <SectionLabel text="Account" />
        <View style={styles.settingsGroup}>
          <SettingRow
            icon="user"
            label="Personal Info"
            subtitle="Update your profile"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="credit-card"
            label="Linked Cards"
            value={`${cards.length} cards`}
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="dollar-sign"
            label="Currency"
            value="USD"
            onPress={() => {}}
          />
        </View>

        <SectionLabel text="Linked Bank Accounts" />
        <View style={styles.settingsGroup}>
          {bankAccounts.map((bank, idx) => (
            <React.Fragment key={bank.id}>
              {idx > 0 && <View style={styles.rowDivider} />}
              <View style={styles.settingRow}>
                <View style={[styles.settingIcon, { backgroundColor: "rgba(74,222,170,0.1)" }]}>
                  <Feather name="database" size={18} color={Colors.positive} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{bank.bankName}</Text>
                  <Text style={styles.settingSubtitle}>
                    {bank.accountType.charAt(0).toUpperCase() + bank.accountType.slice(1)} ···{bank.lastFour}
                    {bank.nickname ? `  ·  ${bank.nickname}` : ""}
                  </Text>
                </View>
                <View style={styles.achBadge}>
                  <Text style={styles.achBadgeText}>ACH</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
          {bankAccounts.length > 0 && <View style={styles.rowDivider} />}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setAddBankVisible(true);
            }}
            style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
          >
            <View style={[styles.settingIcon, { backgroundColor: "rgba(108,158,255,0.1)" }]}>
              <Feather name="plus-circle" size={18} color={Colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: Colors.primary }]}>Link New Bank Account</Text>
              <Text style={styles.settingSubtitle}>ACH payments · secure transfer</Text>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>

        <SectionLabel text="Security" />
        <View style={styles.settingsGroup}>
          <SettingRow
            icon="shield"
            label="Biometric Auth"
            subtitle="Face ID / Fingerprint"
            toggle
            toggleValue={biometricEnabled}
            onToggle={setBiometricEnabled}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="lock"
            label="Change PIN"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="eye-off"
            label="Hide Balance"
            onPress={() => {}}
          />
        </View>

        <SectionLabel text="Notifications" />
        <View style={styles.settingsGroup}>
          <SettingRow
            icon="bell"
            label="Push Notifications"
            toggle
            toggleValue={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="mail"
            label="Email Reports"
            subtitle="Weekly spending summary"
            onPress={() => {}}
          />
        </View>

        <SectionLabel text="Support" />
        <View style={styles.settingsGroup}>
          <SettingRow icon="help-circle" label="Help Center" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="message-square" label="Contact Us" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="star" label="Rate the App" onPress={() => {}} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            pressed && { opacity: 0.75 },
          ]}
          onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)}
        >
          <Feather name="log-out" size={16} color={Colors.negative} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.version}>Finance App v1.0.0</Text>
      </ScrollView>

      <AddBankModal visible={addBankVisible} onClose={() => setAddBankVisible(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  premiumBadge: {
    backgroundColor: "rgba(108,158,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.4)",
  },
  premiumText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 24,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsGroup: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 20,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingRowPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(108,158,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  settingValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 64,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,107,138,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,107,138,0.25)",
    marginBottom: 16,
  },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.negative,
  },
  version: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    paddingBottom: 8,
  },
  achBadge: {
    backgroundColor: "rgba(74,222,170,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(74,222,170,0.25)",
  },
  achBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.positive,
    letterSpacing: 1,
  },
});

const bankModal = StyleSheet.create({
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
  fieldLabel: {
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
