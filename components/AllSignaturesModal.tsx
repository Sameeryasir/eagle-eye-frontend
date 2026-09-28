// @ts-nocheck
import React from "react";
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const AllSignaturesModal = ({
  visible,
  onClose,
  signatures = [],
  isLoading = false,
  onSignaturePress,
}) => {
  const renderSignatureItem = ({ item }) => {
    const title = item.title || "Untitled Signature";
    const status = item.status || "pending";

    return (
      <TouchableOpacity
        className="mx-4 mb-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100"
        activeOpacity={0.7}
        onPress={() => {
          if (onSignaturePress) {
            onSignaturePress(item);
          }
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              className="text-base font-semibold text-gray-900"
              numberOfLines={2}
            >
              {title}
            </Text>
          </View>

          <View className="ml-3">
            <Ionicons
              name={status === "signed" ? "checkmark-circle" : "time"}
              size={24}
              color={status === "signed" ? "#10B981" : "#F59E0B"}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <TouchableOpacity
            onPress={onClose}
            className="p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">
            All Signatures
          </Text>
          <View className="w-8" />
        </View>

        <View className="flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#000000" />
              <Text className="text-base text-gray-500 mt-4">
                Loading signatures...
              </Text>
            </View>
          ) : signatures.length > 0 ? (
            <FlatList
              data={signatures}
              keyExtractor={(item) =>
                item.id?.toString() || Math.random().toString()
              }
              renderItem={renderSignatureItem}
              className="flex-1"
              contentContainerStyle={{ paddingVertical: 16 }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons name="create-outline" size={80} color="#C7C7CC" />
              <Text className="text-xl text-gray-500 mt-6 text-center font-medium">
                No signatures yet
              </Text>
              <Text className="text-base text-gray-400 mt-4 text-center">
                Signature requests in this chat will appear here
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default AllSignaturesModal;
