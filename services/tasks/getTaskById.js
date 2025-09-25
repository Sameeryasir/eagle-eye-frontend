import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from '@env';
import refreshToken from '../utils/tokenRefresh';

export async function getTaskById(taskId) {
  let token = await AsyncStorage.getItem("token");
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  if (!token) {
    throw new Error("No token Found");
  }
  
  try {
    console.log('Fetching task with ID:', taskId);
    console.log('API URL:', `${API_URL}/task/by-id/${taskId}`);
    
    const response = await axios.get(`${API_URL}/task/by-id/${taskId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log('API Response:', response.data);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // Refresh the token
      const newToken = await refreshToken(refreshTokenValue);

      if (!newToken) throw new Error('Unable to refresh token.');

      // Retry the original request with new token
      const retryResponse = await axios.get(`${API_URL}/task/by-id/${taskId}`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
        },
      });
      return retryResponse.data;
    }

    console.error("Error fetching the Task:", err.response?.data || err.message);
    throw err;
  }
}
