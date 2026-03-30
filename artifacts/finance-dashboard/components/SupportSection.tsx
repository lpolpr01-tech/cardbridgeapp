import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

// ─── Feedback Modal ───────────────────────────────────────────────────────────

const CATEGORIES = ["General", "App Bug", "Payment Issue", "Card Problem", "Feature Request", "Other"];

function FeedbackModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("General");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setRating(0);
      setCategory("General");
      setMessage("");
      onClose();
    }, 1800);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={fb.overlay}>
        <View style={[fb.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={fb.handle} />
          <View style={fb.header}>
            <View style={fb.headerLeft}>
              <View style={fb.iconWrap}>
                <Feather name="message-circle" size={16} color={Colors.primary} />
              </View>
              <Text style={fb.title}>Send Feedback</Text>
            </View>
            <Pressable onPress={onClose} style={fb.closeBtn}>
              <Feather name="x" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>

          {submitted ? (
            <View style={fb.successWrap}>
              <View style={fb.successIcon}>
                <Feather name="check-circle" size={36} color={Colors.positive} />
              </View>
              <Text style={fb.successTitle}>Thank you!</Text>
              <Text style={fb.successSub}>Your feedback helps us improve CardFlow.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={fb.fieldLabel}>How would you rate your experience?</Text>
              <View style={fb.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => { Haptics.selectionAsync(); setRating(s); }}
                    style={fb.starBtn}
                  >
                    <Feather
                      name="star"
                      size={32}
                      color={s <= rating ? "#F59E0B" : "rgba(255,255,255,0.2)"}
                    />
                  </Pressable>
                ))}
              </View>

              <Text style={fb.fieldLabel}>Category</Text>
              <View style={fb.categoryRow}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => { Haptics.selectionAsync(); setCategory(c); }}
                    style={[fb.catBtn, category === c && fb.catBtnActive]}
                  >
                    <Text style={[fb.catText, category === c && fb.catTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={fb.fieldLabel}>Tell us more</Text>
              <TextInput
                style={fb.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your experience or issue..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [fb.submitBtn, pressed && { opacity: 0.85 }, !message.trim() && fb.submitBtnDisabled]}
              >
                <Feather name="send" size={15} color="#fff" />
                <Text style={fb.submitBtnText}>Submit Feedback</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const fb = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: "88%",
  },
  handle: { width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(108,158,255,0.15)", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 4,
  },
  starsRow: { flexDirection: "row", gap: 12, marginBottom: 20, justifyContent: "center" },
  starBtn: { padding: 4 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  catBtnActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  catText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  catTextActive: { color: "#fff", fontFamily: "Inter_500Medium" },
  input: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 16, minHeight: 110,
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.primaryDark, borderRadius: 14, paddingVertical: 15, marginBottom: 8,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  successWrap: { alignItems: "center", gap: 14, paddingVertical: 40 },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(74,222,170,0.12)", borderWidth: 1.5, borderColor: "rgba(74,222,170,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
});

// ─── Customer Service Modal ───────────────────────────────────────────────────

const CONTACT_OPTIONS = [
  { icon: "message-square", label: "Live Chat", sub: "Typically replies in under 2 min", color: Colors.primary },
  { icon: "phone", label: "Call Us", sub: "1-800-CARDFLOW  ·  Mon–Fri 8am–8pm", color: Colors.positive },
  { icon: "mail", label: "Email Support", sub: "support@cardflow.app  ·  24–48 hr response", color: "#C084FC" },
  { icon: "book-open", label: "Help Center", sub: "FAQs, guides & video tutorials", color: "#F59E0B" },
];

function CustomerServiceModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={cs.overlay}>
        <View style={[cs.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={cs.handle} />
          <View style={cs.header}>
            <View style={cs.headerLeft}>
              <View style={cs.iconWrap}>
                <Feather name="headphones" size={16} color={Colors.positive} />
              </View>
              <Text style={cs.title}>Customer Service</Text>
            </View>
            <Pressable onPress={onClose} style={cs.closeBtn}>
              <Feather name="x" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={cs.statusBanner}>
            <View style={cs.statusDot} />
            <Text style={cs.statusText}>All systems operational  ·  Avg wait: ~1 min</Text>
          </View>

          <Text style={cs.sectionLabel}>Contact Options</Text>
          {CONTACT_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.label}
              onPress={() => Haptics.selectionAsync()}
              style={({ pressed }) => [cs.optionRow, pressed && { opacity: 0.8 }, i < CONTACT_OPTIONS.length - 1 && cs.optionBorder]}
            >
              <View style={[cs.optionIcon, { backgroundColor: `${opt.color}18` }]}>
                <Feather name={opt.icon as any} size={18} color={opt.color} />
              </View>
              <View style={cs.optionInfo}>
                <Text style={cs.optionLabel}>{opt.label}</Text>
                <Text style={cs.optionSub}>{opt.sub}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={Colors.textMuted} />
            </Pressable>
          ))}

          <Text style={cs.sectionLabel}>Business Hours</Text>
          <View style={cs.hoursCard}>
            {[
              { day: "Monday – Friday", hours: "8:00 AM – 8:00 PM EST" },
              { day: "Saturday", hours: "9:00 AM – 5:00 PM EST" },
              { day: "Sunday & Holidays", hours: "Closed  ·  Email available" },
            ].map((h, i) => (
              <View key={h.day} style={[cs.hoursRow, i > 0 && cs.hoursDivider]}>
                <Text style={cs.hoursDay}>{h.day}</Text>
                <Text style={cs.hoursTime}>{h.hours}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: { width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(74,222,170,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(74,222,170,0.08)", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "rgba(74,222,170,0.2)", marginBottom: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.positive },
  statusText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.positive },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  optionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionInfo: { flex: 1, gap: 2 },
  optionLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textPrimary },
  optionSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  hoursCard: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", padding: 14, marginBottom: 4,
  },
  hoursRow: { paddingVertical: 8 },
  hoursDivider: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
  hoursDay: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  hoursTime: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
});

