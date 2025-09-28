import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from '../utils/tokenRefresh';
export async function assignTaskToUser(taskId, userId) {
    let token = await AsyncStorage.getItem("token");
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

    // --- Debug API Call Parameters ---
    console.log('🔧 assignTaskToUser SERVICE DEBUG:');
    console.log('- taskId received:', taskId, typeof taskId);
    console.log('- userId received:', userId, typeof userId);
    console.log('- API_URL:', API_URL);
    console.log('- Full endpoint:', `${API_URL}/task/${taskId}/assign`);
    console.log('- Request body:', { assignedToUserId: userId });
    console.log('- Token exists:', !!token);

    if (!token) {
        throw new Error("No token found");
    }

    // --- Validate Parameters ---
    if (!taskId) {
        console.error('❌ taskId is missing or invalid:', taskId);
        throw new Error("Task ID is required");
    }

    if (!userId) {
        console.error('❌ userId is missing or invalid:', userId);
        throw new Error("User ID is required");
    }

    try {
        console.log('🚀 Making POST request to assign task...');
        
        // Call the API endpoint that matches the controller
        // POST /task/assign/:id with assignedToUserId in body
        const response = await axios.post(`${API_URL}/task/assign/${taskId}`, {
            assignedToUserId: userId  // Backend expects assignedToUserId field name
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        console.log('✅ API Response received:', response.status, response.data);
        
        // Return data from API
        return response.data;

    } catch (err) {
        console.error('❌ API Error in assignTaskToUser:');
        console.error('- Error type:', err.name);
        console.error('- Error message:', err.message);
        console.error('- Response status:', err.response?.status);
        console.error('- Response data:', err.response?.data);
        console.error('- Request config:', {
            method: 'POST',
            url: `${API_URL}/task/assign/${taskId}`,
            data: { assignedToUserId: userId }
        });

        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            console.log('🔄 Attempting token refresh...');
            
            // Refresh the token
            const newToken = await refreshToken(refreshTokenValue);

            if (!newToken) throw new Error('Unable to refresh token.');

            console.log('🔄 Retrying with new token...');
            
            // Retry the original request with new token
            const retryResponse = await axios.post(`${API_URL}/task/assign/${taskId}`, {
                assignedToUserId: userId
            }, {
                headers: {
                    Authorization: `Bearer ${newToken}`,
                    "Content-Type": "application/json",
                },
            });
            
            console.log('✅ Retry successful:', retryResponse.status, retryResponse.data);
            return retryResponse.data;
        }

        // Handle specific backend validation errors with detailed logging
        if (err.response?.status === 400) {
            console.error('❌ 400 Bad Request - Invalid assignment parameters');
            throw new Error(err.response.data?.message || "Invalid assignment - user must be Employee or Manager");
        }
        if (err.response?.status === 404) {
            console.error('❌ 404 Not Found - Task or User not found');
            console.error('- Requested taskId:', taskId);
            console.error('- Requested userId:', userId);
            throw new Error("Task not found - please check if the task exists");
        }
        if (err.response?.status === 403) {
            console.error('❌ 403 Forbidden - Insufficient permissions');
            throw new Error("Access denied - insufficient permissions");
        }

        // Generic error handling
        const errorMessage = err.response?.data?.message || "Failed to assign task to user";
        console.error('❌ Generic error:', errorMessage);
        throw new Error(errorMessage);
    }
}