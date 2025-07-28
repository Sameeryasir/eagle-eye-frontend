import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { sendOtp } from "../services/auth/SendOtp";
import Logo from "../assets/Logo.svg"; // Import the SVG logo

const LogIn = () => {
  const navigation = useNavigation();
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await sendOtp(input.trim());
      setLoading(false);
      navigation.navigate("Verification Code", { emailOrPhone: input.trim() });
      setInput(""); // Clear the input after successful navigation
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to send OTP");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Image at the top */}
      <Logo width={90} height={90} />

      <Text style={styles.title}>Login</Text>
      <Text style={styles.description}>
        Enter your email or phone number to continue.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email or Phone Number"
        value={input}
        onChangeText={setInput}
        keyboardType="default"
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[
          styles.continueButton,
          !input.trim() && styles.disabledButton
        ]}
        onPress={handleContinue}
        disabled={loading || !input.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginTop: -110, // Shift content even more upward to align with SignIn
  },
  sharpImage: {
    width: 100,
    height: 100,
    marginBottom: 32,
  },
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
    marginBottom: 32,
    lineHeight: 20,
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

export default LogIn;
