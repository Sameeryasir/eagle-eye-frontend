import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from "../utils/tokenRefresh";

export async function projectAssignement(notificationData) {
    console.log('🔍 DEBUGGING projectAssignement API CALL:');
    console.log('📥 Input notificationData:', notificationData);
    
    // Get tokens from AsyncStorage
    const accessToken = await AsyncStorage.getItem('token');
    const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
    
    console.log('🔑 Token found:', accessToken ? 'YES' : 'NO');
    console.log('🔄 Refresh token found:', refreshTokenValue ? 'YES' : 'NO');
    
    if (!accessToken) {
        throw new Error('Access token not found');
    }
    
    // Convert assignedToUserId to number for DTO compatibility
    const payload = {
        ...notificationData,
        assignedToUserId: Number(notificationData.assignedToUserId)
    };
    
    console.log('🔔 SENDING PROJECT NOTIFICATION DATA TO API:', payload);
    console.log('🌐 API_URL:', API_URL);
    console.log('🎯 Full endpoint:', `${API_URL}/users-notifications/project`);
    
    try {
        const response = await axios.post(`${API_URL}/users-notifications/project`, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
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
        console.log('- Request URL:', err.config?.url);
        console.log('- Request method:', err.config?.method);
        console.log('- Request headers:', err.config?.headers);
        
        if (err.response?.status === 401 && refreshTokenValue) {
            const newToken = await refreshToken(refreshTokenValue);
            
            const retryResponse = await axios.post(`${API_URL}/users-notifications/project`, payload, {
                headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ RETRY RESPONSE SUCCESS:', retryResponse.status);
            console.log('📄 Retry response data:', retryResponse.data);
            return retryResponse.data;
        }
        throw err;
    }
}