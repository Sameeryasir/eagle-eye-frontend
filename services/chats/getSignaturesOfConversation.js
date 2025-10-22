// --- Get Signatures of Conversation Service (MCP Context 7) ---
// This service fetches all signatures for a specific conversation
// API Endpoint: GET /signature/signature/{conversationId}
// Requires: JWT Authentication
// Business Rule: Retrieves all signature requests and responses for a conversation

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

/**
 * Fetches all signatures for a specific conversation
 * @param {number|string} conversationId - Required: ID of the conversation
 * @returns {Promise<Array>} Array of signature objects
 */
export async function getSignaturesOfConversation(conversationId) {
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');
  
  // --- Validation Step ---
  // Ensure token exists for authentication
  if (!token) {
    throw new Error('No token found');
  }
  
  // Ensure conversationId is provided and valid
  if (!conversationId || isNaN(parseInt(conversationId))) {
    throw new Error('Valid conversation ID is required');
  }
  
  try {
    console.log('Fetching signatures for conversation:', conversationId);
    
    // Make API request to get signatures
    const response = await axios.get(
        `${API_URL}/signature/singature/${conversationId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
    )
    
    console.log('Signatures fetched successfully:', response.data);
    console.log('📝 Full API Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (err) {
    // Handle 401 Unauthorized - Token expired
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // Refresh the token
      const newToken = await refreshToken(refreshTokenValue);

      if (!newToken) throw new Error('Unable to refresh token.');

      // Retry the original request with new token
      const retryResponse = await axios.get(
        `${API_URL}/signature/signature/${conversationId}`,
        {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('📝 Retry API Response:', JSON.stringify(retryResponse.data, null, 2));
      return retryResponse.data;
    }

    // Log and throw error for other cases
    console.error('Error fetching signatures:', err);
    throw err;
  }
}
