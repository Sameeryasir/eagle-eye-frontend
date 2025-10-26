// --- Get Messages After Last Message Service (MCP Context 7) ---
// This service fetches new messages after a specific message ID
// API Endpoint: GET /chat/conversations/messages/new?page=3&limit=20
// Requires: JWT Authentication
// Business Rule: Fetches messages that came after the specified message ID

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export async function getMessageAfterLastMessage(conversationId, afterMessageId, page = 1, limit = 20) {
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');
  
  // Validation: Ensure token exists
  if (!token) {
    throw new Error('No token found');
  }
  
  // Validation: Ensure conversationId is provided
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  
  // Validation: Ensure afterMessageId is provided
  if (!afterMessageId) {
    throw new Error('After Message ID is required');
  }
  
  // Validation: Check if afterMessageId is within integer range
  const afterMessageIdNum = Number(afterMessageId);
  if (afterMessageIdNum > 2147483647) { // Max 32-bit integer
    console.warn('⚠️ [API] afterMessageId is too large for integer type:', afterMessageId);
    console.warn('⚠️ [API] This may cause database errors. Consider using BIGINT in database.');
  }
  
  try {
    console.log('📡 [API] Fetching messages after message ID:', afterMessageId);
    console.log('📡 [API] Conversation ID:', conversationId);
    console.log('📡 [API] Page:', page, 'Limit:', limit);
    console.log('📡 [API] Request URL:', `${API_URL}/chat/conversations/messages/new`);
    console.log('📡 [API] Request body:', {
      conversationId: conversationId,
      afterMessageId: afterMessageId
    });
    console.log('📡 [API] Request params:', { page, limit });
    
    // Make API request to fetch new messages after the specified message ID
    const response = await axios.post(
      `${API_URL}/chat/conversations/messages/new`,
      {
        conversationId: Number(conversationId), // Ensure it's a number
        afterMessageId: Number(afterMessageId)  // Ensure it's a number
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: page,
          limit: limit
        }
      }
    );
    
    console.log('✅ [API] New messages fetched successfully');
    console.log('📨 [API] Response status:', response.status);
    console.log('📨 [API] Response data:', response.data);
    console.log('📨 [API] Messages count:', response.data?.messages?.length || 0);
    return response.data;
  } catch (err) {
    // Handle 401 Unauthorized - Token expired
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      console.log('🔄 [API] Token expired, refreshing...');
      
      // Refresh the token
      const newToken = await refreshToken(refreshTokenValue);

      if (!newToken) throw new Error('Unable to refresh token.');

      // Retry the original request with new token
      const retryResponse = await axios.post(
        `${API_URL}/chat/conversations/messages/new`,
        {
          conversationId: conversationId,
          afterMessageId: afterMessageId
        },
        {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            page: page,
            limit: limit
          }
        }
      );
      
      console.log('✅ [API] New messages fetched successfully after token refresh:', retryResponse.data?.length || 0, 'messages');
      return retryResponse.data;
    }

    // Log and throw error for other cases
    console.error('❌ [API] Error fetching new messages:', err);
    console.error('❌ [API] Error status:', err.response?.status);
    console.error('❌ [API] Error status text:', err.response?.statusText);
    console.error('❌ [API] Error data:', err.response?.data);
    console.error('❌ [API] Error message:', err.message);
    console.error('❌ [API] Error config:', {
      url: err.config?.url,
      method: err.config?.method,
      data: err.config?.data,
      params: err.config?.params
    });
    
    // Handle 500 Internal Server Error specifically
    if (err.response?.status === 500) {
      console.error('🚨 [API] 500 Internal Server Error - Server issue');
      console.error('🚨 [API] This could be due to:');
      console.error('🚨 [API] - Invalid conversationId or afterMessageId');
      console.error('🚨 [API] - Server database issues');
      console.error('🚨 [API] - Backend API problems');
    }
    
    throw err;
  }
}
