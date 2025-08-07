import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";

export async function createTask(taskData) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      throw new Error("No token Found");
    }
    
    const response = await axios.post(`${API_URL}/task/create`, taskData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    return response.data;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
}
