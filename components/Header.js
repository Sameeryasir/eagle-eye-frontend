import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Header = ({ 
  title = "Projects", 
  onMenuPress, 
  onRightPress,
  rightIcon = "person",
  showMenu = true,
  showRight = true,
  backgroundColor = "white",
  textColor = "#333",
  iconColor = "#333"
}) => {
  return (
    <View 
      className="flex-row items-center justify-between px-5 py-5 pt-2.5 border-b border-[#f0f0f0]"
      style={{ backgroundColor }}
    >
      {/* Menu Button */}
      {showMenu && (
        <TouchableOpacity
          className="p-2 rounded-lg"
          onPress={onMenuPress}
        >
          <Ionicons name="menu" size={24} color={iconColor} />
        </TouchableOpacity>
      )}

      {/* Title */}
      <Text 
        className="text-[20px] font-bold tracking-[0.5px]"
        style={{ color: textColor }}
      >
        {title}
      </Text>

      {/* Right Icon */}
      {showRight && (
        <TouchableOpacity 
          className="p-2 rounded-lg"
          onPress={onRightPress}
        >
          <Ionicons name={rightIcon} size={24} color={iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default Header;
