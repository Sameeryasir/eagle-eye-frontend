import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export async function getUserForConversations() {
    console.log('🔍 DEBUGGING getUserForConversations API CALL:');
    
    const token = await AsyncStorage.getItem('token');
    const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
    
    console.log('🔑 Token found:', token ? 'YES' : 'NO');
    console.log('🔄 Refresh token found:', refreshTokenValue ? 'YES' : 'NO');
    
    if (!token) {
        throw new Error('No token found');
    }
    
    console.log('🌐 API_URL:', API_URL);
    console.log('🎯 Full endpoint:', `${API_URL}/user/employees-for-conversation`);

    try {
        const response = await axios.get(`${API_URL}/user/employees-for-conversation`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        
        console.log('✅ API RESPONSE SUCCESS:', response.status);
        console.log('📄 Response data:', response.data);
        return response.data;
        
    } catch (error) {
        console.log('❌ API ERROR DETAILS:');
        console.log('- Error message:', error.message);
        console.log('- Status code:', error.response?.status);
        console.log('- Status text:', error.response?.statusText);
        console.log('- Response data:', error.response?.data);
        console.log('- Request URL:', error.config?.url);
        console.log('- Request method:', error.config?.method);
        console.log('- Request headers:', error.config?.headers);
        
        if (error.response?.status === 401 && refreshTokenValue) {
            console.log('🔄 Attempting token refresh...');
            const newToken = await refreshToken(refreshTokenValue);
            
            const retryResponse = await axios.get(`${API_URL}/user/employees-for-conversation`, {
                headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('✅ RETRY RESPONSE SUCCESS:', retryResponse.status);
            console.log('📄 Retry response data:', retryResponse.data);
            return retryResponse.data;
        }
        
        console.error('Error getting user for conversations:', error);
        throw error;
    }
}