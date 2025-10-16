// --- Create Signature Service (MCP Context 7) ---
// This service creates a message with signature request
// API Endpoint: POST /message-with-signature
// Requires: JWT Authentication
// Business Rule: Creates a signature request message in the conversation

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export async function createSignature(conversationId, signatureData) {
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
  
  // Validation: Ensure signature data is provided
  if (!signatureData || !signatureData.title) {
    throw new Error('Signature title is required');
  }
  
  try {
    // Prepare the request payload
    const payload = {
      conversationId: parseInt(conversationId),
      title: signatureData.title,
      notes: signatureData.notes || '',
      dueDate: signatureData.dueDate || null
    };
    
    console.log('Creating signature request with payload:', payload);
    
    // Make API request to create signature
    const response = await axios.post(
      `${API_URL}/signature/message-with-signature`,
      payload,
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
      const retryResponse = await axios.post(
        `${API_URL}/signature/message-with-signature`,
        payload,
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
    console.error('Error creating signature request:', err);
    throw err;
  }
}