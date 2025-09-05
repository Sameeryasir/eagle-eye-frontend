import React, { useEffect } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from 'react-native-toast-message';

const SignIn = () => {
  const navigation = useNavigation(); // Get navigation object

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if token and user role exist
      const token = await AsyncStorage.getItem('token');
      const userRole = await AsyncStorage.getItem('userRole');

      if (token && userRole === 'Owner') {
        // User is authenticated and has Owner role, navigate to HomeScreen
        // --- Show Welcome Back Toast Message ---
        Toast.show({
          type: 'success',
          text1: 'Welcome Back!',
          text2: 'You are already logged in',
          visibilityTime: 2000,
          autoHide: true,
          topOffset: 80,
        });
        navigation.replace("HomeScreen");
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // --- Show Error Toast Message ---
      Toast.show({
        type: 'error',
        text1: 'Authentication Error',
        text2: 'Please login again',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

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
