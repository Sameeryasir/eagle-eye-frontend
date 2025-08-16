import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if token exists
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const storedUserRole = await AsyncStorage.getItem('userRole');
      const firstName = await AsyncStorage.getItem('userFirstName');
      const lastName = await AsyncStorage.getItem('userLastName');

      if (token && refreshToken) {
        // Token exists, user is authenticated
        setIsAuthenticated(true);
        setUserRole(storedUserRole);
        setUserInfo({
          firstName,
          lastName,
          role: storedUserRole
        });
      } else {
        // No tokens found, user needs to sign in
        setIsAuthenticated(false);
        setUserRole(null);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserInfo(null);
    } finally {
      setIsLoading(false);
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
