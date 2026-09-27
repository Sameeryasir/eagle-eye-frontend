import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Logo from "../assets/Logo.svg";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Brand } from "../constants/brandColors";
import { useResponsiveLayout } from "../constants/responsiveLayout";
import {
  getOnboardingSession,
  routeForOnboardingStep,
  OnboardingSteps,
} from "../services/onboarding/onboardingSession";

const SignIn = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const layout = useResponsiveLayout();
  const { isAuthenticated, isLoading } = useAuth();
  const [checkingSession, setCheckingSession] = React.useState(true);

  const {
    width,
    height,
    contentWidth,
    horizontalPad,
    isCompactHeight,
    isSmallPhone,
    rs,
    buttonPadY,
    buttonTextSize,
    radius,
  } = layout;

  const logoSize = Math.min(rs(96), width * (isSmallPhone ? 0.22 : 0.24));

  React.useEffect(() => {
    let active = true;

    const boot = async () => {
      if (isLoading) return;

      if (isAuthenticated) {
        navigation.replace("HomeScreen");
        return;
      }

      if (route.params?.skipResume) {
        if (active) setCheckingSession(false);
        return;
      }

      const session = await getOnboardingSession();
      if (!active) return;

      if (session?.step) {
        const next = routeForOnboardingStep(session.step);
        if (next === "OtpScreen" && session.email) {
          navigation.replace("OtpScreen", {
            emailOrPhone: session.email,
            fromRegister: true,
          });
          return;
        }
        if (next === "RegisterCompany" || next === "Register") {
          navigation.replace(next);
          return;
        }
      }

      setCheckingSession(false);
    };

    boot();
    return () => {
      active = false;
    };
  }, [isLoading, isAuthenticated, navigation, route.params?.skipResume]);

  const startSignUp = async () => {
    const session = await getOnboardingSession();
    if (session?.step === OnboardingSteps.OTP && session.email) {
      navigation.navigate("OtpScreen", {
        emailOrPhone: session.email,
        fromRegister: true,
      });
      return;
    }
    if (session?.step === OnboardingSteps.COMPANY) {
      navigation.navigate("RegisterCompany");
      return;
    }
    navigation.navigate("Register");
  };

  if (isLoading || checkingSession) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Brand.paper,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
        <ActivityIndicator size="large" color={Brand.ink} />
      </View>
    );
  }

  const brandBlock = (
    <View
      style={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: isCompactHeight ? rs(16) : height * 0.04,
        minHeight: isCompactHeight ? undefined : height * 0.35,
      }}
    >
      <Logo width={logoSize} height={logoSize} />

      <Text
        style={{
          marginTop: rs(24),
          fontSize: Math.min(rs(36), width * 0.09),
          fontWeight: "700",
          color: Brand.ink,
          letterSpacing: 1.2,
          textAlign: "center",
        }}
      >
        EAGLE EYE
      </Text>

      <View
        style={{
          width: rs(36),
          height: 2,
          backgroundColor: Brand.ink,
          marginTop: rs(14),
          marginBottom: rs(14),
          opacity: 0.85,
        }}
      />

      <Text
        style={{
          fontSize: rs(isSmallPhone ? 13.5 : 15),
          color: Brand.inkMuted,
          textAlign: "center",
          lineHeight: rs(22),
          letterSpacing: 0.2,
          maxWidth: Math.min(contentWidth, 300),
          paddingHorizontal: 4,
        }}
      >
        Field operations for contractors — crews, jobs, and progress in one
        place.
      </Text>
    </View>
  );

  const actions = (
    <View
      style={{
        paddingBottom: Math.max(layout.insets.bottom, rs(20)),
        paddingTop: rs(8),
      }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={{
          width: "100%",
          backgroundColor: Brand.ink,
          paddingVertical: buttonPadY + 1,
          borderRadius: radius,
          alignItems: "center",
          minHeight: rs(50),
          justifyContent: "center",
        }}
        onPress={() => navigation.navigate("LogIn")}
      >
        <Text
          style={{
            color: Brand.onInk,
            fontSize: buttonTextSize,
            fontWeight: "600",
            letterSpacing: 0.4,
          }}
        >
          Log in
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        style={{
          width: "100%",
          marginTop: rs(12),
          backgroundColor: Brand.paper,
          paddingVertical: buttonPadY,
          borderRadius: radius,
          alignItems: "center",
          borderWidth: 1,
          borderColor: Brand.ink,
          minHeight: rs(50),
          justifyContent: "center",
        }}
        onPress={startSignUp}
      >
        <Text
          style={{
            color: Brand.ink,
            fontSize: buttonTextSize,
            fontWeight: "600",
            letterSpacing: 0.3,
          }}
        >
          Sign up
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          marginTop: rs(18),
          textAlign: "center",
          color: Brand.inkFaint,
          fontSize: rs(12),
          lineHeight: rs(17),
          letterSpacing: 0.15,
          paddingHorizontal: 8,
        }}
      >
        Secure email verification · Built for contractors
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Brand.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
      <SafeAreaView style={{ flex: 1 }}>
        {isCompactHeight ? (
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: horizontalPad,
              justifyContent: "space-between",
            }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={{ width: contentWidth, alignSelf: "center", flexGrow: 1 }}>
              {brandBlock}
              {actions}
            </View>
          </ScrollView>
        ) : (
          <View
            style={{
              flex: 1,
              width: contentWidth,
              alignSelf: "center",
              paddingHorizontal: 8,
              justifyContent: "space-between",
            }}
          >
            {brandBlock}
            {actions}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default SignIn;
