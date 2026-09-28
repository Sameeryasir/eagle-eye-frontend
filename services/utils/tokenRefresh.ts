import { API_URL } from "../../config/api";
import { ApiRoutes } from "../api/routes";
import {
  clearAuthSession,
  getRefreshToken,
  updateAuthTokens,
} from "../auth/session";

export default async function refreshToken(
  refreshTokenValue?: string | null
): Promise<string> {
  try {
    const tokenToUse = refreshTokenValue || (await getRefreshToken());
    if (!tokenToUse) {
      throw new Error("No refresh token found");
    }

    const response = await fetch(`${API_URL}${ApiRoutes.auth.refreshToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_URL.includes("ngrok")
          ? { "ngrok-skip-browser-warning": "true" }
          : {}),
      },
      body: JSON.stringify({
        refreshToken: tokenToUse,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    await updateAuthTokens({
      accessToken: data.access_token || undefined,
      refreshToken: data.refresh_token || undefined,
    });

    if (!data.access_token) {
      throw new Error("Refresh response missing access token");
    }

    return data.access_token as string;
  } catch (error) {
    console.error("Error refreshing token:", error);
    await clearAuthSession();
    throw error;
  }
}
