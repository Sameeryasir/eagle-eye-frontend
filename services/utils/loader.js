import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

// --- Change Summary (2025-01-XX) ---
// What: Removed mt-[100px] margin-top from inner View to properly center the loader
// Why: The margin-top was pushing the loader down below center, making it appear below the bottom nav
// Dependencies: Used by HomeScreen and other screens that display loading states
// MCP Context: Implemented in line with MCP context 7 for clarity and simple maintainability.
const Loader = ({ size = 'large', color = "#000000", text = "Loading..." }) => {
  return (
    <View className="flex-1 justify-center items-center absolute top-0 left-0 right-0 bottom-0 bg-white/90">
      {/* --- Loader Content Container (MCP Context 7) --- */}
      {/* Why: Removed mt-[100px] to allow proper centering - the outer View's justify-center handles vertical centering */}
      <View className="items-center">
        <ActivityIndicator 
          size={size} 
          color={color} 
        />
        <Text className="mt-4 text-base text-black font-medium">{text}</Text>
      </View>
    </View>
  );
};

export default Loader;
