import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";

export type PlaidLinkSuccess = {
  publicToken: string;
  institutionName: string | null;
};

type Props = {
  visible: boolean;
  linkToken: string | null;
  onSuccess: (result: PlaidLinkSuccess) => void;
  onClose: () => void;
};

export function PlaidLinkModal({ visible, linkToken, onSuccess, onClose }: Props) {
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: { type?: string; public_token?: string; metadata?: { institution?: { name?: string } } };
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === "success" && msg.public_token) {
        onSuccess({
          publicToken: msg.public_token,
          institutionName: msg.metadata?.institution?.name ?? null,
        });
        onClose();
      } else if (msg.type === "exit") {
        onClose();
      }
    },
    [onSuccess, onClose],
  );

  const url = linkToken
    ? apiUrl(`/api/plaid/link?token=${encodeURIComponent(linkToken)}`)
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Link account</Text>
        <View style={{ width: 22 }} />
      </View>
      {url ? (
        <WebView
          source={{ uri: url }}
          onMessage={handleMessage}
          startInLoadingState
          renderLoading={() => (
            <View style={s.loading}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          style={s.web}
        />
      ) : (
        <View style={s.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#fff",
  },
  closeBtn: { padding: 4 },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  web: { flex: 1, backgroundColor: "#fff" },
});
