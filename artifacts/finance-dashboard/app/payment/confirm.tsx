import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const { width, height } = Dimensions.get("window");

const CONFETTI_COLORS = [
  "#FFD700", "#FF6B9D", "#6C9EFF", "#4ADEAA",
  "#FF8C42", "#B57BFF", "#FF4757", "#00D2FF",
  "#F9CA24", "#6AB04C", "#E056FD", "#22A6B3",
];

type ConfettiPiece = {
  x: number;
  color: string;
  size: { w: number; h: number };
  delay: number;
  duration: number;
  driftX: number;
  isCircle: boolean;
};

const PIECES: ConfettiPiece[] = Array.from({ length: 70 }, (_, i) => ({
  x: Math.random() * width,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: { w: 7 + Math.random() * 9, h: 5 + Math.random() * 7 },
  delay: Math.random() * 1200,
  duration: 2600 + Math.random() * 2000,
  driftX: (Math.random() - 0.5) * 120,
  isCircle: Math.random() > 0.6,
}));

function ConfettiParticle({ piece, index }: { piece: ConfettiPiece; index: number }) {
  const translateY = useRef(new Animated.Value(-30)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = piece.delay;
    const dur = piece.duration;

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: height + 60,
          duration: dur,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: piece.driftX,
          duration: dur,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 8),
          duration: dur,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: dur * 0.4,
            delay: dur * 0.55,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const rotateStr = rotate.interpolate({
    inputRange: [-8, 8],
    outputRange: ["-480deg", "480deg"],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: piece.x,
          backgroundColor: piece.color,
          width: piece.size.w,
          height: piece.isCircle ? piece.size.w : piece.size.h,
          borderRadius: piece.isCircle ? piece.size.w / 2 : 2,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate: rotateStr }],
        },
      ]}
    />
  );
}

export default function ConfirmScreen() {
  const { confirmationNumber } = useLocalSearchParams<{ confirmationNumber: string }>();
  const insets = useSafeAreaInsets();
  const checkScale = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Check animation
    Animated.spring(checkScale, {
      toValue: 1,
      delay: 400,
      useNativeDriver: true,
      tension: 60,
      friction: 7,
    }).start();

    // Text fade in
    Animated.parallel([
      Animated.timing(textFade, {
        toValue: 1,
        duration: 600,
        delay: 800,
        useNativeDriver: true,
      }),
      Animated.spring(textSlide, {
        toValue: 0,
        delay: 800,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      {/* Confetti */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" } as any]}>
        {PIECES.map((piece, i) => (
          <ConfettiParticle key={i} piece={piece} index={i} />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
          <Feather name="check" size={48} color="#fff" />
        </Animated.View>

        <Animated.View
          style={[styles.textBlock, { opacity: textFade, transform: [{ translateY: textSlide }] }]}
        >
          <Text style={styles.congrats}>Congratulations!</Text>
          <Text style={styles.subTitle}>Your payment is being processed</Text>

          <View style={styles.confirmBox}>
            <Text style={styles.confirmLabel}>Confirmation Number</Text>
            <Text style={styles.confirmNumber}>{confirmationNumber}</Text>
          </View>

          <View style={styles.thankRow}>
            <Feather name="heart" size={16} color={Colors.positive} />
            <Text style={styles.thankText}>Thank you for being responsible!</Text>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Feather name="clock" size={14} color={Colors.textMuted} />
              <Text style={styles.detailText}>Processing: 1–2 business days</Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="check-circle" size={14} color={Colors.positive} />
              <Text style={styles.detailText}>Companies receive in 2–4 business days</Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="mail" size={14} color={Colors.primary} />
              <Text style={styles.detailText}>Confirmation sent to your email</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Done button */}
      <Animated.View style={[styles.footerBtn, { opacity: textFade, paddingBottom: insets.bottom > 0 ? 0 : 16 }]}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.replace("/(tabs)/pay");
          }}
          style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0A2E",
    alignItems: "center",
    justifyContent: "center",
  },
  confettiPiece: {
    position: "absolute",
    top: 0,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  textBlock: {
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  congrats: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subTitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmBox: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: "center",
    width: "100%",
    gap: 6,
  },
  confirmLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  confirmNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.primary,
    letterSpacing: 2,
  },
  thankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  thankText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.positive,
  },
  detailsCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    flex: 1,
  },
  footerBtn: {
    paddingHorizontal: 32,
    width: "100%",
    paddingTop: 8,
  },
  doneBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
  },
  doneBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
});
