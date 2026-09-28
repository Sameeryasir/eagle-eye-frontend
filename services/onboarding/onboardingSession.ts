import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'eagleEye.onboardingSession';

export const OnboardingSteps = {
  USER: 'user',
  COMPANY: 'company',
  OTP: 'otp',
};

export async function getOnboardingSession() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveOnboardingSession(partial) {
  const current = (await getOnboardingSession()) || {};
  const next = {
    ...current,
    ...partial,
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearOnboardingSession() {
  await AsyncStorage.removeItem(KEY);
}

export function routeForOnboardingStep(step) {
  switch (step) {
    case OnboardingSteps.COMPANY:
      return 'RegisterCompany';
    case OnboardingSteps.OTP:
      return 'OtpScreen';
    case OnboardingSteps.USER:
    default:
      return 'Register';
  }
}
