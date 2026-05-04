import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { secureSet, SecureKeys } from "@/lib/secure-storage";

const TOS = `
TERMS OF SERVICE

Last updated: 2026-05-03

1. AGREEMENT TO TERMS
By accessing or using CardBridge (the "Service") you agree to be bound by these
Terms of Service. If you do not agree, do not use the Service.

2. THE SERVICE
CardBridge provides credit card payment management, including ACH bank
transfers via Stripe and account aggregation via Plaid. CardBridge is not a
bank, financial advisor, or tax professional.

3. ELIGIBILITY
You must be at least 18 years old, a U.S. resident, and able to enter into
a legally binding contract. Identity verification (KYC) is required.

4. ACH AUTHORIZATION
By scheduling or submitting a payment, you authorize CardBridge to initiate
debits from your linked bank account in the amount and on the date you
specify. Settlement typically completes within 1–3 business days.

5. FEES
We disclose all fees before each transaction. There are no hidden fees.

6. ACCOUNT SECURITY
You are responsible for safeguarding your login credentials. Notify us
immediately of any unauthorized access.

7. PROHIBITED USE
No money laundering, fraud, or use to violate any law.

8. LIMITATION OF LIABILITY
To the maximum extent permitted by law, CardBridge is not liable for any
indirect, incidental, or consequential damages.

9. CHANGES
We may update these Terms. Continued use after changes constitutes acceptance.

10. CONTACT
Questions? Use Settings → Report a Problem or email support@cardbridge.app
`.trim();

const PRIVACY = `
PRIVACY POLICY

Last updated: 2026-05-03

1. INFORMATION WE COLLECT
- Identity: name, date of birth, address, last 4 of SSN (for KYC)
- Financial: linked bank accounts and credit cards (via Plaid)
- Usage: how you interact with the Service
- Device: device id, OS version, IP address

2. HOW WE USE INFORMATION
- Provide and operate the Service
- Verify your identity (KYC) and prevent fraud
- Process payments via Stripe
- Comply with legal obligations (BSA/AML)

3. WHO WE SHARE WITH
- Plaid: account aggregation and identity verification
- Stripe: payment processing
- Service providers under written confidentiality agreements
- Law enforcement when legally compelled

We DO NOT sell your data.

4. DATA RETENTION
We retain account records for at least 5 years to comply with financial
regulations.

5. DATA SECURITY
- All locally stored data is encrypted (Keychain on iOS, EncryptedSharedPreferences on Android)
- Transport over TLS 1.2+
- Sensitive numbers (full SSN, full account numbers) are never stored on-device

6. YOUR RIGHTS
- Access, correct, or delete your data: support@cardbridge.app
- Opt out of marketing emails in Settings
- For California residents: CCPA rights apply
- For EU residents: GDPR rights apply

7. CHILDREN
The Service is not directed at children under 18.

8. CHANGES
We will notify you of material changes via in-app notice.
`.trim();

type Tab = "terms" | "privacy";

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("terms");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState<Record<Tab, boolean>>({
    terms: false,
    privacy: false,
  });

  const canContinue = acceptedTerms && acceptedPrivacy;

  const handleContinue = async () => {
    if (!canContinue) return;
    const now = new Date().toISOString();
    await secureSet(SecureKeys.TERMS_ACCEPTED_AT, now);
    router.replace("/onboarding/kyc");
  };

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={{ flex: 1 }}
    >
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>Welcome to CardBridge</Text>
        <Text style={s.subtitle}>
          Please review and accept the Terms of Service and Privacy Policy.
        </Text>
      </View>

      <View style={s.tabRow}>
        <Pressable
          onPress={() => setTab("terms")}
          style={[s.tabBtn, tab === "terms" && s.tabBtnActive]}
        >
          <Text style={[s.tabText, tab === "terms" && s.tabTextActive]}>
            Terms of Service
          </Text>
          {acceptedTerms && <Feather name="check-circle" size={13} color={Colors.positive} />}
        </Pressable>
        <Pressable
          onPress={() => setTab("privacy")}
          style={[s.tabBtn, tab === "privacy" && s.tabBtnActive]}
        >
          <Text style={[s.tabText, tab === "privacy" && s.tabTextActive]}>
            Privacy Policy
          </Text>
          {acceptedPrivacy && <Feather name="check-circle" size={13} color={Colors.positive} />}
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) {
            setScrolledToBottom((prev) => ({ ...prev, [tab]: true }));
          }
        }}
        scrollEventThrottle={32}
      >
        <Text style={s.body}>{tab === "terms" ? TOS : PRIVACY}</Text>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        {tab === "terms" ? (
          <Pressable
            onPress={() => scrolledToBottom.terms && setAcceptedTerms((v) => !v)}
            disabled={!scrolledToBottom.terms}
            style={[s.checkRow, !scrolledToBottom.terms && { opacity: 0.5 }]}
          >
            <View style={[s.checkBox, acceptedTerms && s.checkBoxActive]}>
              {acceptedTerms && <Feather name="check" size={13} color="#fff" />}
            </View>
            <Text style={s.checkLabel}>
              {scrolledToBottom.terms
                ? "I have read and accept the Terms of Service"
                : "Scroll to the bottom to enable acceptance"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => scrolledToBottom.privacy && setAcceptedPrivacy((v) => !v)}
            disabled={!scrolledToBottom.privacy}
            style={[s.checkRow, !scrolledToBottom.privacy && { opacity: 0.5 }]}
          >
            <View style={[s.checkBox, acceptedPrivacy && s.checkBoxActive]}>
              {acceptedPrivacy && <Feather name="check" size={13} color="#fff" />}
            </View>
            <Text style={s.checkLabel}>
              {scrolledToBottom.privacy
                ? "I have read and accept the Privacy Policy"
                : "Scroll to the bottom to enable acceptance"}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={({ pressed }) => [
            s.continueBtn,
            !canContinue && { opacity: 0.4 },
            pressed && canContinue && { opacity: 0.85 },
          ]}
        >
          <LinearGradient
            colors={["#4F7FFF", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.continueBtnGrad}
          >
            <Text style={s.continueBtnText}>
              {canContinue ? "Continue to Identity Verification" : "Accept both to continue"}
            </Text>
            {canContinue && <Feather name="arrow-right" size={16} color="#fff" />}
          </LinearGradient>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  tabBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  tabTextActive: { color: "#fff" },
  scroll: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  scrollContent: { padding: 16 },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  footer: { paddingHorizontal: 16, paddingTop: 14 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  continueBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  continueBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  continueBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});
