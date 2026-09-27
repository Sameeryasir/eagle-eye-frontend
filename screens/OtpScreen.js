import React from "react";
import { Keyboard, Text, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { verifyOtp } from "../services/auth/VerifyOtp";
import { sendOtp } from "../services/auth/SendOtp";
import { useAuth } from "../context/AuthContext";
import { Brand } from "../constants/brandColors";
import {
  OnboardingLayout,
  OnboardingField,
} from "../components/onboarding/OnboardingLayout";
import {
  AuthScreenShell,
  AuthField,
  AuthPrimaryButton,
} from "../components/auth/AuthScreenShell";
import {
  clearOnboardingSession,
  saveOnboardingSession,
  OnboardingSteps,
} from "../services/onboarding/onboardingSession";

const Code = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { login } = useAuth();
  const emailOrPhone = route.params?.emailOrPhone || "";
  const fromRegister = route.params?.fromRegister === true;
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    if (fromRegister && emailOrPhone) {
      saveOnboardingSession({
        step: OnboardingSteps.OTP,
        email: emailOrPhone,
      });
    }
  }, [fromRegister, emailOrPhone]);

  const handleContinue = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      const data = await verifyOtp(emailOrPhone, code.trim());
      await login(data);
      await clearOnboardingSession();
      setCode("");

      Toast.show({
        type: "success",
        text1: fromRegister ? "Welcome aboard" : "You're logged in",
        text2: fromRegister
          ? "Your company is ready. Add crew from Crew in the menu."
          : "Welcome back to Eagle Eye",
        visibilityTime: 3000,
        topOffset: 80,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: "HomeScreen" }],
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Verification failed",
        text2: error?.message || "Please check your code and try again",
        visibilityTime: 4000,
        topOffset: 80,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!emailOrPhone || resending) return;
    setResending(true);
    try {
      await sendOtp(emailOrPhone);
      Toast.show({
        type: "success",
        text1: "Code sent",
        text2: "Check your email for a new code",
        topOffset: 80,
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not resend",
        text2: error?.message || "Try again shortly",
        topOffset: 80,
      });
    } finally {
      setResending(false);
    }
  };

  if (fromRegister) {
    return (
      <OnboardingLayout
        step={2}
        totalSteps={2}
        title="Verify email"
        subtitle="Enter the code we sent to confirm your account and company."
        onBack={() => navigation.navigate("SignIn", { skipResume: true })}
        primaryLabel="Verify & continue"
        onPrimary={handleContinue}
        primaryDisabled={!code.trim()}
        primaryLoading={loading}
        secondary={
          <TouchableOpacity
            onPress={handleResend}
            style={{ marginTop: 18, alignItems: "center" }}
            disabled={resending}
          >
            <Text style={{ color: Brand.inkMuted, fontSize: 14 }}>
              {resending ? "Sending…" : "Resend code"}
            </Text>
          </TouchableOpacity>
        }
      >
        {!!emailOrPhone && (
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: Brand.ink,
              marginBottom: 20,
              marginTop: -12,
            }}
          >
            {emailOrPhone}
          </Text>
        )}
        <OnboardingField
          label="Verification code"
          value={code}
          onChangeText={setCode}
          placeholder="6-digit code"
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          maxLength={8}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
      </OnboardingLayout>
    );
  }

  return (
    <AuthScreenShell
      title="Enter code"
      subtitle="Enter the one-time code sent to your work email."
      onBack={() => navigation.goBack()}
    >
      {!!emailOrPhone && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: Brand.ink,
            marginTop: -12,
            marginBottom: 20,
          }}
        >
          {emailOrPhone}
        </Text>
      )}

      <AuthField
        label="Verification code"
        value={code}
        onChangeText={setCode}
        placeholder="6-digit code"
        keyboardType="number-pad"
        returnKeyType="done"
        onSubmitEditing={handleContinue}
        maxLength={8}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />

      <AuthPrimaryButton
        label="Verify & continue"
        onPress={handleContinue}
        disabled={!code.trim()}
        loading={loading}
      />
    </AuthScreenShell>
  );
};

export default Code;
