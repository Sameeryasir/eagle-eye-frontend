

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api.js';
import refreshToken from '../utils/tokenRefresh';


export const createConversation = async (conversationData) => {
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  // Validation: Ensure token exists before making request
  if (!token) {
    throw new Error('No token found');
  }

  // Validation: Ensure participantIds array is provided
  if (!conversationData || !conversationData.participantIds || conversationData.participantIds.length === 0) {
    throw new Error('At least one participant is required');
  }

  // Prepare request body matching CreateConversationDto
  const requestBody = {
    type: conversationData.type || 'private', // Default to "private" if not specified
    participantIds: conversationData.participantIds, // Array of user IDs
  };

  console.log('=== Creating Conversation ===');
  console.log('Type:', requestBody.type);
  console.log('Participant IDs:', requestBody.participantIds);
  
  try {
    // Make API request to create conversation
    const response = await axios.post(
      `${API_URL}/chat/conversations`, 
      requestBody, // Send DTO matching backend
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Conversation created successfully:', response.data);
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
        `${API_URL}/chat/conversations`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Conversation created successfully (after refresh):', retryResponse.data);
      return retryResponse.data;
    }

    // Log and throw error for other cases
    console.error('Error creating conversation:', err);
    console.error('Error response:', err.response?.data);
    throw err;
  }
};