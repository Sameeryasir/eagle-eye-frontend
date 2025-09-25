import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from '@env';
import refreshToken from '../utils/tokenRefresh';

export default async function getTodaysTask() {
    let token = await AsyncStorage.getItem("token");
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

    if(!token){
        throw new Error("No token found");
    }
    
    try {
        const response = await axios.get(`${API_URL}/task`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        })
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            // Refresh the token
            const newToken = await refreshToken(refreshTokenValue);

            if (!newToken) throw new Error('Unable to refresh token.');

            // Retry the original request with new token
            const retryResponse = await axios.get(`${API_URL}/task/todays`, {
                headers: {
                    Authorization: `Bearer ${newToken}`,
                    "Content-Type": "application/json",
                }
            });
            return retryResponse.data;
        }

        console.error("Error fetching tasks:", err.response?.data || err.message);
        throw err;
    }   
}