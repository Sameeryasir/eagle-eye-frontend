import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Brand } from "../constants/brandColors";

const Header = ({
  title = "Projects",
  onMenuPress,
  onRightPress,
  rightIcon = "person",
  leftIconName = "menu",
  showMenu = true,
  showRight = true,
  backgroundColor = Brand.paper,
  textColor = Brand.ink,
  iconColor = Brand.ink,
}) => {
  return (
    <View style={[styles.row, { backgroundColor }]}>
      {showMenu ? (
        <Pressable
          onPress={onMenuPress}
          disabled={!onMenuPress}
          hitSlop={12}
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && onMenuPress ? styles.iconBtnPressed : null,
          ]}
        >
          <Ionicons name={leftIconName} size={24} color={iconColor} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
        {title}
      </Text>

      {showRight ? (
        <Pressable
          onPress={onRightPress}
          disabled={!onRightPress}
          hitSlop={12}
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && onRightPress ? styles.iconBtnPressed : null,
          ]}
        >
          <Ionicons name={rightIcon} size={24} color={iconColor} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnPressed: {
    backgroundColor: Brand.paperSoft,
  },
  spacer: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginHorizontal: 8,
  },
});

export default Header;
