import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from "../utils/tokenRefresh";

export async function getEmployeesAssignedToProject(projectId) {
  const token = await AsyncStorage.getItem("token");
  const refreshTokenValue = await AsyncStorage.getItem("refreshToken");

  if (!token) {
    throw new Error("No token found");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  try {
    const response = await axios.get(`${API_URL}/project/employeesassigned/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      const newToken = await refreshToken(refreshTokenValue);
      const retryResponse = await axios.get(`${API_URL}/project/employees/${projectId}`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
        },
      });
      return retryResponse.data;
    }
    throw err;
  } 
}      