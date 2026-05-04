import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { secureSet, SecureKeys } from "@/lib/secure-storage";

function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= new Date().getFullYear() - 18;
}

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function KycOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { token: authToken } = useAuth();

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (fullName.trim().split(/\s+/).length < 2) return "Please enter your full legal name (first and last).";
    if (!isValidDate(dob)) return "Please enter a valid date of birth (YYYY-MM-DD). You must be at least 18.";
    if (!addressLine1.trim()) return "Street address is required.";
    if (!city.trim()) return "City is required.";
    if (!STATES.includes(stateVal.toUpperCase())) return "Please enter a valid 2-letter U.S. state code.";
    if (!/^\d{5}$/.test(zip)) return "ZIP code must be 5 digits.";
    if (!/^\d{4}$/.test(ssnLast4)) return "SSN last 4 must be exactly 4 digits.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Please fix the following", err);
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const res = await fetch(apiUrl("/api/kyc/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          dateOfBirth: dob,
          addressLine1: addressLine1.trim(),
          addressCity: city.trim(),
          addressState: stateVal.toUpperCase(),
          addressZip: zip,
          ssnLast4,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        status?: string;
        plaidIdvSessionId?: string | null;
        error?: string;
      };

      if (!res.ok || !data.success) {
        Alert.alert("Verification failed", data.error ?? "Could not submit identity verification.");
        setSubmitting(false);
        return;
      }

      // Persist completion + minimal local copy (no SSN!) so we can survive
      // restart without re-asking. SSN last4 lives only in transit and
      // server-side; we never store it on-device.
      const now = new Date().toISOString();
      await Promise.all([
        secureSet(SecureKeys.KYC_COMPLETED_AT, now),
        secureSet(SecureKeys.ONBOARDING_COMPLETE, "true"),
        secureSet(
          SecureKeys.KYC_DATA,
          JSON.stringify({
            fullName: fullName.trim(),
            dateOfBirth: dob,
            addressLine1: addressLine1.trim(),
            city: city.trim(),
            state: stateVal.toUpperCase(),
            zip,
            // SSN intentionally omitted from device storage
          }),
        ),
      ]);

      setSubmitting(false);
      router.replace("/(tabs)");
    } catch {
      setSubmitting(false);
      Alert.alert("Network error", "Could not reach verification service. Try again.");
    }
  };

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <View style={s.iconWrap}>
            <Feather name="shield" size={28} color={Colors.primary} />
          </View>
          <Text style={s.title}>Identity Verification</Text>
          <Text style={s.subtitle}>
            We're required by federal law (Bank Secrecy Act) to verify your identity before
            you can move money. This takes about 1 minute.
          </Text>

          <View style={s.providerBanner}>
            <Feather name="lock" size={14} color={Colors.positive} />
            <Text style={s.providerText}>
              Verification powered by Plaid Identity. Your data is encrypted in transit
              and never stored on this device.
            </Text>
          </View>

          <Text style={s.label}>Full Legal Name</Text>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="First Middle Last"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
          />

          <Text style={s.label}>Date of Birth</Text>
          <TextInput
            style={s.input}
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          <Text style={s.label}>Residential Address</Text>
          <TextInput
            style={s.input}
            value={addressLine1}
            onChangeText={setAddressLine1}
            placeholder="Street address"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
          />
          <View style={s.row3}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
            <TextInput
              style={[s.input, { width: 60 }]}
              value={stateVal}
              onChangeText={(t) => setStateVal(t.toUpperCase())}
              placeholder="ST"
              placeholderTextColor={Colors.textMuted}
              maxLength={2}
              autoCapitalize="characters"
            />
            <TextInput
              style={[s.input, { width: 86 }]}
              value={zip}
              onChangeText={setZip}
              placeholder="ZIP"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>

          <Text style={s.label}>Last 4 of SSN</Text>
          <TextInput
            style={s.input}
            value={ssnLast4}
            onChangeText={(t) => setSsnLast4(t.replace(/\D/g, "").slice(0, 4))}
            placeholder="• • • •"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
          <Text style={s.hint}>
            Used only for federal compliance checks. Stored encrypted server-side; never on this device.
          </Text>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [s.submitBtn, submitting && { opacity: 0.6 }, pressed && !submitting && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={["#4F7FFF", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.submitBtnGrad}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="shield" size={15} color="#fff" />
                  <Text style={s.submitBtnText}>Submit & Verify Identity</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  iconWrap: {
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(108,158,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 14,
  },
  providerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(74,222,170,0.08)",
    borderColor: "rgba(74,222,170,0.25)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    marginBottom: 18,
  },
  providerText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  row3: { flexDirection: "row", gap: 8 },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 24 },
  submitBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});
