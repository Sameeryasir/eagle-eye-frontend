// --- Send Invite Service (MCP Context 7) ---
// Purpose: Sends invitation email to a user and associates them with a project
// Modified: Added projectId parameter to link invited user to specific project
// Modified: Added bearer token authentication and refresh token handling
// Dependencies: config/api.js for API_URL, AsyncStorage for token management

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api.js';
import refreshToken from '../utils/tokenRefresh';

/**
 * Send invitation to a user for a specific project
 * @param {string} email - Email address of the user to invite
 * @param {string|number} projectId - ID of the project to invite user to
 * @returns {Promise<Object>} Response data from the API
 */
export async function sendInvite(email, projectId) {
  // --- Step 1: Retrieve authentication tokens from AsyncStorage ---
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  if (!token) {
    throw new Error('Authentication required. Please login again.');
  }

  try {
    // --- Step 2: Make API request with Bearer token ---
    // Send both email and projectId to backend for user invitation and project assignment
    const response = await axios.post(
      `${API_URL}/auth/send-invitation`, 
      { 
        email,
        projectId 
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    // --- Step 3: Handle token expiration (401 error) ---
    // If token expired and we have a refresh token, try to refresh and retry
    if (axios.isAxiosError(error) && error.response?.status === 401 && refreshTokenValue) {
      try {
        console.log('Token expired, attempting to refresh...');
        
        // Refresh the access token
        const newToken = await refreshToken(refreshTokenValue);

        if (!newToken) {
          throw new Error('Unable to refresh token. Please login again.');
        }

        // --- Step 4: Retry the original request with new token ---
        const retryResponse = await axios.post(
          `${API_URL}/auth/send-invitation`, 
          { 
            email,
            projectId 
          },
          {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        return retryResponse.data;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Session expired. Please login again.');
      }
    }

    // --- Step 5: Handle other errors ---
    console.error('Send Invite Error:', error);
    
    // Re-throw error with user-friendly message if available from backend
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    // Re-throw error so calling component can handle it appropriately
    throw error;
  }
}

export default sendInvite;