// --- Logout Service (MCP Context 7) ---
// Service to handle user logout and clear server-side caches
// This follows MCP Context 7 best practices for clean service organization

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';

/**
 * Logout user and clear server-side caches
 * @returns {Promise<{success: boolean, message: string}>} Logout result
 */
export const logoutUser = async () => {
  try {
    console.log('🚪 Initiating logout process...');
    
    // Get auth token from AsyncStorage
    const token = await AsyncStorage.getItem('authToken');
    
    if (!token) {
      console.log('⚠️ No auth token found, proceeding with local logout');
      return {
        success: true,
        message: 'Logged out successfully (no server session)'
      };
    }
    
    // Call backend logout endpoint
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Server logout successful:', result.message);
      return {
        success: true,
        message: result.message || 'Logged out successfully and cache cleared'
      };
    } else {
      console.warn('⚠️ Server logout failed, but proceeding with local logout:', result.message);
      return {
        success: true,
        message: 'Logged out successfully (server cache clearing failed)'
      };
    }
    
  } catch (error) {
    console.error('❌ Error during logout service call:', error);
    // Even if server call fails, still return success for logout
    // This ensures user can still logout locally
    return {
      success: true,
      message: 'Logged out successfully (server unavailable)'
    };
  }
};

// --- Export for use in components ---
export default logoutUser;
