import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from "../utils/tokenRefresh";


export async function getLogsForOwnerRecent(projectId) {
  const token = await AsyncStorage.getItem("token");
  const refreshTokenValue = await AsyncStorage.getItem("refreshToken");

  if (!token) {
    throw new Error("No token found");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  try {
    console.log(`GetLogsForOwnerRecent Service - Making request to: ${API_URL}/log/owner/recent/${projectId}`);
    const response = await axios.get(`${API_URL}/log/owner/recent/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`GetLogsForOwnerRecent Service - Response received:`, response.data);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // refresh and retry once
      console.log(`GetLogsForOwnerRecent Service - Token expired, refreshing and retrying...`);
      const newToken = await refreshToken(refreshTokenValue);
      const retryResponse = await axios.get(`${API_URL}/log/owner/recent/${projectId}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      console.log(`GetLogsForOwnerRecent Service - Retry successful:`, retryResponse.data);
      return retryResponse.data;
    }
    
    // Provide more detailed error information
    if (axios.isAxiosError(err)) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to fetch recent logs for owner";
      const status = err.response?.status;
      console.error(`GetLogsForOwnerRecent Service Error - Status: ${status}, Message: ${errorMessage}`);
      throw new Error(`Failed to fetch recent logs: ${errorMessage} (Status: ${status})`);
    }
    
    throw new Error(`Failed to fetch recent logs: ${err.message}`);
  }
}
