import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  setupNotifications,
  clearExpoToken,
} from "../services/notifications/expoTokenService";
import {
  saveTokenToServer,
  removeTokenFromServer,
} from "../services/notifications/sendTokenToServer";
import { clearAppCaches } from "../utils/clearAppCaches";
import {
  clearAuthSession,
  getAuthSnapshot,
  getUserInfoFromSession,
  hydrateAuthSession,
  isSessionAuthenticated,
  persistLoginSession,
  subscribeAuth,
  updateAuthProfile,
  updateExpoPushSession,
  type AuthSession,
  type LoginUserPayload,
  type SessionUserInfo,
} from "../services/auth/session";

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: string | null;
  userInfo: SessionUserInfo | null;
  user: SessionUserInfo | null;
  expoPushToken: string | null;
  login: (userData: LoginUserPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (args?: {
    firstName?: string | null;
    lastName?: string | null;
    role?: string | null;
  }) => Promise<SessionUserInfo | null>;
  checkAuthStatus: () => Promise<void>;
  isSessionAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

function snapshotToState(snapshot: AuthSession) {
  const authenticated = !!(snapshot.token && snapshot.refreshToken);
  return {
    isAuthenticated: authenticated,
    userRole: authenticated ? snapshot.userRole : null,
    userInfo: authenticated
      ? {
          firstName: snapshot.userFirstName,
          lastName: snapshot.userLastName,
          role: snapshot.userRole,
          id: snapshot.userId,
        }
      : null,
    expoPushToken: authenticated ? snapshot.expoPushToken : null,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<SessionUserInfo | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySnapshot = useCallback((snapshot: AuthSession) => {
    const next = snapshotToState(snapshot);
    setIsAuthenticated(next.isAuthenticated);
    setUserRole(next.userRole);
    setUserInfo(next.userInfo);
    setExpoPushToken(next.expoPushToken);
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const snapshot = await hydrateAuthSession();
      applySnapshot(snapshot);
    } catch (error) {
      console.error("Auth check error:", error);
      applySnapshot(getAuthSnapshot());
    } finally {
      setIsLoading(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    checkAuthStatus();
    return subscribeAuth((snapshot) => {
      applySnapshot(snapshot);
    });
  }, [applySnapshot, checkAuthStatus]);

  const login = useCallback(
    async (userData: LoginUserPayload) => {
      await clearAppCaches();
      await persistLoginSession(userData);

      const notificationResult = await setupNotifications();
      if (notificationResult.success) {
        await updateExpoPushSession({ token: notificationResult.token });

        try {
          const saveResult = await saveTokenToServer(notificationResult.token);
          if (saveResult.success && saveResult.data) {
            const tokenId = saveResult.data.id || saveResult.data.tokenId;
            await updateExpoPushSession({
              token: notificationResult.token,
              tokenId,
            });
          }
        } catch (error) {
          console.error("Error saving push token to server:", error);
        }
      }

      applySnapshot(getAuthSnapshot());
    },
    [applySnapshot]
  );

  const logout = useCallback(async () => {
    try {
      const { expoTokenId } = getAuthSnapshot();
      if (expoTokenId) {
        await removeTokenFromServer(expoTokenId);
      }
    } catch (error) {
      console.error("Failed to remove expo token from server:", error);
    }

    try {
      await clearExpoToken();
    } catch (error) {
      console.error("Failed to clear local expo token:", error);
    }

    await clearAuthSession();
    await clearAppCaches();
    applySnapshot(getAuthSnapshot());
  }, [applySnapshot]);

  const updateProfile = useCallback(
    async ({
      firstName,
      lastName,
      role,
    }: {
      firstName?: string | null;
      lastName?: string | null;
      role?: string | null;
    } = {}) => {
      await updateAuthProfile({ firstName, lastName, role });
      applySnapshot(getAuthSnapshot());
      return getUserInfoFromSession();
    },
    [applySnapshot]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isLoading,
      userRole,
      userInfo,
      user: userInfo,
      expoPushToken,
      login,
      logout,
      updateProfile,
      checkAuthStatus,
      isSessionAuthenticated,
    }),
    [
      checkAuthStatus,
      expoPushToken,
      isAuthenticated,
      isLoading,
      login,
      logout,
      updateProfile,
      userInfo,
      userRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
