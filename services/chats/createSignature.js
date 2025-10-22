// --- Create Signature Service (MCP Context 7) ---
// This service creates a message with signature request
// API Endpoint: POST /signature/message-with-signature
// DTO: CreateMessageWithSignatureDto
// Requires: JWT Authentication
// Business Rule: Creates a signature request message in the conversation

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

/**
 * Creates a message with signature request in a conversation
 * @param {number|string} conversationId - Required: ID of the conversation
 * @param {Object} signatureData - Optional signature details
 * @param {string} [signatureData.title] - Optional: Title of the signature request
 * @param {string} [signatureData.notes] - Optional: Additional notes/details
 * @param {string} [signatureData.dueDate] - Optional: Due date as ISO string
 * @returns {Promise<Object>} API response data
 */
export async function createSignature(conversationId, signatureData = {}) {
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');
  
  // --- Validation Step ---
  // Ensure token exists for authentication
  if (!token) {
    throw new Error('No token found');
  }
  
  // Ensure conversationId is provided and valid (required field in DTO)
  if (!conversationId || isNaN(parseInt(conversationId))) {
    throw new Error('Valid conversation ID is required');
  }
  
  try {
    // Prepare the request payload - aligned with CreateMessageWithSignatureDto
    const payload = {
      conversationId: parseInt(conversationId), // Required: Number type
      title: signatureData?.title || undefined, // Optional: String type
      notes: signatureData?.notes || undefined, // Optional: String type  
      dueDate: signatureData?.dueDate || undefined // Optional: ISO date string
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