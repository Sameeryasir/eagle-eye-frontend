import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

// --- Custom Error Dialog Component ---
// This component provides a consistent error dialog across the app
// Following MCP Context 7 best practices for clean, maintainable code
// Replaces system Alert.alert() with custom styled dialog
const ErrorDialog = ({ 
  visible, 
  onClose,
  title = "Error",
  message = "Something went wrong. Please try again.",
  buttonText = "OK"
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* --- Semi-transparent backdrop --- */}
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 20,
          width: '100%',
          maxWidth: 320,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 8,
        }}>
          {/* --- Error Icon --- */}
          <View style={{
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#FEF2F2', // Light red background
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Ionicons name="warning" size={24} color="#EF4444" />
            </View>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#1F2937',
              textAlign: 'center',
              marginBottom: 4,
            }}>
              {title}
            </Text>
          </View>

          {/* --- Error Message --- */}
          <Text style={{
            fontSize: 15,
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 20,
          }}>
            {message}
          </Text>

          {/* --- Action Button --- */}
          <TouchableOpacity
            style={{
              backgroundColor: '#EF4444', // Red button for error
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={{
              fontSize: 15,
              fontWeight: '600',
              color: 'white',
            }}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ErrorDialog;
