// --- Send Message Service (MCP Context 7) ---
// This service sends a message to a specific conversation
// API Endpoint: POST /chat/messages
// Requires: JWT Authentication
// Business Rule: Sends conversationId, content, and optional file attachment
// Changed: Now supports file uploads via FormData

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api.js';
import refreshToken from '../utils/tokenRefresh';

export const sendMessage = async (conversationId, content, file = null, messageId = null) => {
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

  // Validation: Must have either content or file
  if ((!content || !content.trim()) && !file) {
    throw new Error('Message content or file is required');
  }

  console.log('=== Sending Message ===');
  console.log('Conversation ID:', conversationId);
  console.log('Content:', content);
  console.log('File:', file ? `${file.name} (${file.mimeType})` : 'None');
  console.log('Message ID:', messageId || 'None');

  // --- Prepare Request Body (MCP Context 7) ---
  // Business Rule: Use FormData when file is attached, otherwise use JSON
  let requestBody;
  let headers = {
    'Authorization': `Bearer ${token}`,
  };

  if (file) {
    // Use FormData for file uploads
    // Business Rule: FormData allows sending both text and binary data (files)
    requestBody = new FormData();
    requestBody.append('conversationId', conversationId.toString());
    
    if (content && content.trim()) {
      requestBody.append('content', content.trim());
    }
    
    // Append message_id if provided (from database)
    if (messageId) {
      requestBody.append('message_id', messageId);
    }
    
    
    // Append file with proper structure for React Native
    // React Native requires: { uri, name, type }
    requestBody.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    });
    
    // Let axios set Content-Type with boundary automatically for FormData
    headers['Content-Type'] = 'multipart/form-data';
    
    console.log('Using FormData with file attachment');
  } else {
    // Use JSON for text-only messages
    requestBody = {
      conversationId: conversationId,
      content: content.trim(),
    };
    
    // Add message_id if provided (from database)
    if (messageId) {
      requestBody.message_id = messageId;
    }
    
     
    headers['Content-Type'] = 'application/json';
    
    console.log('Using JSON for text-only message');
  }
  
  try {
    // Console log the complete request body being sent to server
    console.log('📤 Complete request body being sent to server:');
    if (file) {
      console.log('FormData contents:');
      console.log('- conversationId:', conversationId);
      console.log('- content:', content);
      console.log('- message_id:', messageId);
      console.log('- file:', file ? `${file.name} (${file.mimeType})` : 'None');
    } else {
      console.log('JSON request body:', JSON.stringify(requestBody, null, 2));
    }
    
    // Make API request to send message (with or without file)
    const response = await axios.post(
      `${API_URL}/chat/messages`, 
      requestBody,
      { headers }
    );
    
    console.log('✅ Message sent successfully:', response.data);
    return response.data;
  } catch (err) {
    // Handle 401 Unauthorized - Token expired
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      console.log('⚠️ Token expired, refreshing...');
      
      // Refresh the token
      const newToken = await refreshToken(refreshTokenValue);

      if (!newToken) throw new Error('Unable to refresh token.');

      // Update headers with new token
      headers['Authorization'] = `Bearer ${newToken}`;

      // Retry the original request with new token
      const retryResponse = await axios.post(
        `${API_URL}/chat/messages`,
        requestBody,
        { headers }
      );
      
      console.log('✅ Message sent successfully (after token refresh):', retryResponse.data);
      return retryResponse.data;
    }

    // Log and throw error for other cases
    console.error('❌ Error sending message:', err);
    console.error('Error response:', err.response?.data);
    throw err;
  }
};


