import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [userToken, setUserToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    // Check token in storage on app load
    const loadToken = async () => {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        setUserToken(token);
      } else {
        // Navigate to SignIn screen if no token found
        navigation.navigate("SignIn");
      }
      setLoading(false);
    };
    loadToken();
  }, [navigation]);

  const login = async (token) => {
    await AsyncStorage.setItem("token", token);
    setUserToken(token);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
