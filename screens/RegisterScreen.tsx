// @ts-nocheck
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  OnboardingLayout,
  OnboardingField,
  OnboardingFieldRow,
} from "../components/onboarding/OnboardingLayout";
import {
  OnboardingSteps,
  getOnboardingSession,
  saveOnboardingSession,
  clearOnboardingSession,
} from "../services/onboarding/onboardingSession";
import { Brand } from "../constants/brandColors";

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const session = await getOnboardingSession();
        if (!active || !session) return;
        setForm({
          firstName: session.firstName || "",
          lastName: session.lastName || "",
          email: session.email || "",
          phone: session.phone || "",
        });
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const isValid =
    form.firstName.trim().length >= 2 &&
    form.lastName.trim().length >= 2 &&
    emailOk;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (
        form.firstName.trim().length < 2 &&
        form.lastName.trim().length < 2 &&
        !form.email.trim()
      ) {
        return;
      }
      saveOnboardingSession({
        step: OnboardingSteps.USER,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || "",
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [form]);

  const handleContinue = async () => {
    if (!isValid) return;
    await saveOnboardingSession({
      step: OnboardingSteps.COMPANY,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || "",
    });
    navigation.navigate("RegisterCompany");
  };

  const handleStartOver = async () => {
    await clearOnboardingSession();
    setForm({ firstName: "", lastName: "", email: "", phone: "" });
  };

  return (
    <OnboardingLayout
      step={1}
      totalSteps={2}
      title="Your details"
      subtitle="Create your personal account first. Next you’ll add your contracting company."
      onBack={() =>
        navigation.navigate("SignIn", { skipResume: true })
      }
      primaryLabel="Continue"
      onPrimary={handleContinue}
      primaryDisabled={!isValid}
      secondary={
        <TouchableOpacity
          onPress={handleStartOver}
          style={{ marginTop: 18, alignItems: "center" }}
        >
          <Text style={{ color: Brand.inkFaint, fontSize: 13 }}>
            Clear and start over
          </Text>
        </TouchableOpacity>
      }
    >
      <OnboardingFieldRow>
        <OnboardingField
          label="First name"
          value={form.firstName}
          onChangeText={(v) => setField("firstName", v)}
          placeholder="First"
          autoCapitalize="words"
        />
        <OnboardingField
          label="Last name"
          value={form.lastName}
          onChangeText={(v) => setField("lastName", v)}
          placeholder="Last"
          autoCapitalize="words"
        />
      </OnboardingFieldRow>
      <OnboardingField
        label="Work email"
        value={form.email}
        onChangeText={(v) => setField("email", v)}
        placeholder="you@company.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <OnboardingField
        label="Phone (optional)"
        value={form.phone}
        onChangeText={(v) => setField("phone", v.replace(/[^\d]/g, ""))}
        placeholder="Mobile number"
        keyboardType="phone-pad"
      />
    </OnboardingLayout>
  );
};

export default RegisterScreen;
