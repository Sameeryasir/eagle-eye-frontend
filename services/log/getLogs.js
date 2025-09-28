import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from "../utils/tokenRefresh";

export async function getLogs(projectId) {
  const token = await AsyncStorage.getItem("token");
  const refreshTokenValue = await AsyncStorage.getItem("refreshToken");

  if (!token) {
    throw new Error("No token found");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  try {
    console.log(`GetLogs Service - Making request to: ${API_URL}/log/${projectId}`);
    const response = await axios.get(`${API_URL}/log/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`GetLogs Service - Response received:`, response.data);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // refresh and retry once
      const newToken = await refreshToken(refreshTokenValue);
      const retryResponse = await axios.get(`${API_URL}/log/${projectId}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      return retryResponse.data;
    }
    
    // Provide more detailed error information
    if (axios.isAxiosError(err)) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to fetch logs";
      const status = err.response?.status;
      console.error(`GetLogs Service Error - Status: ${status}, Message: ${errorMessage}`);
      throw new Error(`Failed to fetch logs: ${errorMessage} (Status: ${status})`);
    }
    
    throw new Error(`Failed to fetch logs: ${err.message}`);
  }
}
