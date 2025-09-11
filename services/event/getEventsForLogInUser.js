import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {API_URL} from '@env'
import refreshToken from '../utils/tokenRefresh';
import { getUserRole } from '../utils/userRole';

export async function getEventsForLogInUser(date) {
    // Check user role - only Owner can access events
    const userRole = await getUserRole();
    if (userRole !== "Owner") {
        throw new Error('Access denied. Only Owner role can access events.');
    }

    let token = await AsyncStorage.getItem('token');
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

    if (!token) {
        throw new Error('No token found');
    }

    // Format date to YYYY-MM-DD if provided
    const formattedDate = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    try {
        const response = await axios.get(`${API_URL}/event/date/${formattedDate}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            // Refresh the token
            const newToken = await refreshToken(refreshTokenValue);

            if (!newToken) throw new Error('Unable to refresh token.');

            // Retry the original request with new token
            const retryResponse = await axios.get(`${API_URL}/event/date/${formattedDate}`, {
                headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return retryResponse.data;
        }

        console.error('Error getting events:', err);
        throw err;
    }
}
