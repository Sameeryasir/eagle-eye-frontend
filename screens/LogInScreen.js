import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  Dimensions,
  StatusBar,
  AppState,
  ToastAndroid,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { sendOtp } from "../services/auth/SendOtp";
import Logo from "../assets/Logo.svg"; // Import the SVG logo
import Toast from 'react-native-toast-message';

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

const LogIn = () => {
  const navigation = useNavigation();
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [appState, setAppState] = React.useState(AppState.currentState);
  const textInputRef = React.useRef(null);

  React.useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground - force re-render
        setAppState(nextAppState);
        // Force a small delay to ensure proper layout restoration
        setTimeout(() => {
          setAppState("active");
        }, 100);
      } else {
        setAppState(nextAppState);
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [appState]);

  const handleContinue = async () => {
    Keyboard.dismiss(); // Dismiss keyboard before proceeding
    setLoading(true);
    try {
      // --- Get API Response Data ---
      const data = await sendOtp(input.trim());
      console.log('Send OTP API Response:', data);
      
      setLoading(false);
      
      // --- Show Success Toast Message ---
      Toast.show({
        type: 'success',
        text1: 'OTP Sent Successfully!',
        text2: 'Please check your email/phone for the verification code',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      
      // --- Success - Navigate to OTP screen ---
      navigation.navigate("OtpScreen", { emailOrPhone: input.trim() });
      setInput(""); // Clear the input after successful navigation
      
    } catch (error) {
      setLoading(false);
      console.log('Send OTP Error:', error);
      
      // --- Show Error Toast Message ---
      Toast.show({
        type: 'error',
        text1: 'Failed to Send OTP',
        text2: error.message || 'Please check your email/phone and try again',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  const isDisabled = loading || !input.trim();

  return (
    <>
      {/* Background layer to ensure full coverage */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#FFFFFF",
          zIndex: 0,
        }}
      />

      {/* Main content layer */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#FFFFFF",
          zIndex: 1,
        }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: Math.min(24, screenWidth * 0.06),
            paddingTop: Platform.OS === "android" ? -110 : -160,
            backgroundColor: "#FFFFFF",
            width: "100%",
            maxWidth: 400,
          }}
        >
          <Logo 
            width={Math.min(90, screenWidth * 0.22)} 
            height={Math.min(90, screenWidth * 0.22)} 
          />

          <Text 
            style={{
              fontSize: Math.min(28, screenWidth * 0.07),
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 12,
              color: "#222",
              marginTop: 20,
            }}
          >
            Login
          </Text>
          <Text 
            style={{
              fontSize: Math.min(14, screenWidth * 0.035),
              color: "#888",
              textAlign: "center",
              marginBottom: Math.min(32, screenHeight * 0.04),
              lineHeight: 20,
              paddingHorizontal: 20,
            }}
          >
            Enter your email or phone number to continue.
          </Text>
          <TextInput
            ref={textInputRef}
            style={{
              width: "100%",
              height: Math.min(48, screenHeight * 0.06),
              borderWidth: 1,
              borderColor: "#E5E5E5",
              borderRadius: 12,
              paddingHorizontal: 16,
              fontSize: Math.min(16, screenWidth * 0.04),
              marginBottom: 24,
              backgroundColor: "#F9F9F9",
            }}
            placeholder="Email or Phone Number"
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            keyboardType="default"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={{
              width: "100%",
              backgroundColor: isDisabled ? "#ccc" : "#222",
              paddingVertical: Math.min(16, screenHeight * 0.02),
              borderRadius: 12,
              alignItems: "center",
            }}
            onPress={handleContinue}
            disabled={isDisabled}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text 
                style={{
                  color: "white",
                  fontSize: Math.min(18, screenWidth * 0.045),
                  fontWeight: "600",
                }}
              >
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default LogIn;
