import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  Image,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import Toast from "react-native-toast-message";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
import { Ionicons } from "@expo/vector-icons";
import { uploadImage } from "../services/images/uploadImage";
import { updateLogById } from "../services/log/updateLogById";
import * as ImagePicker from "expo-image-picker";

const UpdateLogModal = ({ visible, onClose, log, onUpdate, userRole }) => {
  const [logNote, setLogNote] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [noChangesDialogVisible, setNoChangesDialogVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    if (visible && log) {
      console.log("UpdateLogModal - Initializing with log:", log);
      console.log("UpdateLogModal - log.description:", log.description);
      console.log("UpdateLogModal - log.note:", log.note);
      console.log("UpdateLogModal - log.images:", log.images);

      const noteText = log.description || log.note || "";
      console.log("UpdateLogModal - Setting logNote to:", noteText);
      setLogNote(noteText);
      setExistingImages(log.images || []);
      setSelectedImage(null);
    } else if (!visible) {
      console.log("UpdateLogModal - Modal closed, resetting form");
      setLogNote("");
      setExistingImages([]);
      setSelectedImage(null);
    }

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [visible, log]);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission Needed",
          text2: "Please grant camera roll permissions to select images",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newImage = {
          uri: result.assets[0].uri,
          id: Date.now() + Math.random(),
          name: result.assets[0].fileName || `image_${Date.now()}.jpg`,
          isNew: true,
        };
        setSelectedImage(newImage);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick image. Please try again.",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  const removeNewImage = () => {
    console.log("Removing selected image");
    setSelectedImage(null);
  };

  const handleUpdateLog = async () => {
    if (!logNote.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter a note for the log",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const currentNote = log.description || log.note || "";
      const newNote = logNote.trim();
      const hasNoteChange = currentNote !== newNote;
      const hasNewImage = selectedImage !== null;

      if (!hasNoteChange && !hasNewImage) {
        setNoChangesDialogVisible(true);
        return;
      }

      console.log("UpdateLogModal - Changes detected:", {
        noteChanged: hasNoteChange,
        newImage: hasNewImage,
      });

      if (hasNoteChange) {
        console.log("UpdateLogModal - Updating log note");
        const updateData = {
          note: newNote,
        };

        await updateLogById(log.id, updateData);
        console.log("UpdateLogModal - Log note updated successfully");
      }

      if (hasNewImage) {
        console.log(`UpdateLogModal - Handling upload for new image only`);
        await uploadNewImage(log.id);
      }

      Toast.show({
        type: "success",
        text1: "Log Updated Successfully!",
        text2: "Your log changes have been saved",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error("UpdateLogModal - Error updating log:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to update log. Please try again.";

      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: errorMessage,
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadNewImage = async (logId) => {
    setIsUploadingImages(true);

    try {
      if (selectedImage) {
        console.log(`UpdateLogModal - Regular upload for new image`);

        const formData = new FormData();
        formData.append("logId", logId);
        formData.append("image", {
          uri: selectedImage.uri,
          type: "image/jpeg",
          name: `new_image_${Date.now()}.jpg`,
        });

        const uploadResponse = await uploadImage(formData);

        console.log("UpdateLogModal - Upload response:", uploadResponse);

        const responseImages =
          uploadResponse.images ||
          uploadResponse.Image ||
          uploadResponse.data?.images ||
          uploadResponse.data?.Image;

        if (responseImages?.length > 0) {
          const successful = responseImages.filter((img) => !img.error);
          const failed = responseImages.filter((img) => img.error);

          console.log(
            `UpdateLogModal - Upload result: ${successful.length} successful, ${failed.length} failed`
          );

          if (failed.length > 0) {
            Toast.show({
              type: "warning",
              text1: "Partial Success",
              text2: `Uploaded ${successful.length} image(s), ${failed.length} failed.`,
              visibilityTime: 4000,
              autoHide: true,
              topOffset: 80,
            });
          } else {
            console.log("UpdateLogModal - Image uploaded successfully");
          }
        }
      }
    } catch (error) {
      console.error("UpdateLogModal - Image upload error:", error);
      Toast.show({
        type: "warning",
        text1: "Warning",
        text2: "Log updated but new image upload failed.",
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const renderImagePreview = (image, index, isExisting = false) => (
    <View key={image.id || index} style={{ marginRight: 12, marginBottom: 12 }}>
      <View
        style={{
          width: Math.min(80, screenWidth * 0.2),
          height: Math.min(80, screenWidth * 0.2),
          borderRadius: Math.min(8, screenWidth * 0.02),
          backgroundColor: "#f0f0f0",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Image
          source={{ uri: image.imageUrl || image.uri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />

        {!isExisting && (
          <TouchableOpacity
            onPress={removeNewImage}
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              backgroundColor: "rgba(220, 53, 69, 0.9)",
              borderRadius: 12,
              width: 24,
              height: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <Text
        style={{
          fontSize: Math.min(10, screenWidth * 0.025),
          color: "#666",
          textAlign: "center",
          marginTop: 4,
        }}
      >
        {isExisting ? `Existing ${index + 1}` : `New Image`}
      </Text>
    </View>
  );

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const closeNoChangesDialog = () => {
    setNoChangesDialogVisible(false);
  };

  console.log("UpdateLogModal render - visible:", visible);
  console.log("UpdateLogModal render - log:", log);
  console.log("UpdateLogModal render - userRole:", userRole);
  console.log("UpdateLogModal render - logNote state:", logNote);
  console.log("UpdateLogModal render - existingImages state:", existingImages);

  if (!log) {
    console.log("UpdateLogModal - no log provided, returning null");
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="bg-black px-4 py-3 flex-row items-center justify-between">
          <Text className="text-black text-[18px] font-semibold">
            Update Log
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View className="flex-1 p-5 items-center">
            <FlatList
              className="flex-1 w-full max-w-md"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              data={[{ key: "form" }]}
              renderItem={() => (
                <View>
                  <View className="mb-8 items-center">
                    <Text className="text-[28px] font-bold text-[#333]">
                      Update Log
                    </Text>
                    <Text className="text-[16px] text-[#666] text-center">
                      Modify the log details below
                    </Text>
                  </View>

                  <View className="mb-5">
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="document-text"
                        size={16}
                        color="#374151"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-[16px] font-semibold text-[#333]">
                        Note *
                      </Text>
                    </View>
                    <TextInput
                      className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                      placeholder="Enter updated note for the log..."
                      value={logNote}
                      onChangeText={setLogNote}
                      multiline
                      numberOfLines={4}
                      placeholderTextColor="#999"
                      style={{ textAlignVertical: "top" }}
                    />
                  </View>

                  {existingImages.length > 0 && (
                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="images"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Current Images ({existingImages.length})
                        </Text>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ flexDirection: "row" }}
                      >
                        {existingImages.map((image, index) =>
                          renderImagePreview(image, index, true)
                        )}
                      </ScrollView>
                    </View>
                  )}

                </View>
              )}
              keyExtractor={(item) => item.key}
            />
          </View>
        </TouchableWithoutFeedback>

        <View className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-5 bg-transparent items-center">
          <TouchableOpacity
            className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
            onPress={handleUpdateLog}
            disabled={isSubmitting || isUploadingImages}
            activeOpacity={0.8}
          >
            {isSubmitting || isUploadingImages ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            ) : (
              <Text className="text-white text-[16px] font-semibold">
                Update Log
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={noChangesDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeNoChangesDialog}
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
              padding: 24,
              alignItems: "center",
              maxWidth: 320,
              width: "100%",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "#FEF3C7",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="information-circle" size={32} color="#F59E0B" />
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: "#1F2937",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              No Changes Made
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: "#6B7280",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              No changes were made to the log. Please make some changes before
              updating.
            </Text>

            <TouchableOpacity
              onPress={closeNoChangesDialog}
              style={{
                backgroundColor: "#000000",
                paddingHorizontal: 32,
                paddingVertical: 12,
                borderRadius: 8,
                minWidth: 120,
                alignItems: "center",
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default UpdateLogModal;
