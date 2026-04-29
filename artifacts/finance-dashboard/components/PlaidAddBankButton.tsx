import React from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export function PlaidAddBankButton({ style }: { style?: any }) {
  return (
    <Pressable
      onPress={() => Alert.alert("Not Available", "Bank linking is only available on the web version of CardFlow.")}
      style={({ pressed }) => [s.addBtn, style, pressed && { opacity: 0.75 }]}
    >
      <Feather name="plus" size={15} color={Colors.primary} />
      <Text style={s.addBtnText}>＋ Add Another Bank Account</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: `${Colors.primary}50`,
    paddingVertical: 13, paddingHorizontal: 16, marginTop: 4,
    backgroundColor: "rgba(108,158,255,0.07)",
  },
  addBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
});
