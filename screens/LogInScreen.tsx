// @ts-nocheck
import React from "react";
import { Keyboard } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { sendOtp } from "../services/auth/SendOtp";
import {
  AuthScreenShell,
  AuthField,
  AuthPrimaryButton,
  AuthFooterLink,
} from "../components/auth/AuthScreenShell";

const LogIn = () => {
  const navigation = useNavigation();
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleContinue = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      await sendOtp(input.trim());
      Toast.show({
        type: "success",
        text1: "Login code sent",
        text2: "Check your email for the verification code",
        visibilityTime: 3000,
        topOffset: 80,
      });
      navigation.navigate("OtpScreen", { emailOrPhone: input.trim() });
      setInput("");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Please check your email and try again";
      Toast.show({
        type: "error",
        text1: "Could not send code",
        text2: Array.isArray(message) ? message.join(", ") : String(message),
        visibilityTime: 4000,
        topOffset: 80,
      });
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !input.trim();

  return (
    <AuthScreenShell
      title="Log in"
      subtitle="Access your contractor workspace with a secure one-time code."
      onBack={() => navigation.goBack()}
      footer={
        <AuthFooterLink
          prompt="New company?"
          actionLabel="Sign up"
          onPress={() => navigation.navigate("Register")}
        />
      }
    >
      <AuthField
        label="Work email or phone"
        value={input}
        onChangeText={setInput}
        placeholder="name@company.com"
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="done"
        onSubmitEditing={handleContinue}
        autoComplete="email"
      />

      <AuthPrimaryButton
        label="Send login code"
        onPress={handleContinue}
        disabled={isDisabled}
        loading={loading}
      />
    </AuthScreenShell>
  );
};

export default LogIn;