// ─── Support Section (exported for use in screens) ────────────────────────────

export function SupportSection() {
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [csVisible, setCsVisible] = useState(false);

  return (
    <>
      <Text style={sup.label}>Support</Text>
      <View style={sup.group}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setFeedbackVisible(true); }}
          style={({ pressed }) => [sup.row, pressed && sup.rowPressed]}
        >
          <View style={sup.iconWrap}>
            <Feather name="message-circle" size={18} color={Colors.primary} />
          </View>
          <View style={sup.info}>
            <Text style={sup.rowLabel}>Send Feedback</Text>
            <Text style={sup.rowSub}>Rate your experience & report issues</Text>
          </View>
          <Feather name="chevron-right" size={16} color={Colors.textMuted} />
        </Pressable>

        <View style={sup.divider} />

        <Pressable
          onPress={() => { Haptics.selectionAsync(); setCsVisible(true); }}
          style={({ pressed }) => [sup.row, pressed && sup.rowPressed]}
        >
          <View style={[sup.iconWrap, { backgroundColor: "rgba(74,222,170,0.12)" }]}>
            <Feather name="headphones" size={18} color={Colors.positive} />
          </View>
          <View style={sup.info}>
            <Text style={sup.rowLabel}>Customer Service</Text>
            <Text style={sup.rowSub}>Chat, call, or email our support team</Text>
          </View>
          <View style={sup.liveBadge}>
            <View style={sup.liveDot} />
            <Text style={sup.liveText}>Live</Text>
          </View>
          <Feather name="chevron-right" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>

      <FeedbackModal visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} />
      <CustomerServiceModal visible={csVisible} onClose={() => setCsVisible(false)} />
    </>
  );
}

const sup = StyleSheet.create({
  label: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, marginLeft: 4,
  },
  group: {
    backgroundColor: "rgba(28,14,70,0.88)", borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)", marginBottom: 20, overflow: "hidden",
    elevation: 8,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowPressed: { backgroundColor: "rgba(255,255,255,0.04)" },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(108,158,255,0.12)", alignItems: "center", justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textPrimary },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginLeft: 64 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(74,222,170,0.12)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(74,222,170,0.25)",
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.positive },
  liveText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.positive },
});
