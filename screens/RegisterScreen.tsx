// @ts-nocheck
import React from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  OnboardingLayout,
  OnboardingField,
  OnboardingFieldRow,
  OnboardingPhoneField,
  ProfileIdCardArt,
} from "../components/onboarding/OnboardingLayout";
import {
  OnboardingSteps,
  getOnboardingSession,
  saveOnboardingSession,
} from "../services/onboarding/onboardingSession";
import { useResponsiveLayout } from "../constants/responsiveLayout";
import {
  DEFAULT_PHONE_COUNTRY,
  findCountryByIso,
  buildFullPhone,
} from "../constants/countryDialCodes";

function formatNationalPhone(digits, countryIso) {
  const d = String(digits || "").replace(/\D/g, "").slice(0, 15);
  if (countryIso === "US" || countryIso === "CA") {
    const us = d.slice(0, 10);
    if (us.length <= 3) return us;
    if (us.length <= 6) return `(${us.slice(0, 3)}) ${us.slice(3)}`;
    return `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}`;
  }
  return d;
}

const RegisterScreen = () => {
  const navigation = useNavigation();
  const layout = useResponsiveLayout();
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [phoneCountry, setPhoneCountry] = React.useState(DEFAULT_PHONE_COUNTRY);

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
          phone: session.phoneNational || session.phone || "",
        });
        if (session.phoneCountryIso) {
          setPhoneCountry(findCountryByIso(session.phoneCountryIso));
        }
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

  const nationalDigits = String(form.phone || "").replace(/\D/g, "");
  const fullPhone = buildFullPhone(phoneCountry.dial, nationalDigits);

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
        phone: fullPhone,
        phoneNational: nationalDigits,
        phoneCountryIso: phoneCountry.iso,
        phoneDialCode: phoneCountry.dial,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [form, phoneCountry, fullPhone, nationalDigits]);

  const handleContinue = async () => {
    if (!isValid) return;
    await saveOnboardingSession({
      step: OnboardingSteps.COMPANY,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: fullPhone,
      phoneNational: nationalDigits,
      phoneCountryIso: phoneCountry.iso,
      phoneDialCode: phoneCountry.dial,
    });
    navigation.navigate("RegisterCompany");
  };

  return (
    <OnboardingLayout
      step={1}
      totalSteps={2}
      title="Your details"
      subtitle="Create your personal account first. Next you’ll add your contracting company."
      showBack
      onBack={() => navigation.navigate("SignIn")}
      showStepCaption={false}
      headerAside={<ProfileIdCardArt size={layout.rs(92)} />}
      primaryLabel="Continue"
      showPrimaryArrow
      onPrimary={handleContinue}
      primaryDisabled={!isValid}
    >
      <OnboardingFieldRow>
        <OnboardingField
          label="First name"
          required
          leftIcon="person-outline"
          value={form.firstName}
          onChangeText={(v) => setField("firstName", v)}
          placeholder="First name"
          autoCapitalize="words"
        />
        <OnboardingField
          label="Last name"
          required
          leftIcon="person-outline"
          value={form.lastName}
          onChangeText={(v) => setField("lastName", v)}
          placeholder="Last name"
          autoCapitalize="words"
        />
      </OnboardingFieldRow>
      <OnboardingField
        label="Work email"
        required
        leftIcon="mail-outline"
        value={form.email}
        onChangeText={(v) => setField("email", v)}
        placeholder="you@company.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <OnboardingPhoneField
        country={phoneCountry}
        onCountryChange={setPhoneCountry}
        value={formatNationalPhone(form.phone, phoneCountry.iso)}
        onChangeText={(v) =>
          setField(
            "phone",
            v.replace(/\D/g, "").slice(0, phoneCountry.iso === "US" || phoneCountry.iso === "CA" ? 10 : 15)
          )
        }
        placeholder={
          phoneCountry.iso === "US" || phoneCountry.iso === "CA"
            ? "(201) 555-0123"
            : "Phone number"
        }
      />
    </OnboardingLayout>
  );
};

export default RegisterScreen;
