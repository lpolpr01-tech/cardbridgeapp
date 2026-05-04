import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SupportSection } from "@/components/SupportSection";
import { PlaidAddBankButton } from "@/components/PlaidAddBankButton";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import { useTheme } from "@/context/ThemeContext";
import type { BankAccount } from "@/context/FinanceContext";

const BG_DAMASK = require("../../assets/images/bg-damask.png");
const GLASS_INLINE = {
  backdropFilter: "blur(20px) saturate(140%)",
  boxShadow: "0px 8px 32px rgba(0,0,0,0.5), inset 0px 1px 0px rgba(180,130,255,0.12)",
} as any;

const CF_LOGO = require("../../assets/images/profile-logo.png");
const SCREEN_W = Dimensions.get("window").width;
const SLIDER_W = SCREEN_W - 80;

// ─── Zoom Slider ──────────────────────────────────────────────────────────────

function ZoomSlider({
  value,
  min = 1,
  max = 3,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const pct = (value - min) / (max - min);
  const thumbX = useRef(new Animated.Value(pct * SLIDER_W)).current;
  const currentPct = useRef(pct);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        (thumbX as any)._value !== undefined &&
          thumbX.setOffset((thumbX as any)._value);
        thumbX.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        const raw = Math.max(0, Math.min(SLIDER_W, (thumbX as any)._offset + gs.dx));
        currentPct.current = raw / SLIDER_W;
        thumbX.setValue(gs.dx);
        onChange(min + currentPct.current * (max - min));
      },
      onPanResponderRelease: () => {
        thumbX.flattenOffset();
      },
    })
  ).current;

  return (
    <View style={zs.wrap}>
      <Feather name="minus" size={14} color={Colors.textMuted} />
      <View style={zs.track}>
        <Animated.View
          style={[zs.fill, { width: thumbX.interpolate({ inputRange: [0, SLIDER_W], outputRange: [0, SLIDER_W], extrapolate: "clamp" }) }]}
        />
        <Animated.View
          style={[zs.thumb, { transform: [{ translateX: thumbX.interpolate({ inputRange: [0, SLIDER_W], outputRange: [0, SLIDER_W], extrapolate: "clamp" }) }] }]}
          {...panResponder.panHandlers}
        />
      </View>
      <Feather name="plus" size={14} color={Colors.textMuted} />
    </View>
  );
}

const zs = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    position: "relative",
    justifyContent: "center",
  },
  fill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    position: "absolute",
    left: 0,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    position: "absolute",
    top: -9,
    left: -11,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
});

// ─── Profile Picture Modal ────────────────────────────────────────────────────

