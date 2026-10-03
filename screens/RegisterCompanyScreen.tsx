// @ts-nocheck
import React from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import {
  OnboardingLayout,
  OnboardingField,
  OnboardingFieldRow,
  OnboardingCountryField,
  CompanyBuildingArt,
} from "../components/onboarding/OnboardingLayout";
import { registerCompany } from "../services/auth/Register";
import {
  OnboardingSteps,
  getOnboardingSession,
  saveOnboardingSession,
} from "../services/onboarding/onboardingSession";
import { useResponsiveLayout } from "../constants/responsiveLayout";

const emptyCompanyForm = {
  companyName: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "USA",
  companyPhone: "",
  companyEmail: "",
  website: "",
  trade: "",
  licenseNumber: "",
};

const RegisterCompanyScreen = () => {
  const navigation = useNavigation();
  const layout = useResponsiveLayout();
  const [loading, setLoading] = React.useState(false);
  const [userDraft, setUserDraft] = React.useState(null);
  const [form, setForm] = React.useState(emptyCompanyForm);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const session = await getOnboardingSession();
        if (!active) return;
        if (!session?.firstName || !session?.email) {
          navigation.replace("Register");
          return;
        }
        if (session.step === OnboardingSteps.OTP && session.email) {
          navigation.replace("OtpScreen", {
            emailOrPhone: session.email,
            fromRegister: true,
          });
          return;
        }
        setUserDraft(session);
        setForm({
          companyName: session.companyName || "",
          address: session.address || "",
          city: session.city || "",
          state: session.state || "",
          postalCode: session.postalCode || "",
          country: session.country || "USA",
          companyPhone: session.companyPhone || "",
          companyEmail: session.companyEmail || "",
          website: session.website || "",
          trade: session.trade || "",
          licenseNumber: session.licenseNumber || "",
        });
      })();
      return () => {
        active = false;
      };
    }, [navigation])
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isValid = form.companyName.trim().length >= 2;

  const companyPayload = () => ({
    companyName: form.companyName.trim(),
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    postalCode: form.postalCode.trim() || undefined,
    country: form.country.trim() || "USA",
    companyPhone: form.companyPhone.trim() || undefined,
    companyEmail: form.companyEmail.trim().toLowerCase() || undefined,
    website: form.website.trim() || undefined,
    trade: form.trade.trim() || undefined,
    licenseNumber: form.licenseNumber.trim() || undefined,
  });

  const handleContinue = async () => {
    if (!isValid || !userDraft || loading) return;
    setLoading(true);
    try {
      const company = companyPayload();
      await saveOnboardingSession({
        step: OnboardingSteps.COMPANY,
        ...company,
      });

      const data = await registerCompany({
        ...company,
        firstName: userDraft.firstName,
        lastName: userDraft.lastName,
        email: userDraft.email,
        phone: userDraft.phone || undefined,
      });

      await saveOnboardingSession({
        step: OnboardingSteps.OTP,
        ...company,
      });

      Toast.show({
        type: "success",
        text1: "Company created",
        text2: data?.message || "Check your email for the verification code",
        visibilityTime: 3500,
        topOffset: 80,
      });

      navigation.navigate("OtpScreen", {
        emailOrPhone: userDraft.email,
        fromRegister: true,
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Could not create your company account";
      Toast.show({
        type: "error",
        text1: "Sign up failed",
        text2: Array.isArray(message) ? message.join(", ") : String(message),
        visibilityTime: 4500,
        topOffset: 80,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      step={2}
      totalSteps={2}
      title="Company details"
      subtitle={
        userDraft?.firstName
          ? `Welcome, ${userDraft.firstName}. Add your contracting company profile.`
          : "Add your contracting company profile."
      }
      onBack={() => navigation.goBack()}
      showBack
      showStepCaption
      headerAside={<CompanyBuildingArt size={layout.rs(92)} />}
      primaryLabel="Create company"
      showPrimaryArrow
      onPrimary={handleContinue}
      primaryDisabled={!isValid}
      primaryLoading={loading}
    >
      <OnboardingField
        label="Company name"
        leftIcon="business-outline"
        iconBoxed
        value={form.companyName}
        onChangeText={(v) => setField("companyName", v)}
        placeholder="Summit Builders LLC"
        autoCapitalize="words"
      />
      <OnboardingField
        label="Street address (optional)"
        leftIcon="location-outline"
        iconBoxed
        value={form.address}
        onChangeText={(v) => setField("address", v)}
        placeholder="123 Main Street"
      />
      <OnboardingFieldRow>
        <OnboardingField
          label="City"
          leftIcon="business-outline"
          iconBoxed
          value={form.city}
          onChangeText={(v) => setField("city", v)}
          placeholder="City"
        />
        <OnboardingField
          label="State"
          leftIcon="map-outline"
          iconBoxed
          value={form.state}
          onChangeText={(v) => setField("state", v)}
          placeholder="State"
        />
      </OnboardingFieldRow>
      <OnboardingFieldRow>
        <OnboardingField
          label="ZIP / postal"
          leftIcon="cube-outline"
          iconBoxed
          value={form.postalCode}
          onChangeText={(v) => setField("postalCode", v)}
          placeholder="ZIP"
          autoCapitalize="characters"
        />
        <OnboardingCountryField
          label="Country"
          value={form.country}
          onChange={(code) => setField("country", code)}
        />
      </OnboardingFieldRow>
      <OnboardingField
        label="Company phone (optional)"
        leftIcon="call-outline"
        iconBoxed
        value={form.companyPhone}
        onChangeText={(v) => setField("companyPhone", v.replace(/[^\d]/g, ""))}
        placeholder="Office phone"
        keyboardType="phone-pad"
      />
      <OnboardingField
        label="Company email (optional)"
        leftIcon="mail-outline"
        iconBoxed
        value={form.companyEmail}
        onChangeText={(v) => setField("companyEmail", v)}
        placeholder="Office email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
    </OnboardingLayout>
  );
};

export default RegisterCompanyScreen;
