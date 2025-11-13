import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Header = ({
  title = "Projects",
  onMenuPress,
  onRightPress,
  rightIcon = "person",
  leftIconName = "menu",
  showMenu = true,
  showRight = true,
  backgroundColor = "white",
  textColor = "#333",
  iconColor = "#333",
}) => {
  return (
    <View
      className="flex-row items-center justify-between px-5 py-5 pt-2.5 border-b border-[#f0f0f0]"
      style={{ backgroundColor }}
    >
      {showMenu ? (
        <TouchableOpacity className="p-2 rounded-lg" onPress={onMenuPress}>
          <Ionicons name={leftIconName} size={24} color={iconColor} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}

      <Text
        className="text-[28px] font-bold tracking-[0.5px]"
        style={{
          color: textColor,
          fontSize: 20,
        }}
      >
        {title}
      </Text>

      {showRight ? (
        <TouchableOpacity className="p-2 rounded-lg" onPress={onRightPress}>
          <Ionicons name={rightIcon} size={24} color={iconColor} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
};

export default Header;
