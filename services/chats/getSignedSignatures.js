// --- Get Signed Signatures Service (MCP Context 7) ---
// This service fetches all signed signatures for the current logged-in user
// API Endpoint: GET /signature/signed/user
// Requires: JWT Authentication (userId is extracted from token automatically)
// Business Rule: Retrieves all signatures that have been signed by the user
// Why: Show signatures that have been signed

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

/**
 * Fetches all signed signatures for the current logged-in user
 * @returns {Promise<Array>} Array of signed signature objects
 * @description Gets signed signatures where userId is automatically extracted from JWT token
 */
export async function getSignedSignatures() {
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');
  
  // --- Validation Step ---
  // Ensure token exists for authentication
  if (!token) {
    throw new Error('No token found');
  }
  
  try {
    console.log('📝 Fetching signed signatures for current user...');
    
    // Make API request to get signed signatures
    // Note: userId is automatically extracted from JWT token on backend
    const response = await axios.get(
      `${API_URL}/signature/signed/user`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Signed signatures fetched successfully:', response.data);
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
        `${API_URL}/signature/signed/user`,
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
    console.error('❌ Error fetching signed signatures:', err);
    throw err;
  }
}

