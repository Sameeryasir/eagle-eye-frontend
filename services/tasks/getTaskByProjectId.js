import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";

export async function getTaskByProjectId(projectId) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      throw new Error("No token Found");
    }
    const response = await axios.get(`${API_URL}/project/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching the Project");
    throw error;
  }
}