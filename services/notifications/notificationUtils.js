import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredExpoToken } from './expoTokenService';

export const getCurrentExpoToken = async () => {
  try {
    const token = await getStoredExpoToken();
    return token;
  } catch (error) {
    console.error('Error getting current Expo token:', error);
    return null;
  }
};

export const hasNotificationPermissions = async () => {
  try {
    const { Notifications } = require('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
};

export const getNotificationPermissionStatus = async () => {
  try {
    const { Notifications } = require('expo-notifications');
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();

    return {
      granted: status === 'granted',
      status: status,
      canAskAgain: canAskAgain,
    };
  } catch (error) {
    console.error('Error getting notification permission status:', error);
    return {
      granted: false,
      status: 'unknown',
      canAskAgain: false,
    };
  }
};

export const formatTokenForDisplay = (token) => {
  if (!token) return 'No token available';

  if (token.length <= 20) return token;

  const start = token.substring(0, 10);
  const end = token.substring(token.length - 10);
  return `${start}...${end}`;
};

export const isValidExpoToken = (token) => {
  if (!token || typeof token !== 'string') return false;

  const expoTokenPattern = /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/;
  return expoTokenPattern.test(token);
};

export const getDeviceInfo = async () => {
  try {
    const { Device } = require('expo-device');
    const { Platform } = require('react-native');

    return {
      isDevice: Device.isDevice,
      platform: Platform.OS,
      deviceName: Device.deviceName || 'Unknown Device',
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return {
      isDevice: false,
      platform: 'unknown',
      deviceName: 'Unknown Device',
    };
  }
};
