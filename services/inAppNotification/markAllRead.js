import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from "../utils/tokenRefresh";

export async function markAllRead() {
    console.log('🔍 DEBUGGING markAllRead API CALL:');
    
    let token = await AsyncStorage.getItem("token");
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');
    
    console.log('🔑 Token found:', token ? 'YES' : 'NO');
    console.log('🔄 Refresh token found:', refreshTokenValue ? 'YES' : 'NO');
    
    if (!token) {
        throw new Error("No token found");
    }
    
    console.log('🌐 API_URL:', API_URL);
    console.log('🎯 Full endpoint:', `${API_URL}/users-notifications/read-all`);
    console.log('📋 Request body: {} (empty - user ID extracted from token)');
    
    try {
        const response = await axios.post(`${API_URL}/users-notifications/read-all`, {}, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        });
        
        console.log('✅ API RESPONSE SUCCESS:', response.status);
        console.log('📄 Response data:', response.data);
        return response.data;
        
    } catch (err) {
        console.log('❌ API ERROR DETAILS:');
        console.log('- Error message:', err.message);
        console.log('- Status code:', err.response?.status);
        console.log('- Status text:', err.response?.statusText);
        console.log('- Response data:', err.response?.data);
        
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            const newToken = await refreshToken(refreshTokenValue);
            
            const retryResponse = await axios.post(`${API_URL}/users-notifications/read-all`, {}, {
                headers: {
                    Authorization: `Bearer ${newToken}`,
                    "Content-Type": "application/json",
                }
            });
            
            console.log('✅ RETRY RESPONSE SUCCESS:', retryResponse.status);
            console.log('📄 Retry response data:', retryResponse.data);
            return retryResponse.data;
        }
        
        console.error("Error marking all read:", err.response?.data || err.message);
        throw err;
    }
}