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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateProjectById } from "../../services/projects/updateProjectById";

export default function UpdateProjectModal({ 
  visible, 
  onClose, 
  project, 
  onSuccess 
}) {
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
  });
  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
    if (project) {
      setProjectData({
        name: project.name || "",
        description: project.description || "",
      });
      
      // Set start date if available, otherwise use current date
      if (project.startDate) {
        setStartDate(new Date(project.startDate));
      }
    }

    // Cleanup listeners
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
      // Set time to midnight (00:00:00) for consistency
      const newDate = new Date(selectedDate);
      newDate.setHours(0, 0, 0, 0);
      setStartDate(newDate);
    }
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
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to midnight for date-only comparison
    
    // Allow updating projects on the same date or in the future
    if (startDate < now) {
      Alert.alert('Error', 'Start date cannot be in the past');
      return;
    }

    const startDateISO = startDate.toISOString();

    setIsLoading(true);

    try {
      // Prepare the data for API call
      const updateData = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        startDate: startDateISO,
      };

      const response = await updateProjectById(project.id, updateData);

      Alert.alert("Success", "Project updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            onClose();
            if (onSuccess) onSuccess();
          },
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
        {/* Black Navbar */}
        <View className="bg-black px-4 py-3 flex-row items-center justify-between">
          <Text className="text-black text-[18px] font-semibold">Update Project</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View className="flex-1 p-5 items-center">
          <ScrollView
            className="flex-1 w-full max-w-md"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={dismissKeyboard}
          >
            <View className="mb-8 items-center">
              <Text className="text-[28px] font-bold text-[#333]">Update Project</Text>
              <Text className="text-[16px] text-[#666] text-center">Modify the details below to update your project</Text>
            </View>

            <View className="mb-5">
              {/* Project Name */}
              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="folder" size={20} color="black" style={{ marginRight: 8 }} />
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
                  <Ionicons name="document-text" size={20} color="black" style={{ marginRight: 8 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">Description *</Text>
                </View>
                <TextInput
                  className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                  placeholder="Describe your project"
                  value={projectData.description}
                  onChangeText={(value) => handleInputChange("description", value)}
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
                  <Ionicons name="calendar" size={20} color="black" style={{ marginRight: 8 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">Start Date *</Text>
                </View>
                <TouchableOpacity
                  className="flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text className="text-[16px] text-[#333] font-medium">
                    {startDate.toLocaleDateString()}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Fixed Action Button - Always positioned at bottom, hidden when keyboard is visible */}
          <View className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-5 bg-white items-center">
            <TouchableOpacity
              className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
              onPress={handleUpdateProject}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#ffffff" size="small" />
                </View>
              ) : (
                <Text className="text-white text-[16px] font-semibold">Update Project</Text>
              )}
            </TouchableOpacity>
          </View>

        {/* Date Picker */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={handleStartDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>
    </Modal>
  );
}
