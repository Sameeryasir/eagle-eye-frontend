import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {API_URL} from "@env";

export const updateTask = async (taskId, taskData) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await axios.put(`${API_URL}/task/${taskId}`, taskData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error updating task:", error);
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to update task");
    }
  }
};
