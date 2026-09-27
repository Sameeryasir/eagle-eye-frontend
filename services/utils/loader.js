import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

const Loader = ({ size = 'large', color = "#000000", text = "Loading..." }) => {
  return (
    <View className="flex-1 justify-center items-center absolute top-0 left-0 right-0 bottom-0 bg-white/90">
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
