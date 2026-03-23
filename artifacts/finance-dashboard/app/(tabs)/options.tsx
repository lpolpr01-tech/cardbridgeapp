import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";

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

export default function OptionsScreen() {
  const insets = useSafeAreaInsets();
  const { totalBalance, cards, transactions } = useFinance();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);

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
});
