import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Text,
} from "react-native";
import LottieView from "lottie-react-native";
import Logo from "../assets/Logo.svg";
import { useAuth } from "../context/AuthContext";

const SPLASH_HOLD_MS = 2400;

export default function SplashScreen({ navigation, bootGate = false }) {
  const { isAuthenticated, isLoading } = useAuth();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const pulseScale = useRef(new Animated.Value(0.85)).current;
  const pulseOpacity = useRef(new Animated.Value(0.35)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslate, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.18,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 0.9,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.12,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.4,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [
    logoOpacity,
    logoScale,
    loaderOpacity,
    titleOpacity,
    titleTranslate,
    pulseScale,
    pulseOpacity,
  ]);

  useEffect(() => {
    if (bootGate || !navigation) return;
    if (isLoading) return;

    const timer = setTimeout(() => {
      navigation.replace(isAuthenticated ? "MainTabs" : "SignIn");
    }, SPLASH_HOLD_MS);

    return () => clearTimeout(timer);
  }, [bootGate, isAuthenticated, isLoading, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.pulse,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Logo width={140} height={140} />
        </Animated.View>

        <Animated.View
          style={[
            styles.titleWrap,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslate }],
            },
          ]}
        >
          <Text style={styles.title}>Eagle Eye</Text>
        </Animated.View>

        <Animated.View style={[styles.loaderWrap, { opacity: loaderOpacity }]}>
          <LottieView
            source={require("../assets/loader.json")}
            autoPlay
            loop
            style={styles.loader}
          />
        </Animated.View>
      </View>
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
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#E8EEF8",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  titleWrap: {
    marginTop: 18,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#231f20",
    letterSpacing: -0.3,
  },
  loaderWrap: {
    marginTop: 28,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    width: 56,
    height: 56,
  },
});
