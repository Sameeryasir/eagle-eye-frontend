// --- Get Unread Notifications Service (MCP Context 7) ---
// Business Rule: Fetch unread notifications for the current user
// This service retrieves only notifications that haven't been marked as read

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export const getUnreadNotifications = async () => {
  // Get authentication tokens from storage
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  // Validate that access token exists
  if (!token) {
    throw new Error('Access token not found');
  }

  try {
    // Make API request to get unread notifications
    const response = await axios.get(`${API_URL}/users-notifications/unread`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (err) {
    // Handle 401 unauthorized errors by refreshing token and retrying
    if (err.response?.status === 401 && refreshTokenValue) {
      const newToken = await refreshToken(refreshTokenValue);
      
      // Retry the request with the new token
      const retryResponse = await axios.get(`${API_URL}/users-notifications/unread`, {
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return retryResponse.data;
    }
    // Re-throw error if not 401 or no refresh token available
    throw err;
  }
};                      