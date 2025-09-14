// screens/SplashScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Image,
  Animated,
  Easing,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SplashScreen({ navigation }) {
  // This component handles splash screen animation and initial navigation routing
  const { isAuthenticated } = useAuth();

  // Animation values - only for logo
  const fadeAnim = useRef(new Animated.Value(0)).current; // opacity
  const scaleAnim = useRef(new Animated.Value(0.3)).current; // zoom-in (start very small)
  const pulseAnim = useRef(new Animated.Value(1)).current; // pulsing effect

  useEffect(() => {
    // Run logo fade + bounce
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse effect (looping scale) - starts after logo entrance
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1000); // Start pulsing after logo entrance completes

    // Navigation logic - check auth status after animation completes
    const checkAuthAndNavigate = async () => {
      try {
        // Wait for animation to complete (3.5 seconds total)
        setTimeout(async () => {
          // Check if user has valid tokens
          const token = await AsyncStorage.getItem('token');
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          
          if (token && refreshToken) {
            // User is authenticated, navigate to HomeScreen
            navigation.replace('HomeScreen');
          } else {
            // User is not authenticated, navigate to SignIn
            navigation.replace('SignIn');
          }
        }, 3500); // Wait 3.5 seconds for full animation
      } catch (error) {
        console.error('Navigation error:', error);
        // On error, go to sign in
        navigation.replace('SignIn');
      }
    };

    // Start navigation check
    checkAuthAndNavigate();
  }, [fadeAnim, scaleAnim, pulseAnim, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Animated Logo Only */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
          },
        ]}
      >
        <Image
            source={require("../../assets/icons/splash-icon.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoImage: {
    width: 270,
    height: 200,
    borderRadius: 20,
    backgroundColor: "#ffffff22",
  },
});