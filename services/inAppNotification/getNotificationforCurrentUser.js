import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export async function getNotificationforCurrentUser() {
    let token = await AsyncStorage.getItem('token');
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

    if (!token) {
        throw new Error('Access token not found');
    }

    try {
        const response = await axios.get(`${API_URL}/users-notifications/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (err) {
        if (err.response?.status === 401 && refreshTokenValue) {
            const newToken = await refreshToken(refreshTokenValue);
            
            const retryResponse = await axios.get(`${API_URL}/users-notifications/user`, {
                headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return retryResponse.data;
        }
        throw err;
    }
}