// --- Get Messages By Conversation ID Service (MCP Context 7) ---
// This service fetches messages for a specific conversation with pagination
// API Endpoint: GET /chat/conversations/{conversationId}/messages?page={page}&limit={limit}
// Requires: JWT Authentication
// Business Rule: Fetches paginated messages for the given conversation ID
// Parameters: conversationId (required), page (default: 1), limit (default: 20, max: 100)

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export async function getMessagesByConversationId(conversationId, page = 1, limit = 20, { signal } = {}) {
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
  
  // Validation: Ensure page and limit are valid
  if (page < 1) {
    throw new Error('Page number must be greater than 0');
  }
  
  if (limit < 1 || limit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }
  
  try {
    // Make API request to fetch conversation messages with pagination
    const response = await axios.get(
      `${API_URL}/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
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
        `${API_URL}/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
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