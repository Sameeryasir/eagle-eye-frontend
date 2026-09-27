import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function DeleteLogModal({ visible, onClose, onConfirm, logTitle }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 20,
            width: "100%",
            maxWidth: 320,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View
            style={{
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#FEF2F2",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="warning" size={24} color="#EF4444" />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#1F2937",
                textAlign: "center",
                marginBottom: 4,
              }}
            >
              Delete Log
            </Text>
          </View>

          <Text
            style={{
              fontSize: 15,
              color: "#6B7280",
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 16,
            }}
          >
            Are you sure you want to delete this log permanently?
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: "#EF4444",
              textAlign: "center",
              fontWeight: "500",
              marginBottom: 20,
            }}
          >
            This action cannot be undone.
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#F3F4F6",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
              }}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#EF4444",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
              }}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "white",
                }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default DeleteLogModal;
