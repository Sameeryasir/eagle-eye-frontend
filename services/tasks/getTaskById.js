import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";

export async function getTaskById(taskId) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      throw new Error("No token Found");
    }
    
    console.log('Fetching task with ID:', taskId);
    console.log('API URL:', `${API_URL}/tasks/${taskId}`);
    
    const response = await axios.get(`${API_URL}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching the Task:", error.response?.data || error.message);
    throw error;
  }
}
