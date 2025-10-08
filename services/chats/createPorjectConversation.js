import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api.js';
import refreshToken from '../utils/tokenRefresh';

// --- Create Project Group Conversation (MCP Context 7) ---
// Creates a group conversation for a specific project with all assigned members
// Business Rule: projectId is passed as URL parameter matching backend route
export const createProjectConversation = async (projectId) => {
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  // Validation: Ensure token exists before making request
  if (!token) {
    throw new Error('No token found');
  }

  // Validation: Ensure projectId is provided
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  console.log('=== Creating Project Conversation ===');
  console.log('Project ID:', projectId);
  
  try {
    // Make API request to create project conversation
    const response = await axios.post(
      `${API_URL}/chat/project-conversations/${projectId}`,
      {}, // Empty body since projectId is in URL
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Project conversation created successfully:', response.data);
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
        `${API_URL}/chat/project-conversations/${projectId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Project conversation created successfully (after refresh):', retryResponse.data);
      return retryResponse.data;
    }

    // Log and throw error for other cases
    console.error('Error creating project conversation:', err);
    console.error('Error response:', err.response?.data);
    throw err;
  }
};      