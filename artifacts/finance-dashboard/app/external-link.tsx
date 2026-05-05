import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

export default function ExternalLinkScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const url = typeof params.url === "string" ? params.url : null;
  const title = typeof params.title === "string" ? params.title : "Web";

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>
      {url ? (
        <WebView
          source={{ uri: url }}
          startInLoadingState
          renderLoading={() => (
            <View style={s.loading}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          style={s.web}
        />
      ) : (
        <View style={s.loading}>
          <Text style={s.errorText}>No URL provided.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0A1E" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#0D0A1E",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#555" },
  web: { flex: 1, backgroundColor: "#fff" },
});
