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
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDispatch } from "react-redux";
import { updateProject } from "../store/slices/projectSlice";

import NoChangesDialog from "./NoChangesDialog";

export default function UpdateProjectModal({
  visible,
  onClose,
  project,
  onSuccess,
}) {
  const dispatch = useDispatch();

  const insets = useSafeAreaInsets();

  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
  });
  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showNoChangesDialog, setShowNoChangesDialog] = useState(false);

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

    if (project) {
      setProjectData({
        name: project.name || "",
        description: project.description || "",
      });

      if (project.startDate) {
        setStartDate(new Date(project.startDate));
      }
    }

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [project]);

  const handleInputChange = (field, value) => {
    setProjectData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(0, 0, 0, 0);
      setStartDate(newDate);
    }
  };

  const handleUpdateProject = async () => {
    if (!projectData.name.trim()) {
      Alert.alert("Error", "Project name is required");
      return;
    }

    if (!projectData.description.trim()) {
      Alert.alert("Error", "Project description is required");
      return;
    }

    if (!project?.id) {
      Alert.alert("Error", "Project ID is required to update a project");
      return;
    }

    const originalProject = {
      name: project.name || "",
      description: project.description || "",
      startDate: project.startDate ? new Date(project.startDate) : new Date(),
    };

    const currentProject = {
      name: projectData.name.trim(),
      description: projectData.description.trim(),
      startDate: startDate,
    };

    const projectPayload = {};

    if (originalProject.name !== currentProject.name) {
      projectPayload.name = currentProject.name;
    }

    if (originalProject.description !== currentProject.description) {
      projectPayload.description = currentProject.description;
    }

    if (
      originalProject.startDate.getTime() !== currentProject.startDate.getTime()
    ) {
      projectPayload.startDate = currentProject.startDate.toISOString();
    }

    const hasChanges = Object.keys(projectPayload).length > 0;

    if (!hasChanges) {
      setShowNoChangesDialog(true);
      return;
    }

    setIsLoading(true);

    try {
      await dispatch(
        updateProject({
          projectId: project.id,
          projectData: projectPayload,
        })
      ).unwrap();

      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error updating project:", error);

      let errorMessage = "Failed to update project. Please try again.";

      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(", ");
        } else {
          errorMessage = String(error.response.data.message);
        }
      } else if (error.message) {
        errorMessage = String(error.message);
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel",
      "Are you sure you want to cancel? All data will be lost.",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => onClose(),
        },
      ]
    );
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {}
        <View className="bg-black px-4 py-3 flex-row items-center justify-between">
          <Text className="text-black text-[18px] font-semibold">
            Update Project
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
                      Update Project
                    </Text>
                    <Text className="text-[16px] text-[#666] text-center">
                      Modify the details below to update your project
                    </Text>
                  </View>

                  <View className="mb-5">
                    {}
                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="folder"
                          size={20}
                          color="black"
                          style={{ marginRight: 8 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Project Name *
                        </Text>
                      </View>
                      <TextInput
                        className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                        placeholder="Enter project name"
                        value={projectData.name}
                        onChangeText={(value) =>
                          handleInputChange("name", value)
                        }
                        placeholderTextColor="#999"
                        returnKeyType="next"
                      />
                    </View>

                    {}
                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="document-text"
                          size={20}
                          color="black"
                          style={{ marginRight: 8 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Description *
                        </Text>
                      </View>
                      <TextInput
                        className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                        placeholder="Describe your project"
                        value={projectData.description}
                        onChangeText={(value) =>
                          handleInputChange("description", value)
                        }
                        multiline
                        numberOfLines={4}
                        placeholderTextColor="#999"
                        returnKeyType="next"
                        style={{ textAlignVertical: "top" }}
                      />
                    </View>

                    {}
                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="calendar"
                          size={20}
                          color="black"
                          style={{ marginRight: 8 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Start Date *
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Text className="text-[16px] text-[#333] font-medium">
                          {startDate.toLocaleDateString()}
                        </Text>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.key}
            />
          </View>
        </TouchableWithoutFeedback>

        {}
        <View className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-5 bg-transparent items-center">
          <TouchableOpacity
            className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
            onPress={handleUpdateProject}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View className="flex-row items-center ">
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            ) : (
              <Text className="text-white text-[16px] font-semibold">
                Update Project
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {}
        {Platform.OS === "ios" && (
          <Modal
            visible={showStartDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowStartDatePicker(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 20,
              }}
              activeOpacity={1}
              onPress={() => setShowStartDatePicker(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  width: "100%",
                  maxWidth: 350,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                {}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingTop: 20,
                    paddingBottom: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    Select Start Date
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(false)}
                    style={{
                      backgroundColor: "#000000",
                      paddingHorizontal: 20,
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>

                {}
                <View style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="inline"
                    onChange={handleStartDateChange}
                    minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}

        {}
        {Platform.OS === "android" && showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
            minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
          />
        )}

        {}
        <NoChangesDialog
          visible={showNoChangesDialog}
          onClose={() => setShowNoChangesDialog(false)}
        />
      </View>
    </Modal>
  );
}
