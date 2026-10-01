// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { uploadImage } from "../services/images/uploadImage";
import { useUpdateProjectMutation } from "../hooks/queries";
import NoChangesDialog from "./NoChangesDialog";
import { Brand } from "../constants/brandColors";
import { useResponsiveLayout } from "../constants/responsiveLayout";

const DESC_MAX = 120;

export default function UpdateProjectModal({
  visible,
  onClose,
  project,
  onSuccess,
}) {
  const updateProjectMutation = useUpdateProjectMutation();
  const layout = useResponsiveLayout();
  const {
    width,
    insets,
    contentWidth,
    horizontalPad,
    titleSize,
    subtitleSize,
    bodySize,
    labelSize,
    captionSize,
    buttonTextSize,
    inputHeight,
    buttonPadY,
    fieldGap,
    radius,
    hitSize,
    isCompactHeight,
    isSmallPhone,
    isTablet,
    rs,
  } = layout;

  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
  });
  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [showNoChangesDialog, setShowNoChangesDialog] = useState(false);

  useEffect(() => {
    if (!visible || !project) return;

    setProjectData({
      name: (project.name || "").slice(0, 80),
      description: (project.description || "").slice(0, DESC_MAX),
    });
    setStartDate(
      project.startDate ? new Date(project.startDate) : new Date()
    );
    setOriginalImageUrl(project.imageUrl || null);
    setCoverImage(
      project.imageUrl
        ? { uri: project.imageUrl, isLocal: false }
        : null
    );
    setFocusedField(null);
    setShowStartDatePicker(false);
  }, [visible, project]);

  const handleInputChange = (field, value) => {
    setProjectData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStartDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowStartDatePicker(false);
    }
    if (event?.type === "dismissed") {
      setShowStartDatePicker(false);
      return;
    }
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(0, 0, 0, 0);
      setStartDate(newDate);
    }
  };

  const applyCoverAsset = (asset) => {
    if (!asset) return;
    setCoverImage({
      uri: asset.uri,
      name: asset.fileName || `project_${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
      isLocal: true,
    });
  };

  const pickCoverFromLibrary = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission Required",
          text2: "Allow photo access to add a project image",
          visibilityTime: 3000,
          topOffset: 80,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        applyCoverAsset(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking project image:", error);
      Toast.show({
        type: "error",
        text1: "Image Selection Failed",
        text2: "Could not open your photo library",
        visibilityTime: 3000,
        topOffset: 80,
      });
    }
  };

  const takeCoverPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission Required",
          text2: "Allow camera access to take a project photo",
          visibilityTime: 3000,
          topOffset: 80,
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        applyCoverAsset(result.assets[0]);
      }
    } catch (error) {
      console.error("Error taking project photo:", error);
      Toast.show({
        type: "error",
        text1: "Camera Failed",
        text2: "Could not open the camera",
        visibilityTime: 3000,
        topOffset: 80,
      });
    }
  };

  const pickCoverImage = () => {
    Alert.alert("Project image", "Add a cover photo for this project", [
      { text: "Take Photo", onPress: takeCoverPhoto },
      { text: "Choose from Library", onPress: pickCoverFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadCoverImage = async () => {
    if (!coverImage?.uri || !coverImage.isLocal) return null;

    const uploadResponse = await uploadImage([
      {
        uri: coverImage.uri,
        type: "image/jpeg",
        name: coverImage.name?.endsWith(".jpg")
          ? coverImage.name
          : `project_${Date.now()}.jpg`,
      },
    ]);
    const uploaded = uploadResponse?.images?.find((img) => img?.imageUrl);
    if (!uploaded?.imageUrl) {
      throw new Error("Image upload failed");
    }
    return uploaded.imageUrl;
  };

  const handleUpdateProject = async () => {
    if (!projectData.name.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Project name is required",
        visibilityTime: 3000,
        topOffset: 80,
      });
      return;
    }

    if (!projectData.description.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "A short description is required",
        visibilityTime: 3000,
        topOffset: 80,
      });
      return;
    }

    if (!project?.id) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: "Project ID is missing",
        visibilityTime: 3000,
        topOffset: 80,
      });
      return;
    }

    const originalStart = project.startDate
      ? new Date(project.startDate)
      : new Date();
    originalStart.setHours(0, 0, 0, 0);
    const currentStart = new Date(startDate);
    currentStart.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (
      currentStart.getTime() !== originalStart.getTime() &&
      currentStart < now
    ) {
      Toast.show({
        type: "error",
        text1: "Date Error",
        text2: "Start date cannot be in the past",
        visibilityTime: 3000,
        topOffset: 80,
      });
      return;
    }

    const name = projectData.name.trim();
    const description = projectData.description.trim();
    const imageChanged =
      !!coverImage?.isLocal ||
      (!coverImage && !!originalImageUrl);

    const fieldsChanged =
      (project.name || "") !== name ||
      (project.description || "") !== description ||
      originalStart.getTime() !== currentStart.getTime() ||
      imageChanged;

    if (!fieldsChanged) {
      setShowNoChangesDialog(true);
      return;
    }

    const projectPayload = {
      name,
      description,
      startDate: currentStart.toISOString(),
    };

    setIsLoading(true);

    try {
      if (coverImage?.isLocal) {
        try {
          projectPayload.imageUrl = await uploadCoverImage();
        } catch (uploadError) {
          console.error("Cover image upload failed:", uploadError);
          const uploadMessage =
            uploadError?.response?.data?.message ||
            uploadError?.message ||
            "Could not upload the cover image";
          Toast.show({
            type: "error",
            text1: "Image Upload Failed",
            text2: String(
              Array.isArray(uploadMessage)
                ? uploadMessage.join(", ")
                : uploadMessage
            ),
            visibilityTime: 4000,
            topOffset: 80,
          });
          return;
        }
      } else if (!coverImage && originalImageUrl) {
        projectPayload.imageUrl = "";
      }

      await updateProjectMutation.mutateAsync({
        projectId: project.id,
        projectData: projectPayload,
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error updating project:", error);

      let errorMessage = "Failed to update project. Please try again.";

      if (typeof error === "string") {
        errorMessage = error;
      } else if (Array.isArray(error)) {
        errorMessage = error.join(", ");
      } else if (error?.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(", ");
        } else {
          errorMessage = String(error.response.data.message);
        }
      } else if (error?.message === "Network Error") {
        errorMessage =
          "Cannot reach the server. Check Wi-Fi and that the backend is running.";
      } else if (error?.message) {
        errorMessage = String(error.message);
      }

      Toast.show({
        type: "error",
        text1: "Project Update Failed",
        text2: errorMessage,
        visibilityTime: 4000,
        topOffset: 80,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    const nameChanged = (project?.name || "") !== projectData.name.trim();
    const descChanged =
      (project?.description || "") !== projectData.description.trim();
    const imageTouched =
      coverImage?.isLocal ||
      (!coverImage && !!originalImageUrl) ||
      (coverImage &&
        !coverImage.isLocal &&
        coverImage.uri !== originalImageUrl);

    if (!nameChanged && !descChanged && !imageTouched) {
      onClose();
      return;
    }

    Alert.alert("Discard changes?", "Your edits will be lost.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onClose },
    ]);
  };

  const canSubmit =
    projectData.name.trim().length > 0 &&
    projectData.description.trim().length > 0 &&
    !isLoading;

  const formatDisplayDate = (date) =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const sidePad = isTablet
    ? Math.max(horizontalPad, 40)
    : isSmallPhone
      ? 16
      : Math.min(horizontalPad, 20);
  const formWidth = isTablet
    ? contentWidth
    : Math.max(width - sidePad * 2, 0);
  const fieldRadius = Math.max(radius - 2, 8);
  const footerPadBottom = Math.max(insets.bottom, 14);
  const descHeight = rs(isCompactHeight ? 72 : 80);

  const labelStyle = {
    fontSize: labelSize + 1,
    fontWeight: "600",
    color: Brand.inkSoft,
    marginBottom: rs(7),
    letterSpacing: 0.1,
  };

  const fieldShell = (field) => ({
    width: "100%",
    borderWidth: 1,
    borderColor: focusedField === field ? Brand.ink : Brand.line,
    backgroundColor:
      focusedField === field ? Brand.paper : Brand.paperSoft,
    borderRadius: fieldRadius,
  });

  const minPickerDate = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    return current < today ? current : today;
  })();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={[styles.root, { width }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View
            style={{
              width: "100%",
              paddingTop: Math.max(insets.top, 8),
              paddingHorizontal: sidePad,
              paddingBottom: rs(4),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: Brand.line,
            }}
          >
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                minWidth: hitSize,
                height: hitSize,
                alignItems: "flex-start",
                justifyContent: "center",
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: bodySize,
                  fontWeight: "500",
                  color: Brand.inkMuted,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontSize: rs(16),
                fontWeight: "700",
                color: Brand.ink,
                letterSpacing: -0.2,
              }}
            >
              Edit project
            </Text>

            <TouchableOpacity
              onPress={handleUpdateProject}
              disabled={!canSubmit}
              style={{
                minWidth: hitSize,
                height: hitSize,
                alignItems: "flex-end",
                justifyContent: "center",
                opacity: canSubmit ? 1 : 0.35,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Brand.ink} />
              ) : (
                <Text
                  style={{
                    fontSize: bodySize,
                    fontWeight: "700",
                    color: Brand.ink,
                  }}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={{
              width: "100%",
              paddingHorizontal: sidePad,
              paddingTop: isCompactHeight ? rs(18) : rs(24),
              paddingBottom: rs(28) + footerPadBottom,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => Keyboard.dismiss()}
          >
            <View
              style={{
                width: formWidth,
                maxWidth: "100%",
                alignSelf: "center",
              }}
            >
              <Text
                style={{
                  fontSize: isSmallPhone
                    ? rs(22)
                    : Math.min(titleSize - 2, rs(26)),
                  fontWeight: "700",
                  color: Brand.ink,
                  letterSpacing: -0.35,
                  marginBottom: rs(6),
                }}
              >
                Project details
              </Text>
              <Text
                style={{
                  fontSize: subtitleSize,
                  color: Brand.inkMuted,
                  lineHeight: subtitleSize * 1.4,
                  marginBottom: isCompactHeight ? rs(20) : rs(26),
                }}
              >
                Update the cover photo, name, short note, and start date.
              </Text>

              <View style={{ marginBottom: fieldGap + 4, width: "100%" }}>
                <Text style={labelStyle}>Cover image</Text>
                {coverImage?.uri ? (
                  <View style={styles.coverPreviewWrap}>
                    <Image
                      source={{ uri: coverImage.uri }}
                      style={styles.coverPreview}
                    />
                    <View style={styles.coverActions}>
                      <TouchableOpacity
                        style={styles.coverActionBtn}
                        onPress={pickCoverImage}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="camera-outline"
                          size={rs(16)}
                          color={Brand.ink}
                        />
                        <Text style={styles.coverActionText}>Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.coverActionBtn}
                        onPress={() => setCoverImage(null)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={rs(16)}
                          color={Brand.danger}
                        />
                        <Text
                          style={[
                            styles.coverActionText,
                            { color: Brand.danger },
                          ]}
                        >
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickCoverImage}
                    activeOpacity={0.8}
                    style={{
                      borderWidth: 1,
                      borderColor: Brand.line,
                      borderStyle: "dashed",
                      backgroundColor: Brand.paperSoft,
                      borderRadius: fieldRadius,
                      minHeight: rs(110),
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: rs(16),
                    }}
                  >
                    <View
                      style={{
                        width: rs(44),
                        height: rs(44),
                        borderRadius: rs(12),
                        backgroundColor: Brand.paper,
                        borderWidth: 1,
                        borderColor: Brand.line,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: rs(8),
                      }}
                    >
                      <Ionicons
                        name="image-outline"
                        size={rs(22)}
                        color={Brand.ink}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: bodySize - 1,
                        fontWeight: "600",
                        color: Brand.ink,
                      }}
                    >
                      Upload project image
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: captionSize,
                        color: Brand.inkMuted,
                      }}
                    >
                      Optional · take a photo or choose from library
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ marginBottom: fieldGap + 4, width: "100%" }}>
                <Text style={labelStyle}>
                  Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    fieldShell("name"),
                    {
                      paddingHorizontal: rs(14),
                      minHeight: inputHeight,
                      fontSize: bodySize,
                      color: Brand.ink,
                      paddingVertical: Platform.OS === "ios" ? rs(13) : rs(10),
                    },
                  ]}
                  placeholder="e.g. Oak Street remodel"
                  value={projectData.name}
                  onChangeText={(value) => handleInputChange("name", value)}
                  placeholderTextColor={Brand.inkFaint}
                  returnKeyType="next"
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  maxLength={80}
                />
              </View>

              <View style={{ marginBottom: fieldGap + 4, width: "100%" }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: rs(7),
                  }}
                >
                  <Text style={[labelStyle, { marginBottom: 0 }]}>
                    Short description <Text style={styles.required}>*</Text>
                  </Text>
                  <Text
                    style={{
                      fontSize: captionSize,
                      color: Brand.inkFaint,
                      fontWeight: "500",
                    }}
                  >
                    {projectData.description.length}/{DESC_MAX}
                  </Text>
                </View>
                <TextInput
                  style={[
                    fieldShell("description"),
                    {
                      paddingHorizontal: rs(14),
                      paddingTop: rs(10),
                      paddingBottom: rs(10),
                      height: descHeight,
                      fontSize: bodySize,
                      color: Brand.ink,
                      lineHeight: bodySize * 1.35,
                      textAlignVertical: "top",
                    },
                  ]}
                  placeholder="One-line summary"
                  value={projectData.description}
                  onChangeText={(value) =>
                    handleInputChange("description", value)
                  }
                  multiline
                  numberOfLines={2}
                  placeholderTextColor={Brand.inkFaint}
                  onFocus={() => setFocusedField("description")}
                  onBlur={() => setFocusedField(null)}
                  maxLength={DESC_MAX}
                />
              </View>

              <View style={{ width: "100%" }}>
                <Text style={labelStyle}>
                  Start date <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setShowStartDatePicker(true)}
                  activeOpacity={0.75}
                  style={[
                    fieldShell("date"),
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: rs(14),
                      minHeight: inputHeight,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={rs(18)}
                      color={Brand.inkMuted}
                      style={{ marginRight: rs(10) }}
                    />
                    <Text
                      style={{
                        fontSize: bodySize,
                        fontWeight: "500",
                        color: Brand.ink,
                      }}
                      numberOfLines={1}
                    >
                      {formatDisplayDate(startDate)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={rs(16)}
                    color={Brand.inkFaint}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View
            style={{
              width: "100%",
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: Brand.line,
              backgroundColor: Brand.paper,
              paddingHorizontal: sidePad,
              paddingTop: rs(12),
              paddingBottom: footerPadBottom,
            }}
          >
            <TouchableOpacity
              onPress={handleUpdateProject}
              disabled={!canSubmit}
              activeOpacity={0.85}
              style={{
                width: formWidth,
                maxWidth: "100%",
                alignSelf: "center",
                minHeight: rs(isCompactHeight ? 48 : 52),
                borderRadius: fieldRadius + 2,
                backgroundColor: Brand.ink,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: buttonPadY - 2,
                opacity: canSubmit ? 1 : 0.4,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color={Brand.onInk} size="small" />
              ) : (
                <Text
                  style={{
                    fontSize: buttonTextSize,
                    fontWeight: "700",
                    color: Brand.onInk,
                    letterSpacing: 0.15,
                  }}
                >
                  Save changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {Platform.OS === "ios" && (
          <Modal
            visible={showStartDatePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowStartDatePicker(false)}
          >
            <View style={styles.dateModalRoot}>
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setShowStartDatePicker(false)}
              />
              <View
                style={[
                  styles.dateModalCard,
                  {
                    width: Math.min(formWidth, 380),
                    maxWidth: "92%",
                    borderRadius: rs(14),
                  },
                ]}
              >
                <View style={styles.dateModalHeader}>
                  <Text
                    style={{
                      fontSize: rs(16),
                      fontWeight: "600",
                      color: Brand.ink,
                    }}
                  >
                    Start date
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={{
                        fontSize: rs(16),
                        fontWeight: "700",
                        color: Brand.ink,
                      }}
                    >
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="inline"
                  onChange={handleStartDateChange}
                  minimumDate={minPickerDate}
                  themeVariant="light"
                  accentColor={Brand.ink}
                  textColor={Brand.ink}
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === "android" && showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
            minimumDate={minPickerDate}
            accentColor={Brand.ink}
            textColor={Brand.ink}
          />
        )}

        <NoChangesDialog
          visible={showNoChangesDialog}
          onClose={() => setShowNoChangesDialog(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: Brand.paper,
  },
  flex: {
    flex: 1,
    width: "100%",
  },
  required: {
    color: Brand.danger,
  },
  coverPreviewWrap: {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Brand.paperSoft,
  },
  coverPreview: {
    width: "100%",
    height: 160,
    backgroundColor: Brand.line,
  },
  coverActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
    backgroundColor: Brand.paper,
  },
  coverActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coverActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.ink,
  },
  dateModalRoot: {
    flex: 1,
    backgroundColor: "rgba(35, 31, 32, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  dateModalCard: {
    backgroundColor: Brand.paper,
    width: "100%",
    overflow: "hidden",
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
});
