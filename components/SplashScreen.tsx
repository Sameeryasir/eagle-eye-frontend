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

export default function SplashScreen({ navigation }) {
  const { isAuthenticated } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
    }, 1000);

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigation.replace("HomeScreen");
      } else {
        navigation.replace("SignIn");
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, pulseAnim, navigation, isAuthenticated]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

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
