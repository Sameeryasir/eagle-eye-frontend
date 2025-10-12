import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupNotifications, clearExpoToken } from '../services/notifications/expoTokenService';
import { saveTokenToServer, removeTokenFromServer } from '../services/notifications/sendTokenToServer';
// Import cache clearing function for projects (MCP Context 7)
import { clearProjectsCache } from '../store/slices/projectSlice';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Show loading while checking auth

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Simple check: get tokens from storage
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      // Get user info
      const userRole = await AsyncStorage.getItem('userRole');
      const firstName = await AsyncStorage.getItem('userFirstName');
      const lastName = await AsyncStorage.getItem('userLastName');
      const userId = await AsyncStorage.getItem('userId');
      const expoToken = await AsyncStorage.getItem('expoPushToken');

      // If both tokens exist, user is logged in
      if (token && refreshToken) {
        setIsAuthenticated(true);
        setUserRole(userRole);
        setUserInfo({
          first_name: firstName,
          last_name: lastName,
          role: userRole,
          id: userId
        });
        setExpoPushToken(expoToken);
        // SplashScreen will handle navigation routing
      } else {
        // No tokens, user needs to login
        setIsAuthenticated(false);
        setUserRole(null);
        setUserInfo(null);
        setExpoPushToken(null);
        // SplashScreen will handle navigation routing
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // On error, go to sign in
      setIsAuthenticated(false);
      setUserRole(null);
      setUserInfo(null);
      setExpoPushToken(null);
      // SplashScreen will handle navigation routing
    } finally {
      // Always stop loading when done
      setIsLoading(false);
    }
  };

  const login = async (userData) => {
    try {
      // Store tokens
      await AsyncStorage.setItem('token', userData.access_token);
      await AsyncStorage.setItem('refreshToken', userData.refresh_token);
      
      // Store user info
      await AsyncStorage.setItem('userRole', userData.user?.role?.name);
      await AsyncStorage.setItem('userFirstName', userData.user?.first_name);
      await AsyncStorage.setItem('userLastName', userData.user?.last_name);
      await AsyncStorage.setItem('userId', userData.user?.id?.toString());

      // Setup notifications (optional)
      const notificationResult = await setupNotifications();
      if (notificationResult.success) {
        setExpoPushToken(notificationResult.token);
        await AsyncStorage.setItem('expoPushToken', notificationResult.token);
        console.log('🔔 Expo Push Token:', notificationResult.token);
        
        // Send to server and get token ID
        try {
          const saveResult = await saveTokenToServer(notificationResult.token);
          if (saveResult.success && saveResult.data) {
            const tokenId = saveResult.data.id || saveResult.data.tokenId;
            console.log('✅ Token saved to server with ID:', tokenId);
            await AsyncStorage.setItem('expoTokenId', tokenId.toString());
            console.log('💾 Token ID stored in AsyncStorage:', tokenId);
          } else {
            console.error('❌ Failed to save token to server:', saveResult.error);
          }
        } catch (error) {
          console.error('❌ Error saving token to server:', error);
        }
      }

      // Update state
      setIsAuthenticated(true);
      setUserRole(userData.user?.role?.name);
      setUserInfo({
        firstName: userData.user?.first_name,
        lastName: userData.user?.last_name,
        role: userData.user?.role?.name,
        id: userData.user?.id?.toString()
      });
      // Navigation will be handled by the current screen
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Get token ID and remove from server
      const expoTokenId = await AsyncStorage.getItem('expoTokenId');
      if (expoTokenId) {
        console.log('Removing expo token from server:', expoTokenId);
        const removeResult = await removeTokenFromServer(expoTokenId);
        if (removeResult.success) {
          console.log('Successfully removed expo token from server');
        } else {
          console.error('Failed to remove expo token from server:', removeResult.error);
        }
      } else {
        console.log('No expo token ID found to remove');
      }

      // Clear all stored data
      await AsyncStorage.multiRemove([
        'token',
        'refreshToken',
        'userRole',
        'userFirstName',
        'userLastName',
        'userId',
        'lastVisitedScreen',
        'expoPushToken',
        'expoTokenId'
      ]);
      
      // Clear Expo token from notification service
      await clearExpoToken();

      // --- Clear Projects Cache (MCP Context 7) ---
      // Clear cached project data when user logs out to prevent data leakage
      await clearProjectsCache();

      // Update state
      setIsAuthenticated(false);
      setUserRole(null);
      setUserInfo(null);
      setExpoPushToken(null);
      // Navigation will be handled by the current screen
    } catch (error) {
      console.error('Error during logout:', error);
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
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
