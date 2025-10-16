import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from "../../config/api";
import refreshToken from '../utils/tokenRefresh';

export async function updateUserById(userId, userData) {
  const token = await AsyncStorage.getItem('token');
  const refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  if (!token) {
    throw new Error('No token found');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!userData) {
    throw new Error('User data is required');
  }

  try {
    console.log(`UpdateUserById Service - Making request to: ${API_URL}/user/${userId}`);
    const response = await axios.put(`${API_URL}/user/${userId}`, userData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`UpdateUserById Service - Response received:`, response.data);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // refresh and retry once
      const newToken = await refreshToken(refreshTokenValue);
      const retryResponse = await axios.put(`${API_URL}/user/${userId}`, userData, {
        headers: { 
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
      });
      return retryResponse.data;
    }
    
    // Provide more detailed error information
    if (axios.isAxiosError(err)) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to update user";
      const status = err.response?.status;
      console.error(`UpdateUserById Service Error - Status: ${status}, Message: ${errorMessage}`);
      throw new Error(`Failed to update user: ${errorMessage} (Status: ${status})`);
    }
    
    throw new Error(`Failed to update user: ${err.message}`);
  }
}
