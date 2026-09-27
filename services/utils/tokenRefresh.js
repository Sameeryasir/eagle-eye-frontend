import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import { ApiRoutes } from "../api/routes";

export default async function refreshToken(refreshTokenValue) {
  try {
    if (!refreshTokenValue) {
      throw new Error("No refresh token found");
    }

    const response = await fetch(`${API_URL}${ApiRoutes.auth.refreshToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: refreshTokenValue,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();

    if (data.access_token) {
      await AsyncStorage.setItem("token", data.access_token);
    }
    if (data.refresh_token) {
      await AsyncStorage.setItem("refreshToken", data.refresh_token);
    }

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    throw error;
  }
}
