import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from '@env';
import refreshToken from '../utils/tokenRefresh';
import { getUserRole } from '../utils/userRole';

export async function getEventsForLogInUser() {
    // Check user role - Owner, Employee, and Manager can access events
    const userRole = await getUserRole();
    const allowedRoles = ["Owner", "Employee", "Manager"];
    
    if (!allowedRoles.includes(userRole)) {
        throw new Error('Access denied. Only Owner, Employee, and Manager roles can access events.');
    }

    let token = await AsyncStorage.getItem('token');
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

    if (!token) {
        throw new Error('No token found');
    }

    // --- FIXED: Fetch all events like tasks service ---
    // Business Rule: Get all events and let frontend group them by date
    // This matches the pattern used by getAllTasks service
    
    try {
        const response = await axios.get(`${API_URL}/event`, {
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
            const retryResponse = await axios.get(`${API_URL}/event`, {
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
