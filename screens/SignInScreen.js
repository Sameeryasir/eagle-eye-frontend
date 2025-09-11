import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
  StatusBar,
} from "react-native";

import Logo from "../assets/Logo.svg"; // Import the SVG logo
import { useNavigation } from "@react-navigation/native";

const SignIn = () => {
  const navigation = useNavigation(); // Get navigation object

  // --- Removed duplicate authentication check ---
  // AuthContext already handles authentication, no need to check here

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-6 ">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Sharp image at the top */}
      <Logo width={90} height={90} />

      {/* Add spacing between logo and button */}
      <View className="h-20" />
    
      <TouchableOpacity
        className="w-full bg-[#222] py-4 rounded-xl mb-4 items-center"
        onPress={() => navigation.navigate("LogIn")} // Navigate to Login screen
      >
        <Text className="text-white text-[18px] font-semibold">Login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SignIn;