function ProfilePictureModal({
  visible,
  current,
  onAdd,
  onClose,
}: {
  visible: boolean;
  current: any;
  onAdd: (uri: string, zoom: number) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<"choose" | "adjust">("choose");
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  React.useEffect(() => {
    if (visible) { setStage("choose"); setPickedUri(null); setZoom(1); }
  }, [visible]);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
      setStage("adjust");
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
      setStage("adjust");
    }
  };

  const PREVIEW = 220;
  const scale = zoom;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={pp.overlay}>
        <View style={[pp.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={pp.handle} />
          <View style={pp.header}>
            <Text style={pp.title}>
              {stage === "choose" ? "Change Photo" : "Adjust Photo"}
            </Text>
            <Pressable onPress={onClose} style={pp.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {stage === "choose" ? (
            <View style={pp.chooseWrap}>
              {/* Current preview */}
              <View style={pp.currentWrap}>
                <View style={pp.currentCircle}>
                  {current ? (
                    <Image source={typeof current === "string" ? { uri: current } : current} style={pp.currentImg} />
                  ) : (
                    <Text style={pp.currentInitials}>LP</Text>
                  )}
                </View>
                <Text style={pp.currentLabel}>Current Photo</Text>
              </View>

              <Pressable
                onPress={takePhoto}
                style={({ pressed }) => [pp.chooseBtn, pressed && { opacity: 0.75 }]}
              >
                <View style={pp.chooseBtnIcon}>
                  <Feather name="camera" size={22} color={Colors.primary} />
                </View>
                <View>
                  <Text style={pp.chooseBtnLabel}>Take Photo</Text>
                  <Text style={pp.chooseBtnSub}>Use your camera</Text>
                </View>
                <Feather name="chevron-right" size={18} color={Colors.textMuted} style={{ marginLeft: "auto" }} />
              </Pressable>

              <View style={pp.divider} />

              <Pressable
                onPress={pickFromLibrary}
                style={({ pressed }) => [pp.chooseBtn, pressed && { opacity: 0.75 }]}
              >
                <View style={pp.chooseBtnIcon}>
                  <Feather name="image" size={22} color={Colors.primary} />
                </View>
                <View>
                  <Text style={pp.chooseBtnLabel}>Choose from Library</Text>
                  <Text style={pp.chooseBtnSub}>Pick from your photos</Text>
                </View>
                <Feather name="chevron-right" size={18} color={Colors.textMuted} style={{ marginLeft: "auto" }} />
              </Pressable>
            </View>
          ) : (
            <>
              {/* Image preview with circular clip */}
              <View style={pp.previewWrap}>
                <View style={[pp.previewCircle, { width: PREVIEW, height: PREVIEW, borderRadius: PREVIEW / 2 }]}>
                  {pickedUri ? (
                    <Image
                      source={{ uri: pickedUri }}
                      style={{
                        width: PREVIEW * scale,
                        height: PREVIEW * scale,
                        borderRadius: (PREVIEW * scale) / 2,
                      }}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>
              </View>

              {/* Zoom label */}
              <View style={pp.zoomLabelRow}>
                <Feather name="zoom-in" size={14} color={Colors.textMuted} />
                <Text style={pp.zoomLabel}>Zoom  ·  {zoom.toFixed(1)}x</Text>
              </View>

              {/* Zoom slider */}
              <ZoomSlider value={zoom} min={1} max={3} onChange={(v) => setZoom(parseFloat(v.toFixed(2)))} />

              {/* Bottom buttons */}
              <View style={pp.adjustFooter}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [pp.cancelBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={pp.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (pickedUri) {
                      onAdd(pickedUri, zoom);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                    onClose();
                  }}
                  style={({ pressed }) => [pp.addBtn, pressed && { opacity: 0.8 }]}
                >
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={pp.addBtnText}>Add</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const pp = StyleSheet.create({
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
    width: 36, height: 4, backgroundColor: Colors.divider,
    borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 20,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  chooseWrap: { paddingBottom: 8 },
  currentWrap: { alignItems: "center", marginBottom: 24 },
  currentCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryDark,
    overflow: "hidden", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.primary,
  },
  currentImg: { width: 80, height: 80 },
  currentInitials: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  currentLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 8 },
  chooseBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  chooseBtnIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(108,158,255,0.12)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(108,158,255,0.2)",
  },
  chooseBtnLabel: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textPrimary },
  chooseBtnSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 4 },
  previewWrap: { alignItems: "center", marginBottom: 20 },
  previewCircle: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryDark,
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  zoomLabelRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    justifyContent: "center", marginBottom: 10,
  },
  zoomLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  adjustFooter: {
    flexDirection: "row", gap: 12, marginTop: 4,
  },
  cancelBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 15, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: Colors.divider,
  },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  addBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, borderRadius: 14,
    backgroundColor: Colors.positive,
  },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});

// ─── Refer a Friend Modal ─────────────────────────────────────────────────────

function ReferFriendModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [sent, setSent] = useState(false);

  React.useEffect(() => {
    if (visible) { setInput(""); setSent(false); }
  }, [visible]);

  const handleSend = () => {
    if (!input.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSent(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
      <View style={rf.overlay}>
        <View style={[rf.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={rf.handle} />
          <View style={rf.header}>
            <Text style={rf.title}>Refer a Friend</Text>
            <Pressable onPress={onClose} style={rf.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {sent ? (
            <View style={rf.successWrap}>
              <View style={rf.successIcon}>
                <Feather name="check" size={28} color={Colors.positive} />
              </View>
              <Text style={rf.successTitle}>Invite Sent!</Text>
              <Text style={rf.successSub}>
                We've sent an invite to {input}. They'll get one month free when they sign up.
              </Text>
              <Pressable onPress={onClose} style={rf.doneBtn}>
                <Text style={rf.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={rf.perkBanner}>
                <Feather name="gift" size={16} color="#F59E0B" />
                <Text style={rf.perkText}>Both of you get 1 month free when they sign up</Text>
              </View>

              <Text style={rf.fieldLabel}>Email or Phone Number</Text>
              <TextInput
                style={rf.input}
                value={input}
                onChangeText={setInput}
                placeholder="friend@example.com  or  +1 555 000 0000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Pressable
                onPress={handleSend}
                style={({ pressed }) => [rf.sendBtn, !input.trim() && rf.sendBtnDisabled, pressed && { opacity: 0.8 }]}
              >
                <Feather name="send" size={15} color="#fff" />
                <Text style={rf.sendBtnText}>Send Invite</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const rf = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center",
  },
  perkBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.25)",
    padding: 12, marginBottom: 20,
  },
  perkText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#F59E0B", flex: 1 },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8,
  },
  input: {
    fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.divider, marginBottom: 16,
  },
  sendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: Colors.primaryDark, borderRadius: 14,
    paddingVertical: 16, marginBottom: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  successWrap: { alignItems: "center", paddingVertical: 20, gap: 12 },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(74,222,170,0.12)", alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(74,222,170,0.3)", marginBottom: 4,
  },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  successSub: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary,
    textAlign: "center", lineHeight: 20, paddingHorizontal: 12,
  },
  doneBtn: {
    marginTop: 8, backgroundColor: Colors.primaryDark, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 40,
  },
  doneBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});

// ─── Profile Action Menu Modal ────────────────────────────────────────────────

function ProfileMenuModal({
  visible,
  onClose,
  onManageSub,
  onRefer,
  onChangePhoto,
}: {
  visible: boolean;
  onClose: () => void;
  onManageSub: () => void;
  onRefer: () => void;
  onChangePhoto: () => void;
}) {
  const insets = useSafeAreaInsets();

  const items = [
    {
      icon: "star",
      label: "Manage Subscription",
      sub: "View your plan & billing",
      onPress: onManageSub,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.12)",
    },
    {
      icon: "user-plus",
      label: "Refer a Friend",
      sub: "Share and earn rewards",
      onPress: onRefer,
      color: Colors.primary,
      bg: "rgba(108,158,255,0.12)",
    },
    {
      icon: "camera",
      label: "Change Profile Picture",
      sub: "Take a photo or choose from library",
      onPress: onChangePhoto,
      color: Colors.positive,
      bg: "rgba(74,222,170,0.12)",
    },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={pm.overlay} onPress={onClose}>
        <Pressable style={[pm.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
          <View style={pm.handle} />
          <Text style={pm.title}>Profile</Text>
          <View style={pm.itemsWrap}>
            {items.map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && <View style={pm.itemDivider} />}
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); item.onPress(); }}
                  style={({ pressed }) => [pm.item, pressed && pm.itemPressed]}
                >
                  <View style={[pm.itemIcon, { backgroundColor: item.bg }]}>
                    <Feather name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <View style={pm.itemInfo}>
                    <Text style={pm.itemLabel}>{item.label}</Text>
                    <Text style={pm.itemSub}>{item.sub}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={Colors.textMuted} />
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: {
    fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary,
    marginBottom: 16,
  },
  itemsWrap: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16,
    borderWidth: 1, borderColor: Colors.divider, overflow: "hidden", marginBottom: 8,
  },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  itemPressed: { backgroundColor: "rgba(255,255,255,0.04)" },
  itemDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: 66 },
  itemIcon: {
    width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center",
  },
  itemInfo: { flex: 1, gap: 2 },
  itemLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textPrimary },
  itemSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
});

// ─── Personal Info Modal ──────────────────────────────────────────────────────

type PersonalInfo = {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  newsletter: boolean;
};

