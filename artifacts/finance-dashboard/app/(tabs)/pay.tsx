import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { TransactionItem } from "@/components/TransactionItem";
import type { Card } from "@/context/FinanceContext";

const FILTERS = ["All", "Debit", "Credit"] as const;
type Filter = (typeof FILTERS)[number];

const CARD_COLORS: Record<string, string> = {
  "card-1": "#9B5CF5",
  "card-2": "#3E8EDD",
  "card-3": "#3EC48A",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function formatDateDisplay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type ScheduleModalProps = {
  visible: boolean;
  onClose: () => void;
};

function ScheduleModal({ visible, onClose }: ScheduleModalProps) {
  const { cards, addScheduledPayment } = useFinance();
  const [selectedCards, setSelectedCards] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [date, setDate] = useState("2026-04-15");
  const [note, setNote] = useState("");
  const insets = useSafeAreaInsets();

  const toggleCard = (id: string) => {
    Haptics.selectionAsync();
    setSelectedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCardIds = cards.filter((c) => !!selectedCards[c.id]).map((c) => c.id);

  const handleSave = () => {
    if (selectedCardIds.length === 0) {
      Alert.alert("Select Cards", "Please choose at least one card to pay.");
      return;
    }
    const amountMap: Record<string, number> = {};
    for (const id of selectedCardIds) {
      const val = parseFloat(amounts[id] || "0");
      amountMap[id] = isNaN(val) ? 0 : val;
    }
    addScheduledPayment({ cardIds: selectedCardIds, date, amounts: amountMap, note });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    setSelectedCards({});
    setAmounts({});
    setNote("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={[modal.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={modal.handle} />
          <View style={modal.header}>
            <Text style={modal.title}>Schedule Payment</Text>
            <Pressable onPress={onClose} style={modal.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={modal.sectionLabel}>Select Cards</Text>
            {cards.map((card) => {
              const selected = !!selectedCards[card.id];
              const color = CARD_COLORS[card.id] || Colors.primary;
              return (
                <Pressable
                  key={card.id}
                  onPress={() => toggleCard(card.id)}
                  style={[modal.cardRow, selected && { borderColor: `${color}88` }]}
                >
                  <View style={[modal.cardDot, { backgroundColor: color }]} />
                  <View style={modal.cardInfo}>
                    <Text style={modal.cardName}>{card.name}</Text>
                    <Text style={modal.cardSub}>···{card.lastFour} · Balance {formatCurrency(card.balance)}</Text>
                  </View>
                  <View style={[modal.checkbox, selected && { backgroundColor: color, borderColor: color }]}>
                    {selected && <Feather name="check" size={12} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}

            {selectedCardIds.length > 0 && (
              <>
                <Text style={modal.sectionLabel}>Payment Amounts</Text>
                {selectedCardIds.map((id) => {
                  const card = cards.find((c) => c.id === id)!;
                  const color = CARD_COLORS[id] || Colors.primary;
                  return (
                    <View key={id} style={modal.amountRow}>
                      <View style={[modal.cardDot, { backgroundColor: color }]} />
                      <Text style={modal.amountCardName}>{card.name}</Text>
                      <View style={modal.amountInputWrap}>
                        <Text style={modal.dollarSign}>$</Text>
                        <TextInput
                          style={modal.amountInput}
                          value={amounts[id] || ""}
                          onChangeText={(v) => setAmounts((p) => ({ ...p, [id]: v }))}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            <Text style={modal.sectionLabel}>Payment Date</Text>
            <View style={modal.dateRow}>
              <Feather name="calendar" size={16} color={Colors.primary} />
              <TextInput
                style={modal.dateInput}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <Text style={modal.sectionLabel}>Note (optional)</Text>
            <TextInput
              style={modal.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Monthly minimum payment..."
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [modal.saveBtn, pressed && { opacity: 0.8 }]}
            >
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={modal.saveBtnText}>Schedule Payment</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function PayScreen() {
  const { transactions, cards, scheduledPayments, totalBalance } = useFinance();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("All");
  const [modalVisible, setModalVisible] = useState(false);

  const filtered = transactions
    .filter((t) => {
      if (filter === "All") return true;
      if (filter === "Debit") return t.type === "debit";
      return t.type === "credit";
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));
  const totalDebit = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalCredit = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TransactionItem transaction={item} card={cardById[item.cardId]} showCard />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Feather name="inbox" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        )}
        ListHeaderComponent={() => (
          <>
            <View style={[styles.pageHeader, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={styles.pageTitle}>Pay</Text>
                <Text style={styles.pageSubtitle}>Manage & schedule payments</Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setModalVisible(true);
                }}
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
              >
                <Feather name="plus" size={20} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Money In</Text>
                <Text style={[styles.summaryAmt, { color: Colors.positive }]}>
                  +{formatCurrency(totalCredit)}
                </Text>
              </View>
              <View style={styles.summaryDiv} />
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Money Out</Text>
                <Text style={[styles.summaryAmt, { color: Colors.negative }]}>
                  -{formatCurrency(totalDebit)}
                </Text>
              </View>
            </View>

            {scheduledPayments.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Scheduled Payments</Text>
                {scheduledPayments.map((sp) => {
                  const totalAmt = Object.values(sp.amounts).reduce((s, a) => s + a, 0);
                  return (
                    <View key={sp.id} style={styles.scheduledCard}>
                      <View style={styles.scheduledTop}>
                        <View style={styles.scheduledDateWrap}>
                          <Feather name="calendar" size={14} color={Colors.primary} />
                          <Text style={styles.scheduledDate}>
                            {formatDateDisplay(sp.date)}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge,
                          { backgroundColor: sp.status === "pending" ? "rgba(108,158,255,0.15)" : "rgba(74,222,170,0.15)" }
                        ]}>
                          <Text style={[styles.statusText,
                            { color: sp.status === "pending" ? Colors.primary : Colors.positive }
                          ]}>
                            {sp.status === "pending" ? "Pending" : "Completed"}
                          </Text>
                        </View>
                      </View>
                      {sp.note ? <Text style={styles.scheduledNote}>{sp.note}</Text> : null}
                      <View style={styles.scheduledCards}>
                        {sp.cardIds.map((cid) => {
                          const c = cardById[cid];
                          if (!c) return null;
                          return (
                            <View key={cid} style={styles.scheduledCardRow}>
                              <View style={[styles.cardDot, { backgroundColor: CARD_COLORS[cid] || Colors.primary }]} />
                              <Text style={styles.scheduledCardName}>
                                {c.name} ···{c.lastFour}
                              </Text>
                              <Text style={styles.scheduledAmt}>
                                {formatCurrency(sp.amounts[cid] || 0)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      <View style={styles.scheduledTotalRow}>
                        <Text style={styles.scheduledTotalLabel}>Total</Text>
                        <Text style={styles.scheduledTotalValue}>{formatCurrency(totalAmt)}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            <View style={styles.filterRow}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <View style={styles.filters}>
                {FILTERS.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      />

      <View style={[styles.payAllContainer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Pay All Cards",
              `This will pay all ${cards.length} cards totaling ${formatCurrency(totalBalance)} on the next billing date. Proceed?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", style: "default", onPress: () => {} },
              ]
            );
          }}
          style={({ pressed }) => [styles.payAllBtn, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={[Colors.primaryDark, "#6C9EFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payAllGrad}
          >
            <Feather name="zap" size={18} color="#fff" />
            <Text style={styles.payAllText}>Pay All Cards</Text>
            <Text style={styles.payAllAmt}>{formatCurrency(totalBalance)}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <ScheduleModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  listContent: { paddingBottom: 160 },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryAmt: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  summaryDiv: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  scheduledCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    gap: 10,
  },
  scheduledTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scheduledDateWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scheduledDate: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  scheduledNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scheduledCards: {
    gap: 7,
  },
  scheduledCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  scheduledCardName: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  scheduledAmt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  scheduledTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  scheduledTotalLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
  },
  scheduledTotalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  filterRow: {
    marginBottom: 8,
    gap: 8,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 4,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  filterBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: "#fff",
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 20,
  },
  empty: {
    paddingTop: 40,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  payAllContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "rgba(26,16,63,0.85)",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  payAllBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  payAllGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  payAllText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginLeft: -28,
  },
  payAllAmt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1E1248",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
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
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: 12,
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  amountCardName: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    minWidth: 90,
  },
  dollarSign: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  amountInput: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    minWidth: 60,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 4,
  },
  dateInput: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  noteInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 4,
    minHeight: 70,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
