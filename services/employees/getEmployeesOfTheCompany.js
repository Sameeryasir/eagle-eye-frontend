import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from '@env';
import refreshToken from '../utils/tokenRefresh';

export async function getEmployeesToAssignTask() {
  let token = await AsyncStorage.getItem("token");
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  // If no token, stop here
  if (!token) {
    throw new Error("No token found");
  }

  try {
    // Call the API
    const response = await axios.get(`${API_URL}/task/assignTo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Return data from API
    return response.data;

  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // Refresh the token
      const newToken = await refreshToken(refreshTokenValue);

      if (!newToken) throw new Error('Unable to refresh token.');

      // Retry the original request with new token
      const retryResponse = await axios.get(`${API_URL}/task/assignTo`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });
      return retryResponse.data;
    }

    // Handle any errors
    throw new Error(err.response?.data?.message || "Failed to fetch employees");
  }
}
