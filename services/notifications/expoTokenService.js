import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';

const pushSupportedInThisRuntime = () => {
  if (isRunningInExpoGo()) {
    return false;
  }
  return Device.isDevice;
};

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (error) {
  console.warn('Notification handler not available in this runtime:', error?.message);
}

export const requestNotificationPermissions = async () => {
  try {
    if (!pushSupportedInThisRuntime()) {
      console.log(
        'Skipping push permissions — Expo Go does not support remote push (use a dev build).',
      );
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

export const generateExpoPushToken = async () => {
  try {
    if (!pushSupportedInThisRuntime()) {
      return null;
    }

    const hasPermissions = await requestNotificationPermissions();
    if (!hasPermissions) {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      '965f7868-60cf-4aa7-ac08-a8e4125438de';

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoToken = tokenData.data;

    await AsyncStorage.setItem('expoPushToken', expoToken);
    return expoToken;
  } catch (error) {
    console.error('Error generating Expo push token:', error);
    return null;
  }
};

export const getStoredExpoToken = async () => {
  try {
    return await AsyncStorage.getItem('expoPushToken');
  } catch (error) {
    console.error('Error retrieving stored Expo token:', error);
    return null;
  }
};

export const clearExpoToken = async () => {
  try {
    await AsyncStorage.removeItem('expoPushToken');
  } catch (error) {
    console.error('Error clearing Expo token:', error);
  }
};

export const setupNotifications = async () => {
  try {
    if (!pushSupportedInThisRuntime()) {
      return {
        success: false,
        token: null,
        error: 'Remote push requires a development build (not available in Expo Go)',
      };
    }

    const hasPermissions = await requestNotificationPermissions();
    if (!hasPermissions) {
      return {
        success: false,
        token: null,
        error: 'Notification permissions denied',
      };
    }

    const token = await generateExpoPushToken();
    if (!token) {
      return {
        success: false,
        token: null,
        error: 'Failed to generate Expo push token',
      };
    }

    return { success: true, token };
  } catch (error) {
    console.error('Error in notification setup:', error);
    return {
      success: false,
      token: null,
      error: error.message || 'Unknown error during notification setup',
    };
  }
};
