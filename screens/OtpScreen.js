import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Keyboard,
  Dimensions,
  AppState,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { verifyOtp } from '../services/auth/VerifyOtp';
import { useAuth } from '../context/AuthContext';
import Logo from "../assets/Logo.svg"; // Import the SVG logo

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const Code = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { login } = useAuth();
  const emailOrPhone = route.params?.emailOrPhone || '';
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [appState, setAppState] = React.useState(AppState.currentState);

  React.useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - force re-render
        setAppState(nextAppState);
        // Force a small delay to ensure proper layout restoration
        setTimeout(() => {
          setAppState('active');
        }, 100);
      } else {
        setAppState(nextAppState);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  const handleContinue = async () => {
    Keyboard.dismiss(); // Dismiss keyboard before proceeding
    setLoading(true);
    try {
      const data = await verifyOtp(emailOrPhone, code.trim());
      console.log('Full response data:', data);

      // Use AuthContext to handle login
      await login(data);

      setLoading(false);
      setCode('');

      // Check user role and navigate accordingly
      const userRole = data.user?.role?.name;
      console.log('User role received:', userRole);
      let targetScreen = 'HomeScreen'; // Default to HomeScreen

      if (userRole === 'Owner') {
        targetScreen = 'HomeScreen';
      } else if (userRole === 'Employee') {
        targetScreen = 'HomeScreen';
      } else if (userRole === 'Manager') {
        targetScreen = 'HomeScreen';
      }
      // Other roles will default to HomeScreen

      console.log('Navigating to screen:', targetScreen);

      Alert.alert("Success", "OTP verified successfully!", [
        { text: "OK", onPress: () => navigation.navigate(targetScreen) }
      ]);

    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to verify OTP");
    }
  };


  return (
    <>
      {/* Background layer to ensure full coverage */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#FFFFFF',
          zIndex: 0,
        }}
      />

      {/* Main content layer */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#FFFFFF',
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
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: Platform.OS === 'android' ? -110 : -160,
            backgroundColor: '#FFFFFF',
          }}
        >
          <Logo width={90} height={90} />

          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.description}>
            Enter the code sent to your email or phone
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.continueButton,
              !code.trim() && styles.disabledButton
            ]}
            onPress={handleContinue}
            disabled={loading || !code.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: "#222",
  },
  description: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  email: {
    fontSize: 16,
    color: "#3557A6",
    textAlign: "center",
    marginBottom: 24,
    fontWeight: '600',
  },
  input: {
    width: "100%",
    height: 48,
    borderColor: "#E5E5E5",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: "#F9F9F9",
  },
  continueButton: {
    width: "100%",
    backgroundColor: "#222",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
});

export default Code;