function PersonalInfoModal({
  visible, info, onSave, onClose,
}: {
  visible: boolean; info: PersonalInfo;
  onSave: (i: PersonalInfo) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState(info.firstName);
  const [middleName, setMiddleName] = useState(info.middleName);
  const [lastName, setLastName] = useState(info.lastName);
  const [phone, setPhone] = useState(info.phone);
  const [email, setEmail] = useState(info.email);
  const [newsletter, setNewsletter] = useState(info.newsletter);

  React.useEffect(() => {
    if (visible) {
      setFirstName(info.firstName); setMiddleName(info.middleName);
      setLastName(info.lastName); setPhone(info.phone);
      setEmail(info.email); setNewsletter(info.newsletter);
    }
  }, [visible]);

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Required", "First name and last name are required.");
      return;
    }
    onSave({ firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim(), newsletter });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
      <View style={piModal.overlay}>
        <View style={[piModal.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={piModal.handle} />
          <View style={piModal.header}>
            <Text style={piModal.title}>Personal Info</Text>
            <Pressable onPress={onClose} style={piModal.closeBtn}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <Text style={piModal.fieldLabel}>First Name</Text>
            <TextInput style={piModal.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
            <Text style={piModal.fieldLabel}>Middle Name</Text>
            <TextInput style={piModal.input} value={middleName} onChangeText={setMiddleName} placeholder="Middle name (optional)" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
            <Text style={piModal.fieldLabel}>Last Name</Text>
            <TextInput style={piModal.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
            <View style={piModal.divider} />
            <Text style={piModal.fieldLabel}>Phone Number</Text>
            <TextInput style={piModal.input} value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
            <Text style={piModal.fieldLabel}>Email Address</Text>
            <TextInput style={piModal.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
            <View style={piModal.divider} />
            <Pressable onPress={() => { Haptics.selectionAsync(); setNewsletter((n) => !n); }} style={piModal.newsletterRow}>
              <View style={piModal.newsletterCheck}>
                {newsletter ? (
                  <View style={piModal.checkFilled}><Feather name="check" size={13} color="#fff" /></View>
                ) : (
                  <View style={piModal.checkEmpty} />
                )}
              </View>
              <View style={piModal.newsletterInfo}>
                <Text style={piModal.newsletterLabel}>Receive newsletter & promotions</Text>
                <Text style={piModal.newsletterSub}>Stay updated with offers and insights via email</Text>
              </View>
            </Pressable>
            <Pressable onPress={handleSave} style={({ pressed }) => [piModal.saveBtn, pressed && { opacity: 0.8 }]}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={piModal.saveBtnText}>Save Changes</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── KYC Modal ────────────────────────────────────────────────────────────────

function KycModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [legalFirst, setLegalFirst] = useState("Luis");
  const [legalMiddle, setLegalMiddle] = useState("");
  const [legalLast, setLegalLast] = useState("Pol");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [idType, setIdType] = useState<"passport" | "license" | "id">("license");
  const [idNumber, setIdNumber] = useState("");
  const [ssn, setSsn] = useState("");
  const [taxConsent, setTaxConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const ID_TYPES: { key: "passport" | "license" | "id"; label: string }[] = [
    { key: "license", label: "Driver's License" },
    { key: "passport", label: "Passport" },
    { key: "id", label: "State ID" },
  ];

  const handleSubmit = () => {
    if (!legalFirst.trim() || !legalLast.trim()) {
      Alert.alert("Required", "Legal name is required."); return;
    }
    if (!dob.trim()) {
      Alert.alert("Required", "Date of birth is required."); return;
    }
    if (!address.trim() || !city.trim() || !stateVal.trim() || !zip.trim()) {
      Alert.alert("Required", "Full address is required."); return;
    }
    if (!idNumber.trim()) {
      Alert.alert("Required", "ID number is required."); return;
    }
    if (!taxConsent) {
      Alert.alert("Consent Required", "Please consent to tax reporting to continue."); return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={kyc.overlay}>
          <View style={[kyc.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={kyc.successWrap}>
              <View style={kyc.successIcon}><Feather name="shield" size={36} color={Colors.positive} /></View>
              <Text style={kyc.successTitle}>Identity Verified</Text>
              <Text style={kyc.successSub}>Your identity documents have been submitted for review. You'll be notified within 1–2 business days.</Text>
              <Pressable onPress={() => { setSubmitted(false); onClose(); }} style={kyc.successBtn}>
                <Text style={kyc.successBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
      <View style={kyc.overlay}>
        <View style={[kyc.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={kyc.handle} />
          <View style={kyc.header}>
            <View style={kyc.headerLeft}>
              <View style={kyc.iconWrap}>
                <Feather name="shield" size={16} color={Colors.primary} />
              </View>
              <Text style={kyc.title}>Identity Verification</Text>
            </View>
            <Pressable onPress={onClose} style={kyc.closeBtn}>
              <Feather name="x" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <Text style={kyc.sectionLabel}>Legal Name</Text>
            <TextInput style={kyc.input} value={legalFirst} onChangeText={setLegalFirst} placeholder="Legal first name" placeholderTextColor={Colors.textMuted} />
            <TextInput style={kyc.input} value={legalMiddle} onChangeText={setLegalMiddle} placeholder="Middle name (optional)" placeholderTextColor={Colors.textMuted} />
            <TextInput style={kyc.input} value={legalLast} onChangeText={setLegalLast} placeholder="Legal last name" placeholderTextColor={Colors.textMuted} />

            <Text style={kyc.sectionLabel}>Date of Birth</Text>
            <TextInput style={kyc.input} value={dob} onChangeText={setDob} placeholder="MM/DD/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numbers-and-punctuation" />

            <Text style={kyc.sectionLabel}>Residential Address</Text>
            <TextInput style={kyc.input} value={address} onChangeText={setAddress} placeholder="Street address" placeholderTextColor={Colors.textMuted} />
            <View style={kyc.row2}>
              <TextInput style={[kyc.input, { flex: 1 }]} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={Colors.textMuted} />
              <TextInput style={[kyc.input, { width: 56 }]} value={stateVal} onChangeText={setStateVal} placeholder="ST" placeholderTextColor={Colors.textMuted} maxLength={2} autoCapitalize="characters" />
              <TextInput style={[kyc.input, { width: 80 }]} value={zip} onChangeText={setZip} placeholder="ZIP" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={5} />
            </View>

            <Text style={kyc.sectionLabel}>Government-Issued ID</Text>
            <View style={kyc.idTypeRow}>
              {ID_TYPES.map((t) => (
                <Pressable key={t.key} onPress={() => setIdType(t.key)} style={[kyc.idTypeBtn, idType === t.key && kyc.idTypeBtnActive]}>
                  <Text style={[kyc.idTypeBtnText, idType === t.key && kyc.idTypeBtnTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={kyc.input} value={idNumber} onChangeText={setIdNumber} placeholder="ID / Document number" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" />

            <Text style={kyc.sectionLabel}>Tax & Consent</Text>
            <TextInput style={kyc.input} value={ssn} onChangeText={setSsn} placeholder="SSN / Tax ID (optional)" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" secureTextEntry />
            <Pressable onPress={() => { Haptics.selectionAsync(); setTaxConsent((c) => !c); }} style={kyc.consentRow}>
              <View style={[kyc.checkBox, taxConsent && kyc.checkBoxActive]}>
                {taxConsent && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={kyc.consentText}>I consent to tax reporting obligations and agree to CardFlow's identity verification terms and conditions.</Text>
            </Pressable>

            <Pressable onPress={handleSubmit} style={({ pressed }) => [kyc.submitBtn, pressed && { opacity: 0.85 }]}>
              <Feather name="shield" size={16} color="#fff" />
              <Text style={kyc.submitBtnText}>Submit Verification</Text>
            </Pressable>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const kyc = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: "92%" },
  handle: { width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(108,158,255,0.15)", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 13, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary, marginBottom: 8 },
  row2: { flexDirection: "row", gap: 8 },
  idTypeRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  idTypeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  idTypeBtnActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  idTypeBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  idTypeBtnTextActive: { color: "#fff" },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, marginBottom: 8 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkBoxActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  consentText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18, flex: 1 },
  submitBtn: { borderRadius: 14, backgroundColor: Colors.primaryDark, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, marginTop: 4 },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  successWrap: { alignItems: "center", gap: 14, paddingVertical: 40 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(74,222,170,0.12)", borderWidth: 1.5, borderColor: "rgba(74,222,170,0.3)", alignItems: "center", justifyContent: "center" },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  successBtn: { backgroundColor: Colors.primaryDark, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14, marginTop: 8 },
  successBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});

// ─── Notifications Modal ───────────────────────────────────────────────────────

type NotifPrefs = {
  dueDateReminder: boolean;
  paymentReminder: boolean;
  statementReady: boolean;
  emailDelivery: boolean;
  smsDelivery: boolean;
};

function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<NotifPrefs>({
    dueDateReminder: true,
    paymentReminder: true,
    statementReady: true,
    emailDelivery: false,
    smsDelivery: true,
  });
  const toggle = (key: keyof NotifPrefs) => {
    Haptics.selectionAsync();
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const NotifRow = ({ label, sub, k }: { label: string; sub?: string; k: keyof NotifPrefs }) => (
    <View style={notif.row}>
      <View style={notif.rowInfo}>
        <Text style={notif.rowLabel}>{label}</Text>
        {sub && <Text style={notif.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={prefs[k]}
        onValueChange={() => toggle(k)}
        trackColor={{ false: "rgba(255,255,255,0.12)", true: Colors.primary }}
        thumbColor={prefs[k] ? "#fff" : "rgba(255,255,255,0.5)"}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={notif.overlay}>
        <View style={[notif.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={notif.handle} />
          <View style={notif.header}>
            <View style={notif.headerLeft}>
              <View style={notif.iconWrap}>
                <Feather name="bell" size={16} color={Colors.primary} />
              </View>
              <Text style={notif.title}>Notification Preferences</Text>
            </View>
            <Pressable onPress={onClose} style={notif.closeBtn}>
              <Feather name="x" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>

          <Text style={notif.sectionLabel}>Alerts</Text>
          <View style={notif.group}>
            <NotifRow label="Due Date Reminder" sub="3 days before payment is due" k="dueDateReminder" />
            <View style={notif.divider} />
            <NotifRow label="Payment Reminder" sub="Day of scheduled payment" k="paymentReminder" />
            <View style={notif.divider} />
            <NotifRow label="Statement Balance Ready" sub="When monthly statement is available" k="statementReady" />
          </View>

          <Text style={notif.sectionLabel}>Delivery Method</Text>
          <View style={notif.group}>
            <NotifRow label="Email" sub="Sent to your registered email" k="emailDelivery" />
            <View style={notif.divider} />
            <NotifRow label="SMS / Text" sub="Sent to your phone number" k="smsDelivery" />
          </View>

          <Pressable
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); }}
            style={({ pressed }) => [notif.saveBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={notif.saveBtnText}>Save Preferences</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const notif = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(108,158,255,0.15)", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  group: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  rowInfo: { flex: 1 },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textPrimary },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginHorizontal: 16 },
  saveBtn: { backgroundColor: Colors.primaryDark, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});

// ─── Setting Row ──────────────────────────────────────────────────────────────

type SettingRowProps = {
  icon: string; label: string; subtitle?: string; value?: string;
  onPress?: () => void; showChevron?: boolean;
  toggle?: boolean; toggleValue?: boolean; onToggle?: (v: boolean) => void;
};

function SettingRow({ icon, label, subtitle, value, onPress, showChevron = true, toggle, toggleValue, onToggle }: SettingRowProps) {
  return (
    <Pressable onPress={() => { if (onPress) { Haptics.selectionAsync(); onPress(); } }} style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}>
      <View style={styles.settingIcon}>
        <Feather name={icon as any} size={18} color={Colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      {value && !toggle ? <Text style={styles.settingValue}>{value}</Text> : null}
      {toggle ? (
        <Switch value={!!toggleValue} onValueChange={onToggle} trackColor={{ false: Colors.divider, true: Colors.primaryDark }} thumbColor="#fff" />
      ) : showChevron ? (
        <Feather name="chevron-right" size={16} color={Colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

// ─── Options Screen ───────────────────────────────────────────────────────────

type PlaidDepositoryAccount = {
  accountId: string;
  name: string;
  mask: string | null;
  subtype: string | null;
  institutionName: string;
};

export default function OptionsScreen() {
  const insets = useSafeAreaInsets();
  const { cards, transactions, bankAccounts } = useFinance();
  const { token: authToken, isBiometricEnabled, isBiometricAvailable, enableBiometric, disableBiometric, logout } = useAuth();
  const [banksExpanded, setBanksExpanded] = useState(false);
  const [kycVisible, setKycVisible] = useState(false);
  const [notifPrefsVisible, setNotifPrefsVisible] = useState(false);
  const [plaidBanks, setPlaidBanks] = useState<PlaidDepositoryAccount[]>([]);

  // Fetch Plaid-linked depository accounts from backend so the Linked Bank
  // Accounts list reflects what is actually linked server-side.
  const fetchPlaidBanks = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/plaid/accounts"), {
        method: "GET",
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        accounts: { accountId: string; name: string; mask: string | null; type: string; subtype: string | null; institutionName: string }[];
      };
      const deps = (data.accounts ?? []).filter(
        (a) => a.type === "depository" || a.subtype === "checking" || a.subtype === "savings",
      );
      setPlaidBanks(deps.map((a) => ({
        accountId: a.accountId,
        name: a.name,
        mask: a.mask,
        subtype: a.subtype,
        institutionName: a.institutionName,
      })));
    } catch {}
  }, [authToken]);

  useEffect(() => {
    fetchPlaidBanks();
  }, [fetchPlaidBanks]);

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: "Luis",
    middleName: "",
    lastName: "Pol",
    phone: "",
    email: "luispol@gmail.com",
    newsletter: false,
  });
  const [personalInfoVisible, setPersonalInfoVisible] = useState(false);

  // Profile picture — starts with the CF logo
  const [profilePhoto, setProfilePhoto] = useState<{ uri: string } | null>(null);
  const profileSource = profilePhoto ?? CF_LOGO;

  // Profile menu modals
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [referVisible, setReferVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const displayName = [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName]
    .filter(Boolean).join(" ");
  const initials = [personalInfo.firstName[0], personalInfo.lastName[0]]
    .filter(Boolean).join("").toUpperCase();

  const totalCredit = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);

  const { theme, effectiveBgStart, effectiveBgEnd } = useTheme();

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={styles.gradient}>
      <Image source={BG_DAMASK} style={styles.bgTexture} resizeMode="cover" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        {/* Profile card — avatar is tappable */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setProfileMenuVisible(true); }}
          style={({ pressed }) => [styles.profileCard, GLASS_INLINE, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.avatar}>
            <Image
              source={profileSource}
              style={styles.avatarImg}
              resizeMode="cover"
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{personalInfo.email || "No email set"}</Text>
          </View>
          <View style={styles.profileEditBadge}>
            <Feather name="edit-2" size={13} color={Colors.primary} />
          </View>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        </Pressable>

        <View style={[styles.statsRow, GLASS_INLINE]}>
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
        <View style={[styles.settingsGroup, GLASS_INLINE]}>
          <SettingRow icon="user" label="Personal Info" subtitle={displayName} onPress={() => setPersonalInfoVisible(true)} />
          <View style={styles.rowDivider} />
          <SettingRow icon="credit-card" label="Linked Cards" value={`${cards.length} cards`} onPress={() => router.push("/linked-cards")} />
          <View style={styles.rowDivider} />
          <SettingRow icon="dollar-sign" label="Currency" value="USD" onPress={() => {}} />
        </View>

        <SectionLabel text="Linked Bank Accounts" />
        <View style={[styles.settingsGroup, GLASS_INLINE]}>
          {/* Collapsible header row */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setBanksExpanded((e) => !e); }}
            style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
          >
            <View style={[styles.settingIcon, { backgroundColor: "rgba(74,222,170,0.1)" }]}>
              <Text style={{ fontSize: 17 }}>🏦</Text>
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bank Accounts</Text>
              <Text style={styles.settingSubtitle}>
                {(bankAccounts.length + plaidBanks.length) === 0 ? "No accounts linked" : `${bankAccounts.length + plaidBanks.length} linked`}
              </Text>
            </View>
            {(bankAccounts.length + plaidBanks.length) > 0 && (
              <View style={bankS.countBadge}>
                <Text style={bankS.countBadgeText}>{bankAccounts.length + plaidBanks.length} linked</Text>
              </View>
            )}
            <Feather
              name={banksExpanded ? "chevron-up" : "chevron-right"}
              size={16}
              color={Colors.textMuted}
            />
          </Pressable>

          {/* Expanded content */}
          {banksExpanded && (
            <>
              {bankAccounts.length === 0 && plaidBanks.length === 0 && (
                <View style={bankS.emptyInline}>
                  <Text style={bankS.emptyInlineText}>No bank accounts linked yet. Add one below.</Text>
                </View>
              )}
              {plaidBanks.map((bank) => (
                <React.Fragment key={bank.accountId}>
                  <View style={styles.rowDivider} />
                  <View style={styles.settingRow}>
                    <View style={[styles.settingIcon, { backgroundColor: "rgba(74,222,170,0.08)" }]}>
                      <Feather name="link" size={16} color={Colors.positive} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>{bank.institutionName}</Text>
                      <Text style={styles.settingSubtitle}>
                        {(bank.subtype ?? "Account").replace(/^./, (c) => c.toUpperCase())}
                        {bank.mask ? ` ···${bank.mask}` : ""}
                        {`  ·  ${bank.name}`}
                      </Text>
                    </View>
                    <View style={bankS.connectedBadge}>
                      <View style={bankS.connectedDot} />
                      <Text style={bankS.connectedText}>Plaid</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
              {bankAccounts.map((bank) => (
                <React.Fragment key={bank.id}>
                  <View style={styles.rowDivider} />
                  <View style={styles.settingRow}>
                    <View style={[styles.settingIcon, { backgroundColor: "rgba(74,222,170,0.08)" }]}>
                      <Feather name="database" size={16} color={Colors.positive} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>{bank.bankName}</Text>
                      <Text style={styles.settingSubtitle}>
                        {bank.accountType.charAt(0).toUpperCase() + bank.accountType.slice(1)} ···{bank.lastFour}
                        {bank.nickname ? `  ·  ${bank.nickname}` : ""}
                      </Text>
                    </View>
                    <View style={bankS.connectedBadge}>
                      <View style={bankS.connectedDot} />
                      <Text style={bankS.connectedText}>Local</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
              <View style={[styles.rowDivider, { marginTop: 8 }]} />
              <View style={bankS.addBtnWrap}>
                <PlaidAddBankButton />
              </View>
            </>
          )}
        </View>

        <SectionLabel text="Security" />
        <View style={[styles.settingsGroup, GLASS_INLINE]}>
          <SettingRow
            icon="shield"
            label="Biometric Auth"
            subtitle={
              isBiometricAvailable
                ? "Face ID / Touch ID for app unlock"
                : "Not available on this device"
            }
            toggle
            toggleValue={isBiometricEnabled}
            onToggle={async (next) => {
              if (!isBiometricAvailable) {
                Alert.alert(
                  "Not available",
                  "Your device does not have Face ID, Touch ID, or fingerprint enrolled.",
                );
                return;
              }
              if (next) {
                const ok = await enableBiometric();
                if (!ok) {
                  Alert.alert("Biometric setup failed", "Could not verify your identity. Try again.");
                }
              } else {
                await disableBiometric();
              }
            }}
          />
          <View style={styles.rowDivider} />
          <SettingRow icon="clock" label="Auto Sign-Out" subtitle="After 15 minutes of inactivity" />
          <View style={styles.rowDivider} />
          <SettingRow icon="eye-off" label="Hide Balance" onPress={() => {}} />
        </View>

        <SectionLabel text="Support" />
        <View style={[styles.settingsGroup, GLASS_INLINE]}>
          <SettingRow
            icon="alert-triangle"
            label="Report a Problem"
            subtitle="Flag a payment issue or get help"
            onPress={() => router.push("/report-problem")}
          />
        </View>

        <SectionLabel text="Notifications" />
        <View style={[styles.settingsGroup, GLASS_INLINE]}>
          <SettingRow icon="bell" label="Notification Preferences" subtitle="Manage alerts & delivery methods" onPress={() => setNotifPrefsVisible(true)} />
          <View style={styles.rowDivider} />
          <SettingRow icon="mail" label="Email Reports" subtitle="Weekly spending summary" onPress={() => {}} />
        </View>

        <SectionLabel text="Identity & Compliance" />
        <View style={[styles.settingsGroup, GLASS_INLINE]}>
          <SettingRow icon="shield" label="Identity Verification" subtitle="Submit KYC documents" onPress={() => setKycVisible(true)} />
        </View>

        <SupportSection />

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.75 }]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              "Sign Out",
              "You'll need to sign in again to access your account.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: () => logout("user") },
              ],
            );
          }}
        >
          <Feather name="log-out" size={16} color={Colors.negative} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.version}>CardFlow v1.0.0</Text>
      </ScrollView>

      <PersonalInfoModal
        visible={personalInfoVisible}
        info={personalInfo}
        onSave={setPersonalInfo}
        onClose={() => setPersonalInfoVisible(false)}
      />
      <ProfileMenuModal
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
        onManageSub={() => { setProfileMenuVisible(false); router.push("/subscription-plan"); }}
        onRefer={() => { setProfileMenuVisible(false); setReferVisible(true); }}
        onChangePhoto={() => { setProfileMenuVisible(false); setPickerVisible(true); }}
      />
      <ReferFriendModal visible={referVisible} onClose={() => setReferVisible(false)} />
      <ProfilePictureModal
        visible={pickerVisible}
        current={profilePhoto}
        onAdd={(uri, zoom) => setProfilePhoto({ uri })}
        onClose={() => setPickerVisible(false)}
      />
      <KycModal visible={kycVisible} onClose={() => setKycVisible(false)} />
      <NotificationsModal visible={notifPrefsVisible} onClose={() => setNotifPrefsVisible(false)} />
    </LinearGradient>
  );
}

// ─── Bank empty-state styles ──────────────────────────────────────────────────

const bankS = StyleSheet.create({
  countBadge: {
    backgroundColor: "rgba(108,158,255,0.18)",
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(108,158,255,0.3)",
    paddingHorizontal: 9, paddingVertical: 3, marginRight: 6,
  },
  countBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.primary },
  connectedBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginRight: 4 },
  connectedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.positive },
  connectedText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.positive },
  emptyInline: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  emptyInlineText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, textAlign: "center" },
  addBtnWrap: { paddingHorizontal: 4, paddingBottom: 4, paddingTop: 4 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  bgTexture: {
    ...StyleSheet.absoluteFillObject,
    width: "100%", height: "100%", opacity: 0.09,
  },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 20 },
  profileCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(28,14,70,0.88)", borderRadius: 18,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.11)", gap: 12,
    elevation: 8,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    overflow: "hidden", backgroundColor: Colors.primaryDark,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  avatarImg: { width: 52, height: 52 },
  profileEditBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(108,158,255,0.15)", borderWidth: 1,
    borderColor: "rgba(108,158,255,0.3)", alignItems: "center", justifyContent: "center",
  },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textPrimary },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  premiumBadge: {
    backgroundColor: "rgba(108,158,255,0.2)", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(108,158,255,0.4)",
  },
  premiumText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.primary },
  statsRow: {
    flexDirection: "row", backgroundColor: "rgba(28,14,70,0.88)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.11)", marginBottom: 24, paddingVertical: 16,
    elevation: 8,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  statLabel: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  statDivider: { width: 1, backgroundColor: Colors.divider, marginVertical: 4 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, marginLeft: 4,
  },
  settingsGroup: {
    backgroundColor: "rgba(28,14,70,0.88)", borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)", marginBottom: 20, overflow: "hidden",
    elevation: 8,
  },
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  settingRowPressed: { backgroundColor: "rgba(255,255,255,0.04)" },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(108,158,255,0.12)", alignItems: "center", justifyContent: "center",
  },
  settingInfo: { flex: 1, gap: 2 },
  settingLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textPrimary },
  settingSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  settingValue: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  rowDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: 64 },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(255,107,138,0.1)", borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: "rgba(255,107,138,0.25)", marginBottom: 16,
  },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.negative },
  version: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted,
    textAlign: "center", paddingBottom: 8,
  },
  achBadge: {
    backgroundColor: "rgba(74,222,170,0.12)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(74,222,170,0.25)",
  },
  achBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.positive, letterSpacing: 1 },
});

const piModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1C1048", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: "92%",
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4,
  },
  input: {
    fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.divider, marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 12 },
  newsletterRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14,
    borderWidth: 1, borderColor: Colors.divider, padding: 14, marginBottom: 20,
  },
  newsletterCheck: { paddingTop: 1 },
  checkFilled: {
    width: 22, height: 22, borderRadius: 6, backgroundColor: Colors.primaryDark,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.primary,
  },
  checkEmpty: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.textMuted, backgroundColor: "transparent" },
  newsletterInfo: { flex: 1, gap: 3 },
  newsletterLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textPrimary },
  newsletterSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.primaryDark, borderRadius: 14, paddingVertical: 16, marginBottom: 8,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});
