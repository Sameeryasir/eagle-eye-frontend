// --- Notification Utilities ---
// Utility functions for working with Expo push tokens and notifications
// Following MCP Context 7 best practices for clean, maintainable code

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredExpoToken } from './expoTokenService';

/**
 * Get the current Expo push token from storage
 * This is a utility function that can be used anywhere in the app
 * @returns {Promise<string|null>} - Returns the stored Expo token or null
 */
export const getCurrentExpoToken = async () => {
  try {
    const token = await getStoredExpoToken();
    return token;
  } catch (error) {
    console.error('Error getting current Expo token:', error);
    return null;
  }
};

/**
 * Check if the user has granted notification permissions
 * @returns {Promise<boolean>} - Returns true if permissions are granted
 */
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

/**
 * Get notification permission status with detailed information
 * @returns {Promise<{granted: boolean, status: string, canAskAgain: boolean}>}
 */
export const getNotificationPermissionStatus = async () => {
  try {
    const { Notifications } = require('expo-notifications');
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    
    return {
      granted: status === 'granted',
      status: status,
      canAskAgain: canAskAgain
    };
  } catch (error) {
    console.error('Error getting notification permission status:', error);
    return {
      granted: false,
      status: 'unknown',
      canAskAgain: false
    };
  }
};

/**
 * Format Expo push token for display (shows first and last few characters)
 * @param {string} token - The full Expo push token
 * @returns {string} - Formatted token for display
 */
export const formatTokenForDisplay = (token) => {
  if (!token) return 'No token available';
  
  if (token.length <= 20) return token;
  
  const start = token.substring(0, 10);
  const end = token.substring(token.length - 10);
  return `${start}...${end}`;
};

/**
 * Validate if a string looks like a valid Expo push token
 * @param {string} token - The token to validate
 * @returns {boolean} - Returns true if token looks valid
 */
export const isValidExpoToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // Expo push tokens typically start with 'ExponentPushToken[' and end with ']'
  // and contain alphanumeric characters and some special characters
  const expoTokenPattern = /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/;
  return expoTokenPattern.test(token);
};

/**
 * Get device information for notification debugging
 * @returns {Promise<{isDevice: boolean, platform: string, deviceName?: string}>}
 */
export const getDeviceInfo = async () => {
  try {
    const { Device } = require('expo-device');
    const { Platform } = require('react-native');
    
    return {
      isDevice: Device.isDevice,
      platform: Platform.OS,
      deviceName: Device.deviceName || 'Unknown Device'
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return {
      isDevice: false,
      platform: 'unknown',
      deviceName: 'Unknown Device'
    };
  }
};
