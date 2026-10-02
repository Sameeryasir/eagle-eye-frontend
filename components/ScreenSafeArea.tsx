import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Array<"top" | "right" | "bottom" | "left">;
};

export default function ScreenSafeArea({
  children,
  style,
  edges = ["top", "left", "right", "bottom"],
}: Props) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
