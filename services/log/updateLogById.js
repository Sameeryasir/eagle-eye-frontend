import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import refreshToken from "../utils/tokenRefresh";

export async function updateLogById(logId, updateData) {
  const token = await AsyncStorage.getItem('token');
  
  if (!token) {
    throw new Error('No token found');
  }

  try {
    const response = await axios.put(`${API_URL}/log/${logId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (err) {
    // Handle 401 errors with token refresh
    if (err.response?.status === 401) {
      const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
      if (refreshTokenValue) {
        try {
          const newToken = await refreshToken(refreshTokenValue);
          const retryResponse = await axios.put(`${API_URL}/log/${logId}`, updateData, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          return retryResponse.data;
        } catch (refreshErr) {
          throw new Error(refreshErr.response?.data?.message || "Authentication failed");
        }
      }
    }
    
    // Handle other errors
    throw new Error(err.response?.data?.message || err.message || "Failed to update log");
  }
}
