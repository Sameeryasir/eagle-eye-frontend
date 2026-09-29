// @ts-nocheck
import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Image,
  Animated,
  Easing,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function SplashScreen({ navigation, bootGate = false }) {
  const { isAuthenticated, isLoading } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (bootGate || !navigation) return;
    if (isLoading) return;

    const timer = setTimeout(() => {
      navigation.replace(isAuthenticated ? "HomeScreen" : "SignIn");
    }, 120);

    return () => clearTimeout(timer);
  }, [bootGate, isAuthenticated, isLoading, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden={!bootGate} barStyle="dark-content" />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require("../assets/icons/splash-icon.png")}
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
    width: 200,
    height: 130,
    borderRadius: 20,
    backgroundColor: "#ffffff22",
  },
});
