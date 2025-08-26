import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import refreshToken from "../utils/tokenRefresh";

export async function deleteLogById(logId) {
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  if (!token) {
    throw new Error('No token found');
  }

  try {
    const response = await axios.delete(`${API_URL}/log/${logId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (err) {
    // Handle token refresh for 401 errors
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      try {
        const newToken = await refreshToken(refreshTokenValue);
        const retryResponse = await axios.delete(`${API_URL}/log/delete/${logId}`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
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
      } else if (err.response?.status) {
        throw new Error(`Server error: ${err.response.status} - ${err.response.statusText}`);
      } else if (err.code === 'NETWORK_ERROR') {
        throw new Error("Network error: Please check your internet connection");
      } else if (err.message) {
        throw new Error(err.message);
      }
    }
    
    // Fallback for non-axios errors
    throw new Error(err.message || "Failed to delete log");
  }
}
