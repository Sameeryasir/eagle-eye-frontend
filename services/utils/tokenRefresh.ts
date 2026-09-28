import { API_URL } from '../../config/api';
import { ApiRoutes } from '../api/routes';
import type { AuthTokensResponse } from '../api/models/auth';
import { ApiError } from '../api/errors';
import {
  clearAuthSession,
  getRefreshToken,
  updateAuthTokens,
} from '../auth/session';

export default async function refreshToken(
  refreshTokenValue?: string | null
): Promise<string> {
  try {
    const tokenToUse = refreshTokenValue || (await getRefreshToken());
    if (!tokenToUse) {
      throw new ApiError({ message: 'No refresh token found', status: 401 });
    }

    const response = await fetch(`${API_URL}${ApiRoutes.auth.refreshToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_URL.includes('ngrok')
          ? { 'ngrok-skip-browser-warning': 'true' }
          : {}),
      },
      body: JSON.stringify({
        refreshToken: tokenToUse,
      }),
    });

    if (!response.ok) {
      throw new ApiError({
        message: 'Failed to refresh token',
        status: response.status,
      });
    }

    const data = (await response.json()) as AuthTokensResponse;
    await updateAuthTokens({
      accessToken: data.access_token || undefined,
      refreshToken: data.refresh_token || undefined,
    });

    if (!data.access_token) {
      throw new ApiError({
        message: 'Refresh response missing access token',
        status: 401,
      });
    }

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    await clearAuthSession();
    throw error;
  }
}
