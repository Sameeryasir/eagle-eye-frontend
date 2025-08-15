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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { sendOtp } from "../services/auth/SendOtp";
import Logo from "../assets/Logo.svg"; // Import the SVG logo

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
      await sendOtp(input.trim());
      setLoading(false);
      navigation.navigate("OtpScreen", { emailOrPhone: input.trim() });
      setInput(""); // Clear the input after successful navigation
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to send OTP");
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
            paddingHorizontal: 24,
            paddingTop: Platform.OS === "android" ? -110 : -160,
            backgroundColor: "#FFFFFF",
          }}
        >
          <Logo width={90} height={90} />

          <Text className="text-[28px] font-bold text-center mb-3 text-[#222]">
            Login
          </Text>
          <Text className="text-sm text-[#888] text-center mb-8 leading-5">
            Enter your email or phone number to continue.
          </Text>
          <TextInput
            ref={textInputRef}
            className="w-full h-12 border border-[#E5E5E5] rounded-xl px-4 text-base mb-6 bg-[#F9F9F9]"
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
            className={`w-full ${isDisabled ? "bg-[#ccc]" : "bg-[#222]"} py-4 rounded-xl items-center`}
            onPress={handleContinue}
            disabled={isDisabled}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-lg font-semibold">Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default LogIn;
