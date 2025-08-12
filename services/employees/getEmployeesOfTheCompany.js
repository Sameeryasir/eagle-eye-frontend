import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";

export async function getEmployeesToAssignTask() {
  // Get token from storage
  const token = await AsyncStorage.getItem("token");

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

  } catch (error) {
    // Handle any errors
    throw new Error(error.response?.data?.message || "Failed to fetch employees");
  }
}
