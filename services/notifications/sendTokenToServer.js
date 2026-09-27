/**
 * Change Summary:
 * - What: Uses shared apiPost/apiDelete + ApiRoutes.notifications.*
 * - Why: Nest tokens at /notifications/tokens; no update-token (re-save instead)
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, apiDelete, ApiRoutes } from '../api/client';

/**
 * Get the stored Expo token ID from AsyncStorage
 * @returns {Promise<string|null>}
 */
export const getStoredExpoTokenId = async () => {
  try {
    return await AsyncStorage.getItem('expoTokenId');
  } catch (error) {
    console.error('Error getting stored expo token ID:', error);
    return null;
  }
};

/**
 * Save the Expo push token to the server.
 * AuthContext expects { success, data } where data has id/tokenId.
 * @param {string} expoToken
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const saveTokenToServer = async (expoToken) => {
  try {
    const payload = {
      expoPushToken: expoToken,
      platform: Platform.OS,
      deviceType: 'mobile',
    };

    // apiRequest already returns response.data
    const result = await apiPost(ApiRoutes.notifications.tokens, payload);

    // Nest may wrap in { data } or return the token record directly
    const tokenRecord = result?.data ?? result;

    return { success: true, data: tokenRecord };
  } catch (error) {
    console.error('Error saving token to server:', error);
    if (error.response?.data?.message) {
      return { success: false, error: error.response.data.message };
    }
    return { success: false, error: 'Failed to save push token to server' };
  }
};

/**
 * Nest has no update-token endpoint — re-save via POST /notifications/tokens.
 * Signature preserved for existing callers.
 */
export const updateTokenOnServer = async (expoToken, userId) => {
  void userId;
  return saveTokenToServer(expoToken);
};

/**
 * Remove the Expo push token from the server by stored token id.
 * @param {string} expoTokenId
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const removeTokenFromServer = async (expoTokenId) => {
  try {
    const data = await apiDelete(ApiRoutes.notifications.tokenById(expoTokenId));
    return { success: true, data };
  } catch (error) {
    console.error('removeTokenFromServer: Error occurred:', error);
    if (error.response?.data?.message) {
      return { success: false, error: error.response.data.message };
    }
    return { success: false, error: 'Failed to remove push token from server' };
  }
};
