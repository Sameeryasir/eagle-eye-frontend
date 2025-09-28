import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from "../utils/tokenRefresh";

/**
 * CHANGE SUMMARY (MCP Context 7):
 * - What: Created getLogsByProjectId service to fetch logs filtered by project ID
 * - Why: Backend route @Get('logs-filter/:id') requires this service for project-specific log filtering
 * - Dependencies: Backend API endpoint /log/logs-filter/:id expects projectId parameter
 */
export async function getLogsByProjectId(projectId) {
  const token = await AsyncStorage.getItem("token");
  const refreshTokenValue = await AsyncStorage.getItem("refreshToken");

  if (!token) {
    throw new Error("No token found");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  try {
    console.log(`GetLogsByProjectId Service - Making request to: ${API_URL}/task/logs-filter/${projectId}`);
    const response = await axios.get(`${API_URL}/log/logs-filter/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`GetLogsByProjectId Service - Response received:`, response.data);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // refresh and retry once
      console.log(`GetLogsByProjectId Service - Token expired, refreshing and retrying...`);
      const newToken = await refreshToken(refreshTokenValue);
      const retryResponse = await axios.get(`${API_URL}/log/logs-filter/${projectId}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      console.log(`GetLogsByProjectId Service - Retry successful:`, retryResponse.data);
      return retryResponse.data;
    }
    
    // Provide more detailed error information
    if (axios.isAxiosError(err)) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to fetch logs by project ID";
      const status = err.response?.status;
      console.error(`GetLogsByProjectId Service Error - Status: ${status}, Message: ${errorMessage}`);
      throw new Error(`Failed to fetch logs: ${errorMessage} (Status: ${status})`);
    }
    
    throw new Error(`Failed to fetch logs: ${err.message}`);
  }
}
