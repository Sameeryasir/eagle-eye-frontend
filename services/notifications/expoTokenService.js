// --- Expo Token Service ---
// This service handles Expo push token generation and notification permissions
// Following MCP Context 7 best practices for clean, maintainable code

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Notification Configuration ---
// Configure how notifications are handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions from the user
 * This is required before we can generate an Expo push token
 * @returns {Promise<boolean>} - Returns true if permissions granted, false otherwise
 */
export const requestNotificationPermissions = async () => {
  try {
    console.log('Requesting notification permissions...');
    
    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return false;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If permissions not granted, request them
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Check final permission status
    if (finalStatus !== 'granted') {
      console.log('Notification permissions denied by user');
      return false;
    }

    console.log('Notification permissions granted successfully');
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Generate and return Expo push token for the current device
 * This token is used to send push notifications to this specific device
 * @returns {Promise<string|null>} - Returns Expo push token or null if failed
 */
export const generateExpoPushToken = async () => {
  try {
    console.log('Generating Expo push token...');

    // First, ensure we have notification permissions
    const hasPermissions = await requestNotificationPermissions();
    if (!hasPermissions) {
      console.log('Cannot generate token without notification permissions');
      return null;
    }

    // Generate the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '35012417-c75c-4b31-89df-1a71d6aa5491', // From app.json
    });

    const expoToken = tokenData.data;
    console.log('Expo push token generated successfully:', expoToken);

    // Store the token locally for future use
    await AsyncStorage.setItem('expoPushToken', expoToken);
    console.log('Expo push token stored locally');

    return expoToken;
  } catch (error) {
    console.error('Error generating Expo push token:', error);
    return null;
  }
};

/**
 * Get the stored Expo push token from local storage
 * @returns {Promise<string|null>} - Returns stored token or null if not found
 */
export const getStoredExpoToken = async () => {
  try {
    const token = await AsyncStorage.getItem('expoPushToken');
    return token;
  } catch (error) {
    console.error('Error retrieving stored Expo token:', error);
    return null;
  }
};

/**
 * Clear the stored Expo push token
 * This is useful when user logs out or wants to reset notifications
 */
export const clearExpoToken = async () => {
  try {
    await AsyncStorage.removeItem('expoPushToken');
    console.log('Expo push token cleared from storage');
  } catch (error) {
    console.error('Error clearing Expo token:', error);
  }
};

/**
 * Complete notification setup process
 * This function handles the entire flow: permissions + token generation
 * @returns {Promise<{success: boolean, token: string|null, error?: string}>}
 */
export const setupNotifications = async () => {
  try {
    console.log('Starting complete notification setup...');

    // Step 1: Request permissions
    const hasPermissions = await requestNotificationPermissions();
    if (!hasPermissions) {
      return {
        success: false,
        token: null,
        error: 'Notification permissions denied'
      };
    }

    // Step 2: Generate token
    const token = await generateExpoPushToken();
    if (!token) {
      return {
        success: false,
        token: null,
        error: 'Failed to generate Expo push token'
      };
    }

    console.log('Notification setup completed successfully');
    return {
      success: true,
      token: token
    };
  } catch (error) {
    console.error('Error in notification setup:', error);
    return {
      success: false,
      token: null,
      error: error.message || 'Unknown error during notification setup'
    };
  }
};
