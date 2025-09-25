import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from '@env';
import refreshToken from "../utils/tokenRefresh";

export async function getLogById(logId) {
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  if (!token) {
    throw new Error('No token found');
  }

  if (!logId) {
    throw new Error('Log ID is required');
  }

  try {
    const apiUrl = `${API_URL}/log/singleLog/${logId}`;
    console.log(`getLogById - Calling API: ${apiUrl}`);
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`getLogById - Response status: ${response.status}`);
    console.log(`getLogById - Response data:`, response.data);
    console.log(`getLogById - Response data type:`, typeof response.data);
    console.log(`getLogById - Response data is array:`, Array.isArray(response.data));
    
    if (!response.data) {
      throw new Error('No data received from server');
    }
    
    // Handle case where API returns array instead of single object
    if (Array.isArray(response.data)) {
      if (response.data.length === 0) {
        throw new Error('Log not found');
      }
      // Return the first log if it's an array
      console.log(`getLogById - Returning first log from array:`, response.data[0]);
      return response.data[0];
    }
    
    return response.data;
  } catch (err) {
    // Handle token refresh for 401 errors
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      try {
        const newToken = await refreshToken(refreshTokenValue);
        const retryResponse = await axios.get(`${API_URL}/log/singleLog/${logId}`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
        console.log(`getLogById - Retry response status: ${retryResponse.status}`);
        console.log(`getLogById - Retry response data:`, retryResponse.data);
        return retryResponse.data;
      } catch (refreshErr) {
        // If refresh token also fails, throw the original error details
        if (axios.isAxiosError(refreshErr) && refreshErr.response?.data?.message) {
          throw new Error(refreshErr.response.data.message);
        } else if (refreshErr.message) {
          throw new Error(refreshErr.message);
        } else {
          throw new Error("Authentication failed after token refresh");
        }
      }
    }
    
    // Preserve actual error messages from the server
    if (axios.isAxiosError(err)) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      } else if (err.response?.status === 404) {
        throw new Error("Log not found");
      } else if (err.response?.status) {
        throw new Error(`Server error: ${err.response.status} - ${err.response.statusText}`);
      } else if (err.code === 'NETWORK_ERROR') {
        throw new Error("Network error: Please check your internet connection");
      } else if (err.message) {
        throw new Error(err.message);
      }
    }
    
    // Fallback for non-axios errors
    throw new Error(err.message || "Failed to fetch log");
  }
}
