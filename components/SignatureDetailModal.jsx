import React from "react";
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SignatureDetailModal = ({
  visible,
  onClose,
  signature = null,
  onImagePress,
}) => {
  if (!signature) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        {}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <TouchableOpacity
            onPress={onClose}
            className="p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">
            Signature Details
          </Text>
          <View className="w-8" />
        </View>

        {}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-4">
            <View className="mb-4 px-2">
              <View className="bg-white p-4">
                {}
                <View className="flex-row items-center mb-4">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: "black" }}
                  >
                    <Ionicons name="document-text" size={24} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-[#333]">
                      Contract for Signature
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <View
                        className={`px-2 py-1 rounded-full ${
                          signature.status === "signed"
                            ? "bg-green-100"
                            : signature.status === "pending"
                              ? "bg-yellow-100"
                              : "bg-gray-100"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-medium ${
                            signature.status === "signed"
                              ? "text-green-800"
                              : signature.status === "pending"
                                ? "text-yellow-800"
                                : "text-gray-800"
                          }`}
                        >
                          {signature.status?.toUpperCase() || "UNKNOWN"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {}
                <View className="mb-4">
                  <Text className="text-[12px] font-semibold text-[#333] mb-2">
                    Document Title
                  </Text>
                  <Text className="text-[11px] text-[#333] bg-[#f8f9fa] p-3 rounded-lg">
                    {signature.title || "Contract for Signature"}
                  </Text>
                </View>

                {}
                {signature.notes && (
                  <View className="mb-4">
                    <Text className="text-[12px] font-semibold text-[#333] mb-2">
                      Instructions
                    </Text>
                    <Text className="text-[11px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                      {signature.notes}
                    </Text>
                  </View>
                )}

                {}
                {signature.requestedBy && (
                  <View className="mb-4">
                    <Text className="text-[12px] font-semibold text-[#333] mb-2">
                      Requested By
                    </Text>
                    <Text className="text-[11px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                      {signature.requestedBy?.name || signature.requestedBy}
                      {signature.requestedBy?.email &&
                        ` (${signature.requestedBy.email})`}
                    </Text>
                  </View>
                )}

                {}
                {signature.signatureFrom && (
                  <View className="mb-4">
                    <Text className="text-[12px] font-semibold text-[#333] mb-2">
                      Signature From
                    </Text>
                    <Text className="text-[11px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                      {signature.signatureFrom?.name || signature.signatureFrom}
                      {signature.signatureFrom?.email &&
                        ` (${signature.signatureFrom.email})`}
                    </Text>
                  </View>
                )}

                {}
                {signature.dueDate && (
                  <View className="mb-4">
                    <Text className="text-[12px] font-semibold text-[#333] mb-2">
                      Due Date
                    </Text>
                    <Text className="text-[11px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                      {new Date(signature.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {}
                {signature.createdAt && (
                  <View className="mb-4">
                    <Text className="text-[12px] font-semibold text-[#333] mb-2">
                      Created
                    </Text>
                    <Text className="text-[11px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                      {new Date(signature.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {}
                {signature.fileUrl && (
                  <View className="mb-4">
                    <Text className="text-[12px] font-semibold text-[#333] mb-2">
                      Document
                    </Text>

                    {}
                    {(() => {
                      const fileUrl = signature.fileUrl;
                      const isImage =
                        fileUrl &&
                        (fileUrl.toLowerCase().includes(".jpg") ||
                          fileUrl.toLowerCase().includes(".jpeg") ||
                          fileUrl.toLowerCase().includes(".png") ||
                          fileUrl.toLowerCase().includes(".gif") ||
                          fileUrl.toLowerCase().includes(".webp"));

                      if (isImage) {
                        return (
                          <TouchableOpacity
                            onPress={() => {
                              if (onImagePress) {
                                onImagePress(fileUrl);
                              }
                            }}
                            activeOpacity={0.9}
                          >
                            <View className="bg-[#f8f9fa] p-3 rounded-lg">
                              <Image
                                source={{ uri: fileUrl }}
                                className="w-full h-32 rounded-lg"
                                resizeMode="contain"
                                onError={() =>
                                  console.log("Failed to load image:", fileUrl)
                                }
                              />
                              <Text className="text-[10px] text-[#666] mt-2 text-center">
                                {signature.fileName || "Image"}
                                {signature.fileSize &&
                                  ` • ${(signature.fileSize / 1024 / 1024).toFixed(2)} MB`}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      } else {
                        return (
                          <Text className="text-[11px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                            {signature.fileUrl}
                            {signature.fileSize &&
                              ` • ${(signature.fileSize / 1024 / 1024).toFixed(2)} MB`}
                          </Text>
                        );
                      }
                    })()}
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default SignatureDetailModal;
