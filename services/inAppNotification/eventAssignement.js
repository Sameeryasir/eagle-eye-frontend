import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export const eventAssignement = async (notificationData) => {
  console.log('🔍 DEBUGGING eventAssignement API CALL:');
  console.log('📥 Input notificationData:', notificationData);
  
  // Validate required fields
  if (!notificationData.assignedToUserIds || !Array.isArray(notificationData.assignedToUserIds) || notificationData.assignedToUserIds.length === 0) {
    throw new Error('assignedToUserIds must be a non-empty array');
  }
  
  if (!notificationData.eventId) {
    throw new Error('eventId is required');
  }
  
  if (!notificationData.title) {
    throw new Error('title is required');
  }
  
  if (!notificationData.message) {
    throw new Error('message is required');
  }
  
  if (!notificationData.fromUserName) {
    throw new Error('fromUserName is required');
  }
  
  // Get tokens from AsyncStorage
  const accessToken = await AsyncStorage.getItem('token');
  const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
  
  console.log('🔑 Token found:', accessToken ? 'YES' : 'NO');
  console.log('🔄 Refresh token found:', refreshTokenValue ? 'YES' : 'NO');
  
  if (!accessToken) {
    throw new Error('Access token not found');
  }
  
  // Convert assignedToUserIds array and eventId to numbers for DTO compatibility
  // Note: Backend DTO shows assignedToUserIds (plural) but might expect assignedToUserId (singular)
  const payload = {
    ...notificationData,
    assignedToUserIds: notificationData.assignedToUserIds.map(id => Number(id)), // Array of numbers
    eventId: Number(notificationData.eventId) // Single event ID as number
  };
  
  // If the backend expects assignedToUserId (singular), uncomment this line:
  // payload.assignedToUserId = notificationData.assignedToUserIds[0]; // First user ID as singular
  
  console.log('🔔 SENDING EVENT NOTIFICATION DATA TO API:', payload);
  console.log('🔍 PAYLOAD FIELD TYPES:');
  console.log('- title:', typeof payload.title, payload.title);
  console.log('- message:', typeof payload.message, payload.message);
  console.log('- assignedToUserIds:', typeof payload.assignedToUserIds, Array.isArray(payload.assignedToUserIds), payload.assignedToUserIds);
  console.log('- eventId:', typeof payload.eventId, payload.eventId);
  console.log('- priority:', typeof payload.priority, payload.priority);
  console.log('- eventName:', typeof payload.eventName, payload.eventName);
  console.log('- fromUserName:', typeof payload.fromUserName, payload.fromUserName);
  console.log('🌐 API_URL:', API_URL);
  console.log('🎯 Full endpoint:', `${API_URL}/users-notifications/event`);
  console.log('🔍 TRYING DIFFERENT ENDPOINTS:');
  console.log('- Current:', `${API_URL}/users-notifications/event`);
  console.log('- Alternative 1:', `${API_URL}/event-notifications`);
  console.log('- Alternative 2:', `${API_URL}/users-notifications`);
  
  try {
    const response = await axios.post(`${API_URL}/users-notifications/event`, payload, {
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
      
      const retryResponse = await axios.post(`${API_URL}/users-notifications/event`, payload, {
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
};                    