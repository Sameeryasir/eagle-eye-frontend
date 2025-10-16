import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

// --- Typing Status Service ---
// This service sends typing indicators to the server for real-time chat functionality
// Includes automatic token refresh to handle expired access tokens
// Supports both "started typing" and "stopped typing" status
export async function isTyping(conversationId, isTypingStatus) {
  // --- Get Authentication Tokens ---
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  if (!token || !refreshTokenValue) {
    throw new Error('No token or refresh token found');
  }

  try {
    // --- Send Typing Status to Server ---
    await axios.post(`${API_URL}/chat/typing`, {
      conversationId,
      isTyping: isTypingStatus, // ← Send typing status (true/false)
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error sending typing status:', error);
    
    // --- Handle Token Refresh for 401 Unauthorized Errors ---
    if (axios.isAxiosError(error) && error.response?.status === 401 && refreshTokenValue) {
      try {
        // Refresh the access token using the refresh token
        const newToken = await refreshToken(refreshTokenValue);
        
        if (!newToken) {
          throw new Error('Unable to refresh token');
        }

        // --- Retry Original Request with New Token ---
        const retryResponse = await axios.post(`${API_URL}/chat/typing`, {
          conversationId,
          isTyping: isTypingStatus, // ← Include typing status in retry
        }, {
          headers: {
            Authorization: `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        return retryResponse.data;
      } catch (refreshError) {
        console.error('Error refreshing token for typing status:', refreshError);
        throw new Error('Authentication failed after token refresh');
      }
    }
    
    // --- Re-throw Original Error if Not 401 or No Refresh Token ---
    throw error;
  }
}