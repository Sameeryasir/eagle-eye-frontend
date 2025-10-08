// --- Send Message Service (MCP Context 7) ---
// This service sends a message to a specific conversation
// API Endpoint: POST /chat/messages
// Requires: JWT Authentication
// Business Rule: Sends conversationId and content in request body

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api.js';
import refreshToken from '../utils/tokenRefresh';

export const sendMessage = async (conversationId, content) => {
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

  // Validation: Ensure content is provided
  if (!content || !content.trim()) {
    throw new Error('Message content is required');
  }

  // Prepare request body with conversationId and content
  const requestBody = {
    conversationId: conversationId, // Conversation ID in body
    content: content.trim(), // Message content
  };

  console.log('=== Sending Message ===');
  console.log('Request body:', requestBody);
  
  try {
    // Make API request to send message
    const response = await axios.post(
      `${API_URL}/chat/messages`, 
      requestBody, // Send both conversationId and content in body
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Message sent successfully:', response.data);
    return response.data;
  } catch (err) {
    // Handle 401 Unauthorized - Token expired
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      console.log('Token expired, refreshing...');
      
      // Refresh the token
      const newToken = await refreshToken(refreshTokenValue);

      if (!newToken) throw new Error('Unable to refresh token.');

      // Retry the original request with new token
      const retryResponse = await axios.post(
        `${API_URL}/chat/messages`,
        requestBody, // Same body with conversationId and content
        {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Message sent successfully (after refresh):', retryResponse.data);
      return retryResponse.data;
    }

    // Log and throw error for other cases
    console.error('Error sending message:', err);
    console.error('Error response:', err.response?.data);
    throw err;
  }
};


