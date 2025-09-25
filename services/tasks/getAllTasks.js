import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from '@env';


const getAllTasks = async () => {
  try {
    // --- Get Authentication Token ---
    let token = await AsyncStorage.getItem('token');
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

    if (!token) {
      throw new Error("No authentication token found. Please login again.");
    }

    // --- Make API Request ---
    const response = await axios.get(`${API_URL}/task`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // --- Validate Response ---
    if (!response.data) {
      throw new Error("Invalid response from server");
    }

    // --- Return Data ---
    return {
      success: true,
      data: response.data.tasks || response.data,
    };
  } catch (error) {
    console.error("getAllTasks - Error fetching tasks:", error);

    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
        // Refresh the token
        const newToken = await refreshToken(refreshTokenValue);

        if (!newToken) throw new Error('Unable to refresh token.');

        // Retry the original request with new token
        const retryResponse = await axios.delete(`${API_URL}/task/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json'
            }
        });
        return retryResponse.data;
    }
  }
};

export default getAllTasks;
