import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from "../../config/api";
import refreshToken from '../utils/tokenRefresh';

export async function getEmployeesToAssignTasks() {
    let token = await AsyncStorage.getItem('token');
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');
    
    console.log('Token retrieved:', token ? 'Token exists' : 'No token');

    if (!token) {
        throw new Error('No token found');
    }

    try {
        console.log('Making API call to:', `${API_URL}/task/assignTo`);
        const response = await axios.get(`${API_URL}/task/assignTo`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        console.log('API response:', response.data);
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            // Refresh the token
            const newToken = await refreshToken(refreshTokenValue);

            if (!newToken) throw new Error('Unable to refresh token.');

            // Retry the original request with new token
            const retryResponse = await axios.get(`${API_URL}/task/assignTo`, {
                headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json',
                }
            });
            return retryResponse.data;
        }

        console.error('Error fetching tasks for employee:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        throw err;
    }
}
