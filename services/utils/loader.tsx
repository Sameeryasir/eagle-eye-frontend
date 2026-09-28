import React from 'react';
import { View, ActivityIndicator, Text, type ColorValue } from 'react-native';

type LoaderProps = {
  size?: 'small' | 'large' | number;
  color?: ColorValue;
  text?: string;
};

const Loader = ({
  size = 'large',
  color = '#000000',
  text = 'Loading...',
}: LoaderProps) => {
  return (
    <View className="flex-1 justify-center items-center absolute top-0 left-0 right-0 bottom-0 bg-white/90">
      <View className="items-center">
        <ActivityIndicator size={size} color={color} />
        <Text className="mt-4 text-base text-black font-medium">{text}</Text>
      </View>
    </View>
  );
};

export default Loader;
