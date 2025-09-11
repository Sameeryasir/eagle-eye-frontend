// --- Send Expo Token to Server Service ---
// This service handles sending the Expo push token to the backend server
// Following MCP Context 7 best practices for clean, maintainable code

import axios from 'axios';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


/**
 * Get the stored Expo token ID from AsyncStorage
 * @returns {Promise<string|null>} The token ID or null if not found
 */
export const getStoredExpoTokenId = async () => {
  try {
    const tokenId = await AsyncStorage.getItem('expoTokenId');
    return tokenId;
  } catch (error) {
    console.error('Error getting stored expo token ID:', error);
    return null;
  }
};

/**
 * Save the Expo push token to the server
 * This is the initial token save when user first enables notifications
 * Backend extracts user ID from JWT token, so no need to send it in payload
 * @param {string} expoToken - The Expo push token to save
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const saveTokenToServer = async (expoToken) => {
  try {
    console.log('Saving Expo push token to server...');

    // Get the authentication token
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) {
      throw new Error('No authentication token found');
    }

    // Prepare the request payload (backend will extract userId from JWT token)
    const payload = {
      expoPushToken: expoToken,
      platform: Platform.OS,
      deviceType: 'mobile'
    };

    console.log('Sending save request to:', `${API_URL}/notification/save-token`);
    console.log('📤 Request payload:', JSON.stringify(payload, null, 2));

    // Save the token to the server
    const response = await axios.post(
      `${API_URL}/notification/save-token`,
      payload,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    console.log('Token saved to server successfully:', response.data);
    
    // Return the response data which includes the saved token details
    return { 
      success: true, 
      data: response.data.data // Backend returns data in response.data.data
    };
  } catch (error) {
    console.error('Error saving token to server:', error);
    
    if (error.response?.data?.message) {
      return { success: false, error: error.response.data.message };
    } else {
      return { success: false, error: 'Failed to save push token to server' };
    }
  }
};

/**
 * Update the Expo push token on the server
 * This is useful when the token changes or needs to be refreshed
 * @param {string} expoToken - The new Expo push token
 * @param {string} userId - The user ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateTokenOnServer = async (expoToken, userId) => {
  try {
    console.log('Updating Expo push token on server...');

    // Get the authentication token
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) {
      throw new Error('No authentication token found');
    }

    // Prepare the request payload
    const payload = {
      expoPushToken: expoToken,
      userId: userId,
      platform: Platform.OS,
      deviceType: 'mobile'
    };

    console.log('Sending update request to:', `${API_URL}/notifications/update-token`);

    // Update the token on the server
    const response = await axios.put(
      `${API_URL}/notifications/update-token`,
      payload,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    console.log('Token updated on server successfully:', response.data);
    return { success: true };
  } catch (error) {
    console.error('Error updating token on server:', error);
    
    if (error.response?.data?.message) {
      return { success: false, error: error.response.data.message };
    } else {
      return { success: false, error: 'Failed to update push token on server' };
    }
  }
};

/**
 * Remove the Expo push token from the server
 * This is useful when user logs out or wants to disable notifications
 * Uses the stored Expo token ID instead of userId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const removeTokenFromServer = async (expoTokenId) => {
  try {
    console.log('removeTokenFromServer: Starting removal for token ID:', expoTokenId);
    
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) {
      console.error('removeTokenFromServer: No authentication token found');
      throw new Error('No authentication token found');
    }

    console.log('removeTokenFromServer: Making DELETE request to:', `${API_URL}/notification/remove-token/${expoTokenId}`);
    
    const response = await axios.delete(
      `${API_URL}/notification/remove-token/${expoTokenId}`,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    console.log('removeTokenFromServer: Success response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('removeTokenFromServer: Error occurred:', error);
    console.error('removeTokenFromServer: Error response:', error.response?.data);
    console.error('removeTokenFromServer: Error status:', error.response?.status);
    
    if (error.response?.data?.message) {
      return { success: false, error: error.response.data.message };
    } else {
      return { success: false, error: 'Failed to remove push token from server' };
    }
  }
};
