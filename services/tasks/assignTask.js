import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import refreshToken from '../utils/tokenRefresh';
export async function assignTaskToUser(taskId, userId) {
    let token = await AsyncStorage.getItem("token");
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

    if (!token) {
        throw new Error("No token found");
    }

    try {
        // Call the API endpoint that matches the controller
        // PUT /task/:id/assign with userId in body
        const response = await axios.put(`${API_URL}/task/${taskId}/assign`, {
            userId: userId  // This goes in the request body as expected by controller
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
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
            const retryResponse = await axios.put(`${API_URL}/task/${taskId}/assign`, {
                userId: userId
            }, {
                headers: {
                    Authorization: `Bearer ${newToken}`,
                    "Content-Type": "application/json",
                },
            });
            return retryResponse.data;
        }

        // Handle any errors
        console.error("Error assigning task to user:", err);

        // Handle specific backend validation errors
        if (err.response?.status === 400) {
            throw new Error(err.response.data?.message || "Invalid assignment - user must be Employee or Manager");
        }
        if (err.response?.status === 404) {
            throw new Error("Task not found");
        }
        if (err.response?.status === 403) {
            throw new Error("Access denied - insufficient permissions");
        }

        throw new Error(err.response?.data?.message || "Failed to assign task to user");
    }
}