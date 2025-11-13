import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setupNotifications,
  clearExpoToken,
} from "../services/notifications/expoTokenService";
import {
  saveTokenToServer,
  removeTokenFromServer,
} from "../services/notifications/sendTokenToServer";

import { clearAllReduxStores } from "../store/utils/clearAllReduxStores";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const refreshToken = await AsyncStorage.getItem("refreshToken");

      const userRole = await AsyncStorage.getItem("userRole");
      const firstName = await AsyncStorage.getItem("userFirstName");
      const lastName = await AsyncStorage.getItem("userLastName");
      const userId = await AsyncStorage.getItem("userId");
      const expoToken = await AsyncStorage.getItem("expoPushToken");

      if (token && refreshToken) {
        setIsAuthenticated(true);
        setUserRole(userRole);
        setUserInfo({
          firstName: firstName,
          lastName: lastName,
          role: userRole,
          id: userId,
        });
        setExpoPushToken(expoToken);
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        setUserInfo(null);
        setExpoPushToken(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);

      setIsAuthenticated(false);
      setUserRole(null);
      setUserInfo(null);
      setExpoPushToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData) => {
    try {
      console.log("🧹 Clearing Redux stores before login...");
      await clearAllReduxStores();

      await AsyncStorage.setItem("token", userData.access_token);
      await AsyncStorage.setItem("refreshToken", userData.refresh_token);

      await AsyncStorage.setItem("userRole", userData.user?.role?.name);
      await AsyncStorage.setItem("userFirstName", userData.user?.first_name);
      await AsyncStorage.setItem("userLastName", userData.user?.last_name);
      await AsyncStorage.setItem("userId", userData.user?.id?.toString());

      const notificationResult = await setupNotifications();
      if (notificationResult.success) {
        setExpoPushToken(notificationResult.token);
        await AsyncStorage.setItem("expoPushToken", notificationResult.token);
        console.log("🔔 Expo Push Token:", notificationResult.token);

        try {
          const saveResult = await saveTokenToServer(notificationResult.token);
          if (saveResult.success && saveResult.data) {
            const tokenId = saveResult.data.id || saveResult.data.tokenId;
            console.log("✅ Token saved to server with ID:", tokenId);
            await AsyncStorage.setItem("expoTokenId", tokenId.toString());
            console.log("💾 Token ID stored in AsyncStorage:", tokenId);
          } else {
            console.error(
              "❌ Failed to save token to server:",
              saveResult.error
            );
          }
        } catch (error) {
          console.error("❌ Error saving token to server:", error);
        }
      }

      setIsAuthenticated(true);
      setUserRole(userData.user?.role?.name);
      setUserInfo({
        firstName: userData.user?.first_name,
        lastName: userData.user?.last_name,
        role: userData.user?.role?.name,
        id: userData.user?.id?.toString(),
      });
      console.log(
        "✅ Login successful, Redux stores cleared, ready for fresh data"
      );
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const expoTokenId = await AsyncStorage.getItem("expoTokenId");
      if (expoTokenId) {
        console.log("Removing expo token from server:", expoTokenId);
        const removeResult = await removeTokenFromServer(expoTokenId);
        if (removeResult.success) {
          console.log("Successfully removed expo token from server");
        } else {
          console.error(
            "Failed to remove expo token from server:",
            removeResult.error
          );
        }
      } else {
        console.log("No expo token ID found to remove");
      }

      await AsyncStorage.multiRemove([
        "token",
        "refreshToken",
        "userRole",
        "userFirstName",
        "userLastName",
        "userId",
        "lastVisitedScreen",
        "expoPushToken",
        "expoTokenId",
      ]);

      await clearExpoToken();

      await clearAllReduxStores();

      setIsAuthenticated(false);
      setUserRole(null);
      setUserInfo(null);
      setExpoPushToken(null);
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  const value = {
    isAuthenticated,
    userRole,
    userInfo,
    expoPushToken,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
