// --- Message Notification Service ---
// This service creates in-app message notifications for users
// Used to notify users about new messages in conversations

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

/**
 * Creates a message notification
 * @param {Object} notificationData - The notification data to send
 * @returns {Promise<Object>} The created notification response
 */
export const createMessageNotification = async (notificationData) => {
  // Get authentication tokens from storage
  const accessToken = await AsyncStorage.getItem('token');
  const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
  
  // Validate that access token exists
  if (!accessToken) {
    throw new Error('Access token not found');
  }
  
  try {
    // --- Sending Notification Request ---
    const response = await axios.post(
      `${API_URL}/users-notifications/message`,
      notificationData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (err) {
    // --- Handle Unauthorized Error with Token Refresh ---
    if (err.response?.status === 401 && refreshTokenValue) {
      const newToken = await refreshToken(refreshTokenValue);
      
      // Retry the request with new token
      const retryResponse = await axios.post(
        `${API_URL}/users-notifications/message`,
        notificationData,
        {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return retryResponse.data;
    }
    throw err;
  }
};
