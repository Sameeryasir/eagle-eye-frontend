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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { verifyOtp } from '../services/auth/VerifyOtp';
import { useAuth } from '../context/AuthContext';
import Logo from "../assets/Logo.svg"; // Import the SVG logo

const Code = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { login } = useAuth();
  const emailOrPhone = route.params?.emailOrPhone || '';
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleContinue = async () => {
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
      } else if (userRole === 'Employee' || userRole === 'Manager') {
        targetScreen = 'WidgetScreen';
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
    <SafeAreaView style={styles.container}>
      {/* Image at the top */}
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