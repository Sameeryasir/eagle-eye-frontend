import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

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
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [initialRoute, setInitialRoute] = useState('SignIn');

  useEffect(() => {
    // Prevent the splash screen from auto-hiding before app is ready
    SplashScreen.preventAutoHideAsync();
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('Starting authentication check...');

      // Check if token exists with longer timeout for development builds
      const timeoutDuration = __DEV__ ? 10000 : 5000; // 10 seconds for dev, 5 for production
      
      const token = await Promise.race([
        AsyncStorage.getItem('token'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AsyncStorage timeout')), timeoutDuration))
      ]);
      
      const refreshToken = await Promise.race([
        AsyncStorage.getItem('refreshToken'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AsyncStorage timeout')), timeoutDuration))
      ]);
      
      const storedUserRole = await AsyncStorage.getItem('userRole');
      const firstName = await AsyncStorage.getItem('userFirstName');
      const lastName = await AsyncStorage.getItem('userLastName');

      console.log('Auth check completed:', { hasToken: !!token, hasRefreshToken: !!refreshToken });

      if (token && refreshToken) {
        // Token exists, user is authenticated
        setIsAuthenticated(true);
        setUserRole(storedUserRole);
        setUserInfo({
          firstName,
          lastName,
          role: storedUserRole
        });

        // Set initial route to HomeScreen for all authenticated users
        setInitialRoute('HomeScreen');
        console.log('User authenticated, routing to HomeScreen');
      } else {
        // No tokens found, user needs to sign in
        setIsAuthenticated(false);
        setUserRole(null);
        setUserInfo(null);
        setInitialRoute('SignIn');
        console.log('No tokens found, routing to SignIn');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Fallback to sign in screen on any error
      setIsAuthenticated(false);
      setUserRole(null);
      setUserInfo(null);
      setInitialRoute('SignIn');
      console.log('Auth check failed, routing to SignIn');
    } finally {
      setIsLoading(false);
      console.log('Hiding splash screen...');
      // Hide the splash screen once authentication check is complete
      try {
        await SplashScreen.hideAsync();
        console.log('Splash screen hidden successfully');
      } catch (splashError) {
        console.error('Error hiding splash screen:', splashError);
        // Force hide splash screen if there's an error
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.error('Failed to force hide splash screen:', e);
        }
      }
    }
  };

  const login = async (userData) => {
    try {
      // Store tokens and user data
      if (userData.access_token) {
        await AsyncStorage.setItem('token', userData.access_token);
      }
      if (userData.refresh_token) {
        await AsyncStorage.setItem('refreshToken', userData.refresh_token);
      }
      if (userData.user?.role?.name) {
        await AsyncStorage.setItem('userRole', userData.user.role.name);
      }
      if (userData.user?.first_name) {
        await AsyncStorage.setItem('userFirstName', userData.user.first_name);
      }
      if (userData.user?.last_name) {
        await AsyncStorage.setItem('userLastName', userData.user.last_name);
      }

      // Update state
      setIsAuthenticated(true);
      setUserRole(userData.user?.role?.name);
      setUserInfo({
        firstName: userData.user?.first_name,
        lastName: userData.user?.last_name,
        role: userData.user?.role?.name
      });

      // Set initial route to HomeScreen for all authenticated users
      setInitialRoute('HomeScreen');
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Starting logout process...');

      // Clear all stored data
      await AsyncStorage.multiRemove([
        'token',
        'refreshToken',
        'userRole',
        'userFirstName',
        'userLastName',
        'userId',
        'lastVisitedScreen'
      ]);
      console.log('Tokens cleared from storage');

      // Update state
      setIsAuthenticated(false);
      setUserRole(null);
      setUserInfo(null);
      setInitialRoute('SignIn');
      console.log('Auth state updated');
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };



  const value = {
    isAuthenticated,
    isLoading,
    userRole,
    userInfo,
    initialRoute,
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
