import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from "react-native";

import Logo from "../assets/Logo.svg"; // Import the SVG logo
import { useNavigation } from "@react-navigation/native";

const SignIn = () => {
  const navigation = useNavigation(); // Get navigation object

  return (
    <SafeAreaView style={styles.container}>
      {/* Sharp image at the top */}
           <Logo width={90} height={90} />

      <Text style={styles.title}>Welcome to{"\n"}EagleEye</Text>
      <Text style={styles.description}>
  
      </Text>
      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.navigate("Login")} // Navigate to Login screen
      >
        <Text style={styles.loginButtonText}>Login</Text>
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
  loginButton: {
    width: "100%",
    backgroundColor: "#222",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  registerButton: {
    width: "100%",
    backgroundColor: "#E5E5E5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  registerButtonText: {
    color: "#222",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default SignIn;
