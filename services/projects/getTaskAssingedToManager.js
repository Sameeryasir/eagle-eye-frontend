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
        const response = await axios.get(`${API_URL}/project/manager-tasks/${projectId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            // --- Token Refresh Logic ---
            const newToken = await refreshToken(refreshTokenValue);

            if (!newToken) throw new Error('Unable to refresh token.');

            // Retry the original request with new token
            const retryResponse = await axios.get(`${API_URL}/project/manager-tasks/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${newToken}`,
                    'Content-Type': 'application/json',
                },
            });
            return retryResponse.data;
        }

        // --- Handle API Errors ---
        throw new Error(err.response?.data?.message || 'Failed to fetch tasks assigned to manager');
    }
}
