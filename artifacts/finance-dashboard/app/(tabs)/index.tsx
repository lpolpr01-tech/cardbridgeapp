import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { useTheme } from "@/context/ThemeContext";
import { BalanceHeader } from "@/components/BalanceHeader";
import { WalletCardStack } from "@/components/WalletCardStack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SUBSCRIPTIONS, CARD_COLORS } from "@/constants/subscriptions";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUREAUS = [
  { name: "Equifax",   score: 742, color: "#FF6B9D" },
  { name: "Experian",  score: 738, color: "#6C9EFF" },
  { name: "TransUnion",score: 745, color: "#4ADEAA" },
];
const SCORE_MIN = 300;
const SCORE_MAX = 850;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategory(score: number): string {
  if (score >= 750) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 650) return "Fair";
  if (score >= 580) return "Poor";
  return "Very Poor";
}
function getCategoryColor(score: number): string {
  if (score >= 750) return Colors.positive;
  if (score >= 700) return "#A3E635";
  if (score >= 650) return "#FBBF24";
  return Colors.negative;
}

// ─── Score Arc ────────────────────────────────────────────────────────────────

function ScoreArc({ score, color }: { score: number; color: string }) {
  const pct = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  return (
    <View style={cs.arcWrap}>
      <View style={cs.arcBg}>
        <View style={[cs.arcFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[cs.scoreNum, { color }]}>{score}</Text>
    </View>
  );
}

// ─── Credit Score Panel ───────────────────────────────────────────────────────

function CreditScorePanel() {
  const avgScore = Math.round(BUREAUS.reduce((s, b) => s + b.score, 0) / BUREAUS.length);
  const avgCategory = getCategory(avgScore);
  const avgColor = getCategoryColor(avgScore);

  return (
    <View style={[cs.panel, { backdropFilter: "blur(20px) saturate(140%)", boxShadow: "0px 8px 32px rgba(0,0,0,0.5), inset 0px 1px 0px rgba(180,130,255,0.12)" } as any]}>
      <View style={cs.header}>
        <View style={cs.headerLeft}>
          <Feather name="shield" size={16} color={Colors.primary} />
          <Text style={cs.title}>Credit Scores</Text>
        </View>
        <View style={cs.updatedBadge}>
          <View style={cs.updatedDot} />
          <Text style={cs.updatedText}>Updated today</Text>
        </View>
      </View>

      <View style={cs.avgRow}>
        <Text style={cs.avgLabel}>Average Score</Text>
        <View style={cs.avgRight}>
          <Text style={[cs.avgScore, { color: avgColor }]}>{avgScore}</Text>
          <Text style={[cs.avgCategory, { color: avgColor }]}>{avgCategory}</Text>
        </View>
      </View>

      <View style={cs.barWrap}>
        <LinearGradient
          colors={["#FF6B6B", "#FBBF24", "#A3E635", "#4ADEAA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cs.barTrack}
        />
        <View style={[cs.barIndicator, { left: `${((avgScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100}%` as any }]}>
          <View style={[cs.barDot, { borderColor: avgColor }]} />
        </View>
        <View style={cs.barLabels}>
          {["300", "500", "650", "750", "850"].map((l) => (
            <Text key={l} style={cs.barLabel}>{l}</Text>
          ))}
        </View>
      </View>

      <View style={cs.bureauxRow}>
        {BUREAUS.map((b, i) => (
          <React.Fragment key={b.name}>
            {i > 0 && <View style={cs.bureauDivider} />}
            <View style={cs.bureauItem}>
              <Text style={cs.bureauName}>{b.name}</Text>
              <ScoreArc score={b.score} color={b.color} />
              <View style={cs.bureauBarBg}>
                <View style={[cs.bureauBarFill, {
                  width: `${((b.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100}%` as any,
                  backgroundColor: b.color,
                }]} />
              </View>
              <Text style={[cs.bureauCategory, { color: getCategoryColor(b.score) }]}>
                {getCategory(b.score)}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      <Text style={cs.disclaimer}>
        Scores are estimates for informational purposes only and may differ from lender scores.
      </Text>
    </View>
  );
}

// ─── Subscriptions Row ────────────────────────────────────────────────────────

function SubscriptionsRow() {
  const cardTotals = Object.entries(
    SUBSCRIPTIONS.reduce<Record<string, number>>((acc, s) => {
      acc[s.cardId] = (acc[s.cardId] ?? 0) + s.amount;
      return acc;
    }, {})
  ).map(([id, amt]) => ({ id, amt, color: CARD_COLORS[id] || Colors.primary }));
  const total = SUBSCRIPTIONS.reduce((s, x) => s + x.amount, 0);

  return (
    <Pressable onPress={() => { Haptics.selectionAsync(); router.push("/subscriptions"); }} style={[sub.wrap, { backdropFilter: "blur(20px) saturate(140%)", boxShadow: "0px 8px 32px rgba(0,0,0,0.5), inset 0px 1px 0px rgba(180,130,255,0.12)" } as any]}>
      <View style={sub.left}>
        <View style={sub.iconWrap}>
          <Feather name="repeat" size={16} color={Colors.primary} />
        </View>
        <View style={sub.info}>
          <Text style={sub.title}>Subscriptions</Text>
          <View style={sub.dots}>
            {cardTotals.map((c) => (
              <View key={c.id} style={[sub.dot, { backgroundColor: c.color }]} />
            ))}
            <Text style={sub.subCount}>{SUBSCRIPTIONS.length} active autopays</Text>
          </View>
        </View>
      </View>
      <View style={sub.right}>
        <Text style={sub.amt}>${total.toFixed(2)}<Text style={sub.mo}>/mo</Text></Text>
        <Feather name="chevron-right" size={16} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

// ─── AI Agent Modal ───────────────────────────────────────────────────────────

const AI_SUGGESTIONS = [
  { icon: "trending-down", color: "#4ADEAA", text: "Your Cash Back Gold utilization is at 24% — well within the ideal range. Keep it up!" },
  { icon: "alert-circle",  color: "#FBBF24", text: "Travel Elite is at 78% utilization. Paying $500 extra this month could boost your score by ~12 pts." },
  { icon: "zap",           color: "#6C9EFF", text: "You have $313 in cash back ready to redeem. Optimal time to redeem before statement close on the 30th." },
  { icon: "calendar",      color: "#FF6B9D", text: "3 payments due in the next 10 days totalling $1,250. Set up auto-pay to avoid late fees." },
];

function AiAgentModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ from: "user" | "ai"; text: string }[]>([]);

  React.useEffect(() => {
    if (!visible) { setInput(""); setMessages([]); }
  }, [visible]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { from: "user", text: userMsg }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { from: "ai", text: "Great question! Based on your current spending patterns, I'd recommend focusing on paying down the Travel Elite card first to optimize your credit utilization ratio. This could improve your score by approximately 15 points within 30 days." },
      ]);
    }, 900);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={aim.overlay}>
        <View style={[aim.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={aim.handle} />
          <View style={aim.header}>
            <View style={aim.agentAvatar}>
              <Feather name="cpu" size={20} color={Colors.primary} />
            </View>
            <View style={aim.headerInfo}>
              <Text style={aim.title}>CardFlow AI</Text>
              <View style={aim.onlineRow}>
                <View style={aim.onlineDot} />
                <Text style={aim.onlineText}>Credit Optimization Agent</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={aim.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={aim.body}>
            {/* Suggestions */}
            {messages.length === 0 && (
              <>
                <Text style={aim.sectionLabel}>AI Insights</Text>
                {AI_SUGGESTIONS.map((s, i) => (
                  <View key={i} style={aim.suggestionCard}>
                    <View style={[aim.sugIcon, { backgroundColor: `${s.color}20` }]}>
                      <Feather name={s.icon as any} size={16} color={s.color} />
                    </View>
                    <Text style={aim.sugText}>{s.text}</Text>
                  </View>
                ))}
                <Text style={aim.sectionLabel}>Ask Me Anything</Text>
              </>
            )}
            {messages.map((m, i) => (
              <View key={i} style={[aim.bubble, m.from === "user" ? aim.bubbleUser : aim.bubbleAi]}>
                {m.from === "ai" && (
                  <View style={aim.aiBubbleIcon}>
                    <Feather name="cpu" size={11} color={Colors.primary} />
                  </View>
                )}
                <Text style={[aim.bubbleText, m.from === "user" ? aim.bubbleTextUser : aim.bubbleTextAi]}>
                  {m.text}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={aim.inputRow}>
            <TextInput
              style={aim.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your cards, scores, tips…"
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={send}
            />
            <Pressable onPress={send} style={[aim.sendBtn, !input.trim() && { opacity: 0.4 }]}>
              <Feather name="send" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const aim = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: "88%",
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  agentAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(108,158,255,0.15)", borderWidth: 1.5,
    borderColor: "rgba(108,158,255,0.4)", alignItems: "center", justifyContent: "center",
  },
  headerInfo: { flex: 1, gap: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.positive },
  onlineText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.positive },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  body: { marginBottom: 12 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4,
  },
  suggestionCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14,
    borderWidth: 1, borderColor: Colors.divider, padding: 12, marginBottom: 8,
  },
  sugIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sugText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },
  bubble: { marginBottom: 10, maxWidth: "82%" },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: Colors.primaryDark, borderRadius: 16, borderBottomRightRadius: 4, padding: 12 },
  bubbleAi: { alignSelf: "flex-start", flexDirection: "row", gap: 8, alignItems: "flex-start" },
  aiBubbleIcon: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(108,158,255,0.15)",
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
  },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: "#fff" },
  bubbleTextAi: {
    color: Colors.textPrimary, backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, flex: 1,
  },
  inputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 12, borderWidth: 1, borderColor: Colors.divider,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryDark,
    alignItems: "center", justifyContent: "center",
  },
});

// ─── Notifications Modal ──────────────────────────────────────────────────────

const CREDIT_NOTIFICATIONS = [
  { id: "1", icon: "arrow-up", color: "#4ADEAA", title: "Score Increased", body: "Your TransUnion score jumped +8 pts to 745 this week.", time: "2h ago", unread: true },
  { id: "2", icon: "alert-triangle", color: "#FBBF24", title: "High Utilization Alert", body: "Travel Elite is now at 78% utilization — above the recommended 30%.", time: "1d ago", unread: true },
  { id: "3", icon: "calendar", color: "#6C9EFF", title: "Payment Due Soon", body: "Platinum Rewards payment of $680 is due in 5 days.", time: "2d ago", unread: false },
  { id: "4", icon: "check-circle", color: "#4ADEAA", title: "Payment Confirmed", body: "ACH payment of $750 to Travel Elite was processed successfully.", time: "3d ago", unread: false },
  { id: "5", icon: "gift", color: "#FF6B9D", title: "Rewards Milestone", body: "You've earned 130,000 points — enough for a $650 flight redemption!", time: "5d ago", unread: false },
];

function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const unreadCount = CREDIT_NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={nm.overlay}>
        <View style={[nm.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={nm.handle} />
          <View style={nm.header}>
            <View>
              <Text style={nm.title}>Notifications</Text>
              {unreadCount > 0 && (
                <Text style={nm.unreadLabel}>{unreadCount} unread</Text>
              )}
            </View>
            <Pressable onPress={onClose} style={nm.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {CREDIT_NOTIFICATIONS.map((n, i) => (
              <React.Fragment key={n.id}>
                {i > 0 && <View style={nm.divider} />}
                <View style={[nm.item, n.unread && nm.itemUnread]}>
                  <View style={[nm.iconWrap, { backgroundColor: `${n.color}18` }]}>
                    <Feather name={n.icon as any} size={17} color={n.color} />
                    {n.unread && <View style={[nm.badge, { backgroundColor: n.color }]} />}
                  </View>
                  <View style={nm.itemBody}>
                    <View style={nm.itemTop}>
                      <Text style={nm.itemTitle}>{n.title}</Text>
                      <Text style={nm.itemTime}>{n.time}</Text>
                    </View>
                    <Text style={nm.itemText}>{n.body}</Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const nm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: "85%",
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  unreadLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 56 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  itemUnread: { backgroundColor: "rgba(108,158,255,0.04)", marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 },
  badge: { position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5, borderColor: "#1C1048" },
  itemBody: { flex: 1, gap: 3 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  itemTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  itemText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});

// ─── Floating Bubble Menu ─────────────────────────────────────────────────────

const BUBBLES = [
  { key: "mail",     icon: "mail",     label: "Notifications", size: 44, color: "#6C9EFF", bg: "rgba(108,158,255,0.18)" },
  { key: "agent",    icon: "cpu",      label: "AI Agent",      size: 54, color: "#C084FC", bg: "rgba(192,132,252,0.18)" },
  { key: "download", icon: "download", label: "Statements",    size: 44, color: "#4ADEAA", bg: "rgba(74,222,170,0.18)" },
];

// Y offsets above the FAB (bottom-to-top: download, agent, mail)
const BUBBLE_OFFSETS = [72, 142, 206];

type FloatingBubbleMenuProps = {
  fabScaleAnim: Animated.Value;
  onAiOpen: () => void;
  onNotifOpen: () => void;
  onStatementsOpen: () => void;
  bottomOffset: number;
};

function FloatingBubbleMenu({ fabScaleAnim, onAiOpen, onNotifOpen, onStatementsOpen, bottomOffset }: FloatingBubbleMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const anim0 = useRef(new Animated.Value(0)).current;
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnims = [anim0, anim1, anim2];

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMenuOpen(true);
    Animated.parallel([
      Animated.timing(rotateAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.stagger(50, bubbleAnims.map((a) =>
        Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 110, friction: 9 })
      )),
    ]).start();
  };

  const closeMenu = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(rotateAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ...bubbleAnims.map((a) =>
        Animated.timing(a, { toValue: 0, duration: 150, useNativeDriver: true })
      ),
    ]).start(() => { setMenuOpen(false); cb?.(); });
  };

  const handleBubble = (key: string) => {
    if (key === "agent")    closeMenu(onAiOpen);
    if (key === "mail")     closeMenu(onNotifOpen);
    if (key === "download") closeMenu(onStatementsOpen);
  };

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "225deg"] });

  return (
    <>
      {/* Tap-outside to close */}
      {menuOpen && (
        <Pressable style={[StyleSheet.absoluteFill, fb.backdrop]} onPress={() => closeMenu()} />
      )}

      {/* Fixed position cluster */}
      <View style={[fb.cluster, { bottom: bottomOffset }]}>
        {/* Bubbles (rendered bottom-to-top: index 0=download, 1=agent, 2=mail) */}
        {BUBBLES.map((bubble, i) => {
          const anim = bubbleAnims[i];
          const offset = BUBBLE_OFFSETS[i];
          return (
            <Animated.View
              key={bubble.key}
              style={[
                fb.bubbleWrap,
                { bottom: offset },
                {
                  opacity: anim,
                  transform: [
                    { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                  ],
                },
              ]}
            >
              {/* Label on left */}
              <View style={fb.labelWrap}>
                <Text style={fb.labelText}>{bubble.label}</Text>
              </View>
              <Pressable
                onPress={() => handleBubble(bubble.key)}
                style={({ pressed }) => [
                  fb.bubble,
                  {
                    width: bubble.size,
                    height: bubble.size,
                    borderRadius: bubble.size / 2,
                    backgroundColor: bubble.bg,
                    borderColor: `${bubble.color}70`,
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Feather
                  name={bubble.icon as any}
                  size={bubble.key === "agent" ? 23 : 18}
                  color={bubble.color}
                />
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Main FAB */}
        <Animated.View style={[fb.fabWrap, { transform: [{ scale: fabScaleAnim }] }]}>
          <Pressable
            onPress={() => (menuOpen ? closeMenu() : openMenu())}
            style={({ pressed }) => [fb.fabPress, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={["#7C3AED", "#4F7FFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={fb.fabGrad}
            >
              <Animated.View style={{ transform: [{ rotate }] }}>
                <Feather name="plus" size={24} color="#fff" />
              </Animated.View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

const fb = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(8,4,24,0.55)",
    zIndex: 90,
  },
  cluster: {
    position: "absolute",
    right: 16,
    alignItems: "center",
    zIndex: 100,
  },
  bubbleWrap: {
    position: "absolute",
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bubble: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  labelWrap: {
    backgroundColor: "rgba(12,6,32,0.9)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  labelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textPrimary,
  },
  fabWrap: {},
  fabPress: {},
  fabGrad: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Statements Modal (simple) ────────────────────────────────────────────────

const MONTHS = ["February 2025", "January 2025", "December 2024", "November 2024"];

function StatementsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={stm.overlay}>
        <View style={[stm.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={stm.handle} />
          <View style={stm.header}>
            <Text style={stm.title}>Statements</Text>
            <Pressable onPress={onClose} style={stm.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {MONTHS.map((m, i) => (
              <React.Fragment key={m}>
                {i > 0 && <View style={stm.divider} />}
                <Pressable style={({ pressed }) => [stm.row, pressed && { opacity: 0.7 }]}>
                  <View style={stm.rowIcon}>
                    <Feather name="file-text" size={17} color={Colors.primary} />
                  </View>
                  <View style={stm.rowInfo}>
                    <Text style={stm.rowTitle}>{m}</Text>
                    <Text style={stm.rowSub}>PDF · 3 cards</Text>
                  </View>
                  <Feather name="download" size={16} color={Colors.textMuted} />
                </Pressable>
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const stm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: "60%" },
  handle: { width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 56 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(108,158,255,0.1)", alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CardListScreen() {
  const { cards, transactions, totalBalance } = useFinance();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const transactionCounts: Record<string, number> = {};
  for (const tx of transactions) {
    transactionCounts[tx.cardId] = (transactionCounts[tx.cardId] ?? 0) + 1;
  }

  // ── Scroll-aware FAB ──────────────────────────────────────────────────────
  const fabScaleAnim = useRef(new Animated.Value(1)).current;
  const scrollTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shrinkFab = () => {
    Animated.spring(fabScaleAnim, { toValue: 0.62, useNativeDriver: true, tension: 180, friction: 12 }).start();
  };
  const growFab = () => {
    Animated.spring(fabScaleAnim, { toValue: 1, useNativeDriver: true, tension: 140, friction: 10 }).start();
  };

  const onScrollBeginDrag = () => { shrinkFab(); };
  const onScrollEnd = () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(growFab, 300);
  };

  // ── Modal visibility ──────────────────────────────────────────────────────
  const [aiVisible, setAiVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [stmVisible, setStmVisible] = useState(false);

  return (
    <LinearGradient colors={[theme.bgStart, theme.bgEnd]} style={styles.gradient}>
      {/* Damask texture overlay */}
      <Image
        source={require("../../assets/images/bg-damask.png")}
        style={styles.bgTexture}
        resizeMode="cover"
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEnd}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
      >
        <BalanceHeader totalBalance={totalBalance} />
        <WalletCardStack cards={cards} transactionCounts={transactionCounts} />
        <SubscriptionsRow />
        <CreditScorePanel />
      </ScrollView>

      {/* Floating Bubble Menu */}
      <FloatingBubbleMenu
        fabScaleAnim={fabScaleAnim}
        onAiOpen={() => setAiVisible(true)}
        onNotifOpen={() => setNotifVisible(true)}
        onStatementsOpen={() => setStmVisible(true)}
        bottomOffset={insets.bottom + 80}
      />

      <AiAgentModal visible={aiVisible} onClose={() => setAiVisible(false)} />
      <NotificationsModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
      <StatementsModal visible={stmVisible} onClose={() => setStmVisible(false)} />
    </LinearGradient>
  );
}

// ─── Subscriptions Row Styles ─────────────────────────────────────────────────

const sub = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 20, marginTop: 10, marginBottom: 6,
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    elevation: 8,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(108,158,255,0.12)",
    borderWidth: 1, borderColor: "rgba(108,158,255,0.25)", alignItems: "center", justifyContent: "center",
  },
  info: { gap: 4 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  subCount: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  amt: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  mo: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
});

// ─── Main Screen Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  bgTexture: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.13,
  },
  scrollContent: { paddingBottom: 140 },
});

// ─── Credit Score Styles ──────────────────────────────────────────────────────

const cs = StyleSheet.create({
  panel: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    overflow: "hidden",
    elevation: 8,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary },
  updatedBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(74,222,170,0.1)", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(74,222,170,0.2)",
  },
  updatedDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.positive },
  updatedText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.positive },
  avgRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10,
  },
  avgLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  avgRight: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  avgScore: { fontFamily: "Inter_700Bold", fontSize: 26 },
  avgCategory: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  barWrap: { marginHorizontal: 16, marginBottom: 16, position: "relative" },
  barTrack: { height: 8, borderRadius: 4, marginBottom: 4 },
  barIndicator: { position: "absolute", top: -4, alignItems: "center" },
  barDot: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff",
    borderWidth: 3, borderColor: Colors.primaryDark,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 4, marginLeft: -8,
  },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  barLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },
  bureauxRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: Colors.divider },
  bureauItem: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, gap: 5 },
  bureauDivider: { width: 1, backgroundColor: Colors.divider, marginVertical: 12 },
  bureauName: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  bureauBarBg: { width: "70%", height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" },
  bureauBarFill: { height: 4, borderRadius: 2 },
  bureauCategory: { fontFamily: "Inter_500Medium", fontSize: 10 },
  arcWrap: { alignItems: "center", gap: 4 },
  arcBg: { width: 48, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  arcFill: { height: 6, borderRadius: 3 },
  scoreNum: { fontFamily: "Inter_700Bold", fontSize: 20 },
  disclaimer: {
    fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted,
    textAlign: "center", paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, lineHeight: 15,
  },
});
