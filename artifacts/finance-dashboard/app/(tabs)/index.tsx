import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
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
import { CreditProfileSection } from "@/components/CreditProfile";
import { PlaidLinkedCards } from "@/components/PlaidLinkedCards";
import { SupportSection } from "@/components/SupportSection";
import { BudgetingScreen } from "@/components/BudgetingScreen";
import { apiUrl } from "@/constants/api";

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
          <Text style={sub.title} numberOfLines={1}>Subscriptions</Text>
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

const STARTER_PROMPTS = [
  { emoji: "💳", text: "Which card should I use for dining?" },
  { emoji: "📊", text: "Analyze my spending this month" },
  { emoji: "💰", text: "How do I maximize my cash back?" },
  { emoji: "📅", text: "When is my next payment due?" },
  { emoji: "🏦", text: "Explain APR vs interest rate" },
  { emoji: "📈", text: "How do I improve my credit score?" },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

function AiAgentModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { cards } = useFinance();
  const [input, setInput]     = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping]   = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) { setInput(""); setMessages([]); setTyping(false); }
  }, [visible]);

  const buildContext = useCallback(() => {
    const totalBalance = cards.reduce((s, c) => s + c.balance, 0);
    const totalLimit   = cards.reduce((s, c) => s + c.limit, 0);
    const utilPct      = totalLimit > 0 ? ((totalBalance / totalLimit) * 100).toFixed(1) : "—";
    const cashback     = cards.reduce((s, c) => s + (c.rewards?.cashbackTotal ?? 0), 0);
    const points       = cards.reduce((s, c) => s + (c.rewards?.pointsTotal ?? 0), 0);
    const subTotal     = SUBSCRIPTIONS.reduce((s, x) => s + x.amount, 0);
    const cardList     = cards.map((c) => `${c.name} (balance $${c.balance}, limit $${c.limit}, util ${c.limit > 0 ? ((c.balance / c.limit) * 100).toFixed(0) : 0}%)`).join("; ");
    return `User context: Cards: [${cardList}]. Total balance: $${totalBalance.toFixed(2)}. Total limit: $${totalLimit.toFixed(2)}. Overall utilization: ${utilPct}%. Monthly subscriptions: $${subTotal.toFixed(2)}/mo. Total cash back earned: $${cashback.toFixed(2)}. Rewards points: ${points.toLocaleString()} pts.`;
  }, [cards]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setInput("");
    const newMsg: ChatMessage = { role: "user", content: msg };
    const history = [...messages, newMsg];
    setMessages(history);
    setTyping(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await fetch(apiUrl("/api/ai-agent"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, userContext: buildContext() }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "Sorry, I couldn't get a response. Please try again." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Connection error. Please check your network and try again." }]);
    } finally {
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, messages, typing, buildContext]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
      <View style={aim.overlay}>
        <View style={[aim.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={aim.handle} />

          {/* Header */}
          <View style={aim.header}>
            <LinearGradient colors={["#3B1F6A", "#1A3A6A"]} style={aim.agentAvatar}>
              <Feather name="cpu" size={20} color="#C084FC" />
              <View style={aim.avatarGlow} />
            </LinearGradient>
            <View style={aim.headerInfo}>
              <Text style={aim.title}>CardFlow AI</Text>
              <View style={aim.onlineRow}>
                <View style={aim.onlineDot} />
                <Text style={aim.onlineText}>Your personal finance assistant</Text>
              </View>
            </View>
            <Pressable onPress={() => setMessages([])} style={aim.clearBtn}>
              <Feather name="trash-2" size={15} color={Colors.textMuted} />
            </Pressable>
            <Pressable onPress={onClose} style={aim.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            style={aim.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Starter prompts */}
            {messages.length === 0 && (
              <>
                <Text style={aim.sectionLabel}>Ask me anything</Text>
                <View style={aim.starterGrid}>
                  {STARTER_PROMPTS.map((p, i) => (
                    <Pressable key={i} onPress={() => send(p.text)} style={({ pressed }) => [aim.starterPill, pressed && { opacity: 0.75 }]}>
                      <Text style={aim.starterEmoji}>{p.emoji}</Text>
                      <Text style={aim.starterText}>{p.text}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Messages */}
            {messages.map((m, i) => (
              <View key={i} style={[aim.bubble, m.role === "user" ? aim.bubbleUser : aim.bubbleAi]}>
                {m.role === "assistant" && (
                  <View style={aim.aiBubbleIcon}>
                    <Feather name="cpu" size={11} color="#C084FC" />
                  </View>
                )}
                {m.role === "user" ? (
                  <LinearGradient colors={["#4F7FFF", "#7C3AED"]} style={aim.bubbleUserGrad}>
                    <Text style={aim.bubbleTextUser}>{m.content}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={aim.bubbleTextAi}>{m.content}</Text>
                )}
              </View>
            ))}

            {/* Typing indicator */}
            {typing && (
              <View style={[aim.bubble, aim.bubbleAi]}>
                <View style={aim.aiBubbleIcon}>
                  <Feather name="cpu" size={11} color="#C084FC" />
                </View>
                <View style={aim.typingBubble}>
                  {[0, 1, 2].map((d) => (
                    <View key={d} style={[aim.typingDot, { opacity: 0.4 + d * 0.2 }]} />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={aim.inputRow}>
            <TextInput
              style={aim.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your cards, scores, tips…"
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={() => send()}
              editable={!typing}
              multiline
            />
            <Pressable onPress={() => send()} style={[aim.sendBtn, (!input.trim() || typing) && { opacity: 0.4 }]} disabled={!input.trim() || typing}>
              <LinearGradient colors={["#7C3AED", "#4F7FFF"]} style={aim.sendBtnGrad}>
                <Feather name="send" size={15} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={aim.disclaimer}>CardFlow AI provides general financial guidance only. Not a licensed financial advisor.</Text>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const aim = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0E0828",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: "92%",
    borderTopWidth: 1, borderColor: "rgba(192,132,252,0.25)",
  },
  handle: { width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  agentAvatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(192,132,252,0.4)",
    position: "relative", overflow: "hidden",
  },
  avatarGlow: {
    position: "absolute", width: 30, height: 30,
    borderRadius: 15, backgroundColor: "rgba(192,132,252,0.25)",
  },
  headerInfo: { flex: 1, gap: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.positive },
  onlineText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.positive },
  clearBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  body: { marginBottom: 10, flex: 1 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginTop: 4,
  },
  starterGrid: { gap: 8, marginBottom: 8 },
  starterPill: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", padding: 12,
  },
  starterEmoji: { fontSize: 18 },
  starterText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },
  bubble: { marginBottom: 10, maxWidth: "85%" },
  bubbleUser: { alignSelf: "flex-end" },
  bubbleAi: { alignSelf: "flex-start", flexDirection: "row", gap: 8, alignItems: "flex-start", maxWidth: "90%" },
  aiBubbleIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(192,132,252,0.15)", borderWidth: 1, borderColor: "rgba(192,132,252,0.3)",
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
  },
  bubbleUserGrad: { borderRadius: 18, borderBottomRightRadius: 4, padding: 12 },
  bubbleTextUser: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, color: "#fff" },
  bubbleTextAi: {
    fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 18, borderBottomLeftRadius: 4,
    padding: 12, flex: 1,
  },
  typingBubble: {
    flexDirection: "row", gap: 5, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 18, borderBottomLeftRadius: 4,
    padding: 14,
  },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#C084FC" },
  inputRow: { flexDirection: "row", gap: 10, alignItems: "flex-end", marginBottom: 8 },
  input: {
    flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    maxHeight: 100,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23 },
  sendBtnGrad: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  disclaimer: {
    fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted,
    textAlign: "center", lineHeight: 14, paddingBottom: 4,
  },
});

// ─── Notifications Modal ──────────────────────────────────────────────────────

type NotifItem = { id: string; icon: string; color: string; title: string; body: string; time: string; unread: boolean };

const INITIAL_NOTIFICATIONS: NotifItem[] = [
  { id: "1", icon: "alert-circle",   color: "#FF6B8A", title: "Payment due in 3 days",        body: "Platinum Rewards payment of $680 is due on May 2nd. Set up auto-pay to avoid late fees.", time: "Just now",  unread: true  },
  { id: "2", icon: "alert-triangle", color: "#FBBF24", title: "Budget alert — Dining at 85%",  body: "You have spent $255 of your $300 dining budget this month. Approaching your limit.", time: "1h ago",    unread: true  },
  { id: "3", icon: "percent",        color: "#4ADEAA", title: "Cash back milestone",            body: "You've earned $313 in cash back this month — a new personal record! Redeem before statement close.", time: "2h ago",    unread: true  },
  { id: "4", icon: "repeat",         color: "#6C9EFF", title: "Subscription charge in 2 days", body: "Adobe Creative Cloud charges $54.99 on May 1st to your Cash Back Gold card.", time: "5h ago",    unread: false },
  { id: "5", icon: "zap",            color: "#C084FC", title: "AI Insight",                    body: "Your Platinum Rewards card earns 3× points on travel. Your upcoming charges make it ideal for this month.", time: "1d ago",    unread: false },
  { id: "6", icon: "arrow-up",       color: "#4ADEAA", title: "Score Increased",               body: "Your TransUnion score jumped +8 pts to 745 this week. Keep utilization below 30% to continue improving.", time: "2d ago",    unread: false },
  { id: "7", icon: "check-circle",   color: "#4ADEAA", title: "Payment Confirmed",             body: "ACH payment of $750 to Travel Elite was processed successfully.", time: "3d ago",    unread: false },
  { id: "8", icon: "gift",           color: "#FF6B8A", title: "Rewards Milestone",             body: "You've earned 130,000 points — enough for a $650 flight redemption!", time: "5d ago",    unread: false },
];

function NotificationsModal({ visible, onClose, onUnreadChange }: {
  visible: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<NotifItem[]>(INITIAL_NOTIFICATIONS);
  const unreadCount = notifs.filter((n) => n.unread).length;

  useEffect(() => { onUnreadChange(unreadCount); }, [unreadCount]);

  const markRead = (id: string) => setNotifs((n) => n.map((x) => x.id === id ? { ...x, unread: false } : x));
  const markAllRead = () => setNotifs((n) => n.map((x) => ({ ...x, unread: false })));
  const clearAll = () => setNotifs([]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={nm.overlay}>
        <View style={[nm.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={nm.handle} />
          <View style={nm.header}>
            <View style={{ flex: 1 }}>
              <Text style={nm.title}>Notifications</Text>
              {unreadCount > 0 && <Text style={nm.unreadLabel}>{unreadCount} unread</Text>}
            </View>
            <Pressable onPress={markAllRead} style={nm.actionBtn}>
              <Text style={nm.actionText}>Mark all read</Text>
            </Pressable>
            <Pressable onPress={clearAll} style={nm.actionBtn}>
              <Text style={[nm.actionText, { color: "#FF6B8A" }]}>Clear</Text>
            </Pressable>
            <Pressable onPress={onClose} style={nm.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {notifs.length === 0 && (
              <View style={nm.empty}>
                <Feather name="bell-off" size={32} color={Colors.textMuted} />
                <Text style={nm.emptyText}>No notifications</Text>
              </View>
            )}
            {notifs.map((n, i) => (
              <React.Fragment key={n.id}>
                {i > 0 && <View style={nm.divider} />}
                <Pressable onPress={() => markRead(n.id)} style={[nm.item, n.unread && nm.itemUnread]}>
                  <View style={[nm.iconWrap, { backgroundColor: `${n.color}18` }]}>
                    <Feather name={n.icon as any} size={17} color={n.color} />
                    {n.unread && <View style={[nm.badge, { backgroundColor: n.color }]} />}
                  </View>
                  <View style={nm.itemBody}>
                    <View style={nm.itemTop}>
                      <Text style={nm.itemTitle} numberOfLines={1}>{n.title}</Text>
                      <Text style={nm.itemTime}>{n.time}</Text>
                    </View>
                    <Text style={nm.itemText}>{n.body}</Text>
                  </View>
                </Pressable>
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
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  unreadLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary, marginTop: 2 },
  actionBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  actionText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 56 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  itemUnread: { backgroundColor: "rgba(108,158,255,0.04)", marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 },
  badge: { position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5, borderColor: "#1C1048" },
  itemBody: { flex: 1, gap: 3 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, flex: 1, marginRight: 8 },
  itemTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, flexShrink: 0 },
  itemText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
});

// ─── Floating Bubble Menu ─────────────────────────────────────────────────────

const BUBBLES = [
  { key: "mail",    icon: "bell",        label: "Notifications", size: 44, color: "#6C9EFF", bg: "rgba(108,158,255,0.18)" },
  { key: "agent",   icon: "cpu",         label: "AI Agent",      size: 54, color: "#C084FC", bg: "rgba(192,132,252,0.18)" },
  { key: "budget",  icon: "bar-chart-2", label: "Budgeting",     size: 44, color: "#4ADEAA", bg: "rgba(74,222,170,0.18)" },
];

const BUBBLE_OFFSETS = [72, 142, 206];

type FloatingBubbleMenuProps = {
  fabScaleAnim: Animated.Value;
  onAiOpen: () => void;
  onNotifOpen: () => void;
  onBudgetOpen: () => void;
  bottomOffset: number;
  notifUnread: number;
};

function FloatingBubbleMenu({ fabScaleAnim, onAiOpen, onNotifOpen, onBudgetOpen, bottomOffset, notifUnread }: FloatingBubbleMenuProps) {
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
    if (key === "agent")  closeMenu(onAiOpen);
    if (key === "mail")   closeMenu(onNotifOpen);
    if (key === "budget") closeMenu(onBudgetOpen);
  };

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "225deg"] });

  return (
    <>
      {menuOpen && (
        <Pressable style={[StyleSheet.absoluteFill, fb.backdrop]} onPress={() => closeMenu()} />
      )}

      <View style={[fb.cluster, { bottom: bottomOffset }]}>
        {BUBBLES.map((bubble, i) => {
          const anim = bubbleAnims[i];
          const offset = BUBBLE_OFFSETS[i];
          const isNotif = bubble.key === "mail";
          return (
            <Animated.View
              key={bubble.key}
              style={[
                fb.bubbleWrap,
                { bottom: offset },
                { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
              ]}
            >
              <View style={fb.labelWrap}>
                <Text style={fb.labelText}>{bubble.label}</Text>
              </View>
              <Pressable
                onPress={() => handleBubble(bubble.key)}
                style={({ pressed }) => [
                  fb.bubble,
                  { width: bubble.size, height: bubble.size, borderRadius: bubble.size / 2, backgroundColor: bubble.bg, borderColor: `${bubble.color}70` },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Feather name={bubble.icon as any} size={bubble.key === "agent" ? 23 : 18} color={bubble.color} />
                {isNotif && notifUnread > 0 && (
                  <View style={fb.notifBadge}>
                    <Text style={fb.notifBadgeText}>{notifUnread > 9 ? "9+" : notifUnread}</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Main FAB — unread dot when closed */}
        <Animated.View style={[fb.fabWrap, { transform: [{ scale: fabScaleAnim }] }]}>
          {notifUnread > 0 && !menuOpen && (
            <View style={fb.fabBadge}>
              <Text style={fb.fabBadgeText}>{notifUnread > 9 ? "9+" : notifUnread}</Text>
            </View>
          )}
          <Pressable
            onPress={() => (menuOpen ? closeMenu() : openMenu())}
            style={({ pressed }) => [fb.fabPress, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={["#7C3AED", "#4F7FFF"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
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
  backdrop: { backgroundColor: "rgba(8,4,24,0.55)", zIndex: 90 },
  cluster: { position: "absolute", right: 16, alignItems: "center", zIndex: 100 },
  bubbleWrap: { position: "absolute", right: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  bubble: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  labelWrap: {
    backgroundColor: "rgba(12,6,32,0.9)", paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 9, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  labelText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textPrimary },
  fabWrap: { position: "relative" },
  fabPress: {},
  fabGrad: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  notifBadge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: "#FF6B8A", borderRadius: 9, minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#0D0A1E",
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  fabBadge: {
    position: "absolute", top: -4, right: -4, zIndex: 10,
    backgroundColor: "#FF6B8A", borderRadius: 9, minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#0D0A1E",
    paddingHorizontal: 3,
  },
  fabBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CardListScreen() {
  const { cards, transactions, totalBalance } = useFinance();
  const { theme, effectiveBgStart, effectiveBgEnd } = useTheme();
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
  const [aiVisible,     setAiVisible]     = useState(false);
  const [notifVisible,  setNotifVisible]  = useState(false);
  const [budgetVisible, setBudgetVisible] = useState(false);
  const [notifUnread,   setNotifUnread]   = useState(3);

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={styles.gradient}>
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
        <PlaidLinkedCards />
        <CreditProfileSection status="success" onSimulate={() => setAiVisible(true)} />
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <SupportSection />
        </View>
      </ScrollView>

      <FloatingBubbleMenu
        fabScaleAnim={fabScaleAnim}
        onAiOpen={() => setAiVisible(true)}
        onNotifOpen={() => setNotifVisible(true)}
        onBudgetOpen={() => setBudgetVisible(true)}
        bottomOffset={insets.bottom + 80}
        notifUnread={notifUnread}
      />

      <AiAgentModal visible={aiVisible} onClose={() => setAiVisible(false)} />
      <NotificationsModal visible={notifVisible} onClose={() => setNotifVisible(false)} onUnreadChange={setNotifUnread} />
      <BudgetingScreen visible={budgetVisible} onClose={() => setBudgetVisible(false)} />
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
  info: { gap: 3, flex: 1 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  subCount: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  right: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 12 },
  amt: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.positive },
  mo: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
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

