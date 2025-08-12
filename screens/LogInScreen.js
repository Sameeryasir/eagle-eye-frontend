import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { sendOtp } from "../services/auth/SendOtp";
import Logo from "../assets/Logo.svg"; // Import the SVG logo

const LogIn = () => {
  const navigation = useNavigation();
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await sendOtp(input.trim());
      setLoading(false);
      navigation.navigate("OtpScreen", { emailOrPhone: input.trim() });
      setInput(""); // Clear the input after successful navigation
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to send OTP");
    }
  };

  const isDisabled = loading || !input.trim();

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-6 -mt-[110px]">
      <Logo width={90} height={90} />

      <Text className="text-[28px] font-bold text-center mb-3 text-[#222]">Login</Text>
      <Text className="text-sm text-[#888] text-center mb-8 leading-5">
        Enter your email or phone number to continue.
      </Text>
      <TextInput
        className="w-full h-12 border border-[#E5E5E5] rounded-xl px-4 text-base mb-6 bg-[#F9F9F9]"
        placeholder="Email or Phone Number"
        value={input}
        onChangeText={setInput}
        keyboardType="default"
        autoCapitalize="none"
      />
      <TouchableOpacity
        className={`w-full ${isDisabled ? "bg-[#ccc]" : "bg-[#222]"} py-4 rounded-xl items-center`}
        onPress={handleContinue}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-lg font-semibold">Continue</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default LogIn;
