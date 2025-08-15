import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {API_URL} from "@env";
import refreshToken from '../utils/tokenRefresh';

export const updateTask = async (taskId, taskData) => {
  let token = await AsyncStorage.getItem("token");
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  if (!token) {
    throw new Error("No authentication token found");
  }

  try {
    const response = await axios.put(`${API_URL}/task/${taskId}`, taskData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // Refresh the token
      const newToken = await refreshToken(refreshTokenValue);

      if (!newToken) throw new Error('Unable to refresh token.');

      // Retry the original request with new token
      const retryResponse = await axios.put(`${API_URL}/task/${taskId}`, taskData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
        },
      });
      return retryResponse.data;
    }

    console.error("Error updating task:", err);
    
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    } else if (err.message) {
      throw new Error(err.message);
    } else {
      throw new Error("Failed to update task");
    }
  }
};
