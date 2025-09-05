import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import refreshToken from '../utils/tokenRefresh';

export async function getTaskAssignedToManager(projectId) {
    let token = await AsyncStorage.getItem('token');
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

    if (!token) {
        throw new Error('No token found');
    }

    if (!projectId) {
        throw new Error('Project ID is required');
    }

    try {
        // --- Get Tasks Assigned to Manager for Specific Project ---
        // Business Rule: Fetch all tasks assigned to the current manager for a specific project
        const response = await axios.get(`${API_URL}/project/manager/employee-tasks/${projectId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        
        // --- Console log the response for debugging ---
        console.log('=== getTaskAssignedToManager Service Response ===');
        console.log('Project ID:', projectId);
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
        console.log('Response Data Type:', typeof response.data);
        console.log('Response Data Keys:', response.data ? Object.keys(response.data) : 'No data');
        if (response.data?.tasks) {
            console.log('Tasks Count:', response.data.tasks.length);
            console.log('First Task:', response.data.tasks[0]);
        }
        console.log('================================================');
        
        // --- Check if no tasks are available for the project ---
        // Business Rule: If no tasks are assigned to manager for this project, show appropriate message
        if (response.data?.tasks && response.data.tasks.length === 0) {
            const error = new Error('No tasks are assigned to you for this project yet.');
            error.statusCode = 400;
            error.error = 'Bad Request';
            throw error;
        }
        
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            // --- Token Refresh Logic ---
            const newToken = await refreshToken(refreshTokenValue);

            if (!newToken) throw new Error('Unable to refresh token.');

            // Retry the original request with new token
            const retryResponse = await axios.get(`${API_URL}/project/manager/employee-tasks/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${newToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            // --- Console log the retry response for debugging ---
            console.log('=== getTaskAssignedToManager Service Retry Response ===');
            console.log('Project ID:', projectId);
            console.log('Retry Response Status:', retryResponse.status);
            console.log('Retry Response Data:', JSON.stringify(retryResponse.data, null, 2));
            console.log('Retry Response Data Type:', typeof retryResponse.data);
            console.log('Retry Response Data Keys:', retryResponse.data ? Object.keys(retryResponse.data) : 'No data');
            if (retryResponse.data?.tasks) {
                console.log('Retry Tasks Count:', retryResponse.data.tasks.length);
                console.log('Retry First Task:', retryResponse.data.tasks[0]);
            }
            console.log('=====================================================');
            
            return retryResponse.data;
        }

        // --- Handle API Errors ---
        throw new Error(err.response?.data?.message || 'Failed to fetch tasks assigned to manager');
    }
}
