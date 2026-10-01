// What changed: splash shows only the Eagle Eye logo (no "EAGLE EYE" text), then routes on.
// Why: users were seeing SignIn brand text and treating it as the splash.
// Related: App.tsx LoadingScreen / initial SplashScreen route, assets/Logo.svg.
import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
} from "react-native";
import Logo from "../assets/Logo.svg";
import { useAuth } from "../context/AuthContext";

const SPLASH_HOLD_MS = 1600;

export default function SplashScreen({ navigation, bootGate = false }) {
  const { isAuthenticated, isLoading } = useAuth();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  useEffect(() => {
    // Boot gate is only a loading placeholder — App.tsx decides the next screen.
    if (bootGate || !navigation) return;
    if (isLoading) return;

    const timer = setTimeout(() => {
      navigation.replace(isAuthenticated ? "HomeScreen" : "SignIn");
    }, SPLASH_HOLD_MS);

    return () => clearTimeout(timer);
  }, [bootGate, isAuthenticated, isLoading, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Same brand logo used on SignIn — graphic only, no title text. */}
        <Logo width={140} height={140} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
