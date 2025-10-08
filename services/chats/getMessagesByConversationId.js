// --- Get Conversation By ID Service (MCP Context 7) ---
// This service fetches messages for a specific conversation
// API Endpoint: GET /chat/conversations/{conversationId}/messages
// Requires: JWT Authentication
// Business Rule: Fetches all messages for the given conversation ID

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export async function getMessagesByConversationId(conversationId) {
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');
  
  // Validation: Ensure token exists
  if (!token) {
    throw new Error('No token found');
  }
  
  // Validation: Ensure conversationId is provided
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  
  try {
    // Make API request to fetch conversation messages
    const response = await axios.get(
      `${API_URL}/chat/conversations/${conversationId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (err) {
    // Handle 401 Unauthorized - Token expired
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // Refresh the token
      const newToken = await refreshToken(refreshTokenValue);

      if (!newToken) throw new Error('Unable to refresh token.');

      // Retry the original request with new token
      const retryResponse = await axios.get(
        `${API_URL}/chat/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return retryResponse.data;
    }

    // Log and throw error for other cases
    console.error('Error fetching conversation messages:', err);
    throw err;
  }
}    