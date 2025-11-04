import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from "../utils/tokenRefresh";

/**
 * Delete Notification Service
 * 
 * What: Deletes a specific notification by its ID
 * Why: Allows users to remove individual notifications from their list
 * Dependencies: Requires notification ID and valid authentication token
 * 
 * MCP Context 7: Follows standard service pattern with token refresh handling
 */
export async function deleteNotificationById(notificationId) {
    // --- Input Validation ---
    // Business Rule: Notification ID is required to delete a notification
    if (!notificationId) {
        throw new Error("Notification ID is required");
    }

    console.log('🗑️ DELETE NOTIFICATION API CALL:');
    console.log('📋 Notification ID:', notificationId);
    
    // --- Get Authentication Tokens ---
    // Business Rule: Token is required for authenticated API calls (MCP Context 7)
    let token = await AsyncStorage.getItem("token");
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');
    
    console.log('🔑 Token found:', token ? 'YES' : 'NO');
    console.log('🔄 Refresh token found:', refreshTokenValue ? 'YES' : 'NO');
    
    if (!token) {
        throw new Error("No token found");
    }
    
    console.log('🌐 API_URL:', API_URL);
    console.log('🎯 Full endpoint:', `${API_URL}/users-notifications/${notificationId}`);
    
    try {
        // --- Delete Notification Request ---
        // Business Rule: DELETE request removes notification from user's list
        const response = await axios.delete(`${API_URL}/users-notifications/${notificationId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        });
        
        console.log('✅ DELETE NOTIFICATION SUCCESS:', response.status);
        console.log('📄 Response data:', response.data);
        return response.data;
        
    } catch (err) {
        console.log('❌ DELETE NOTIFICATION ERROR:');
        console.log('- Error message:', err.message);
        console.log('- Status code:', err.response?.status);
        console.log('- Status text:', err.response?.statusText);
        console.log('- Response data:', err.response?.data);
        
        // --- Token Refresh Handling (MCP Context 7) ---
        // Business Rule: Automatically retry with new token if 401 unauthorized error occurs
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            console.log('🔄 Attempting token refresh and retry...');
            const newToken = await refreshToken(refreshTokenValue);
            
            const retryResponse = await axios.delete(`${API_URL}/users-notifications/${notificationId}`, {
                headers: {
                    Authorization: `Bearer ${newToken}`,
                    "Content-Type": "application/json",
                }
            });
            
            console.log('✅ RETRY DELETE NOTIFICATION SUCCESS:', retryResponse.status);
            console.log('📄 Retry response data:', retryResponse.data);
            return retryResponse.data;
        }
        
        console.error("Error deleting notification:", err.response?.data || err.message);
        throw err;
    }
}


