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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { updateProjectById } from "../services/projects/updateProjectById";
import Toast from 'react-native-toast-message';
import HomeBottomNav from "../components/HomeBottomNav";

export default function UpdateProjectScreen({ navigation, route }) {
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Get the project data from navigation params
  const projectToUpdate = route?.params?.project;

  useEffect(() => {
    // Add keyboard listeners
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

    // Populate form with existing project data if available
    if (projectToUpdate) {
      const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        } catch (error) {
          return "";
        }
      };

      setProjectData({
        name: projectToUpdate.name || "",
        description: projectToUpdate.description || "",
        startDate: formatDateForInput(projectToUpdate.startDate),
        endDate: formatDateForInput(projectToUpdate.endDate),
      });
    }

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [projectToUpdate]);

  const handleInputChange = (field, value) => {
    setProjectData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateProject = async () => {
    // Validate required fields
    if (!projectData.name.trim()) {
      Alert.alert("Error", "Project name is required");
      return;
    }

    if (!projectData.description.trim()) {
      Alert.alert("Error", "Project description is required");
      return;
    }

    // Validate and format dates
    let startDate = null;
    let endDate = null;

    if (projectData.startDate.trim()) {
      try {
        // Convert MM/DD/YYYY to ISO 8601 format
        const [month, day, year] = projectData.startDate.split("/");
        startDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        ).toISOString();
      } catch (error) {
        Alert.alert(
          "Error",
          "Please enter a valid start date in MM/DD/YYYY format"
        );
        return;
      }
    }

    if (projectData.endDate.trim()) {
      try {
        // Convert MM/DD/YYYY to ISO 8601 format
        const [month, day, year] = projectData.endDate.split("/");
        endDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        ).toISOString();
      } catch (error) {
        Alert.alert(
          "Error",
          "Please enter a valid end date in MM/DD/YYYY format"
        );
        return;
      }
    }

    // Validate that end date is after start date if both are provided
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare the data for API call (without ID in body)
      const updateData = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        startDate: startDate,
        endDate: endDate,
      };

      const response = await updateProjectById(projectToUpdate.id, updateData);

      Alert.alert("Success", "Project updated successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error updating project:", error);

      let errorMessage = "Failed to update project. Please try again.";

      // Handle different types of error responses
      if (error.response?.data?.message) {
        // If message is an array, join it, otherwise use as string
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
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 p-5">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={dismissKeyboard}
        >
          <View className="mb-8 items-center">
            <Text className="text-[28px] font-bold text-[#333]">Update Project</Text>
            <Text className="text-[16px] text-[#666] text-center">
              Modify the details below to update your project
            </Text>
          </View>

          <View className="mb-5">
            {/* Project Name */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="folder"
                  size={20}
                  color="black"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-[16px] font-semibold text-[#333]">Project Name *</Text>
              </View>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                placeholder="Enter project name"
                value={projectData.name}
                onChangeText={(value) => handleInputChange("name", value)}
                placeholderTextColor="#999"
                returnKeyType="next"
              />
            </View>

            {/* Project Description */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="document-text"
                  size={20}
                  color="black"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-[16px] font-semibold text-[#333]">Description *</Text>
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
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Start Date */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="calendar"
                  size={20}
                  color="black"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-[16px] font-semibold text-[#333]">Start Date</Text>
              </View>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                placeholder="MM/DD/YYYY"
                value={projectData.startDate}
                onChangeText={(value) =>
                  handleInputChange("startDate", value)
                }
                placeholderTextColor="#999"
                returnKeyType="next"
              />
            </View>

            {/* End Date */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="calendar"
                  size={20}
                  color="black"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-[16px] font-semibold text-[#333]">End Date</Text>
              </View>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                placeholder="MM/DD/YYYY"
                value={projectData.endDate}
                onChangeText={(value) => handleInputChange("endDate", value)}
                placeholderTextColor="#999"
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Fixed Action Buttons — sit above footer tab bar */}
      {!keyboardVisible && (
        <View className="absolute bottom-[90px] left-0 right-0 flex-row justify-between gap-4 px-5 pt-5 pb-4 bg-white">
          <TouchableOpacity
            className={`flex-1 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg p-4 items-center ${isLoading ? 'opacity-60' : ''}`}
            onPress={handleCancel}
            disabled={isLoading}
          >
            <Text className="text-[#6c757d] text-[16px] font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 bg-black rounded-lg p-4 items-center ${isLoading ? 'opacity-60' : ''}`}
            onPress={handleUpdateProject}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-white text-[16px] font-semibold">Update Project</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <HomeBottomNav keyboardVisible={keyboardVisible} />
    </View>
  );
}
 
