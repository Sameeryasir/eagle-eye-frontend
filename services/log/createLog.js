import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {API_URL} from '@env'
import refreshToken from '../utils/tokenRefresh';

export async function createLog(data) {
    let token = await AsyncStorage.getItem('token');
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

    if (!token) {
        throw new Error('No token found');
    }

    try {
        const response = await axios.post(`${API_URL}/log/create`, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            try {
                const newToken = await refreshToken(refreshTokenValue);
                
                // Retry the request with the new token
                const retryResponse = await axios.post(`${API_URL}/log/create`, data, {
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                return retryResponse.data;
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                throw new Error('Authentication failed. Please login again.');
            }
        }
        
        // Handle other errors
        if (axios.isAxiosError(err)) {
            if (err.response?.data?.message) {
                throw new Error(err.response.data.message);
            } else if (err.response?.status === 400) {
                throw new Error('Invalid request data. Please check your input.');
            } else if (err.response?.status === 401) {
                throw new Error('Authentication failed. Please login again.');
            } else if (err.response?.status === 403) {
                throw new Error('You do not have permission to create logs.');
            } else if (err.response?.status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error('Failed to create log. Please try again.');
            }
        }
        
        throw new Error('Network error. Please check your connection and try again.');
    }
}