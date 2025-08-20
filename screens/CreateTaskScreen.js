import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { createTask } from "../services/tasks/createTask";

function CreateTaskScreen({ navigation, route }) {
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    assignedTo: "",
  });
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Get projectId from route params if available
  const { projectId } = route.params || {};

  // Log projectId for debugging
  console.log("CreateTaskScreen - projectId:", projectId);

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

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleInputChange = (field, value) => {
    setTaskData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      // Set default time to 12 AM (00:00)
      newDate.setHours(0);
      newDate.setMinutes(0);
      setStartDateTime(newDate);

      // Ensure end date is not before start date
      if (newDate > endDateTime) {
        setEndDateTime(newDate);
      }
    }
  };

  const handleStartTimeChange = (event, selectedDate) => {
    setShowStartTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(startDateTime);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      setStartDateTime(newDate);

      // Ensure end date is not before start date
      if (newDate > endDateTime) {
        setEndDateTime(newDate);
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      // Set default time to 12 AM (00:00)
      newDate.setHours(0);
      newDate.setMinutes(0);
      setEndDateTime(newDate);
    }
  };

  const handleEndTimeChange = (event, selectedDate) => {
    setShowEndTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(endDateTime);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      setEndDateTime(newDate);
    }
  };

  const formatDateTime = (date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleCreateTask = async () => {
    // Validate required fields
    if (!taskData.title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }

    if (!taskData.description.trim()) {
      Alert.alert("Error", "Task description is required");
      return;
    }

    // Validate that projectId is available
    if (!projectId) {
      Alert.alert("Error", "Project ID is required to create a task");
      return;
    }

    // Validate and format dates
    const now = new Date();

    // Ensure start time is not in the past
    if (startDateTime <= now) {
      Alert.alert("Error", "Start date and time must be in the future");
      return;
    }

    // Ensure end time is after start time
    if (endDateTime <= startDateTime) {
      Alert.alert(
        "Error",
        "End date and time must be after start date and time"
      );
      return;
    }

    // Additional validation for reasonable time ranges
    const timeDifference = endDateTime.getTime() - startDateTime.getTime();
    const minDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

    if (timeDifference < minDuration) {
      Alert.alert("Error", "Task duration must be at least 15 minutes");
      return;
    }

    if (timeDifference > maxDuration) {
      Alert.alert("Error", "Task duration cannot exceed 1 year");
      return;
    }

    const startTime = startDateTime.toISOString();
    const endTime = endDateTime.toISOString();

    setIsLoading(true);

    try {
      // Prepare the data for API call
      const taskPayload = {
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        startTime: startTime,
        endTime: endTime,
        projectId: projectId, // Include projectId if available
      };

      const response = await createTask(taskPayload);

      Alert.alert("Success", "Task created successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error creating task:", error);

      let errorMessage = "Failed to create task. Please try again.";

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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-white">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View className="flex-1 p-5">
            <View className="flex-1">
              <View className="mb-8 items-center">
                <Text className="text-[28px] font-bold text-[#333]">
                  Create New Task
                </Text>
                <Text className="text-[16px] text-[#666] text-center">
                  Fill in the details below to create your task
                </Text>
              </View>

              <View className="mb-5">
                {/* Task Title */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="black"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-[16px] font-semibold text-[#333]">
                      Task Title *
                    </Text>
                  </View>
                  <TextInput
                    className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                    placeholder="Enter task title"
                    value={taskData.title}
                    onChangeText={(value) => handleInputChange("title", value)}
                    placeholderTextColor="#999"
                    returnKeyType="next"
                  />
                </View>

                {/* Task Description */}
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
                    placeholder="Describe your task"
                    value={taskData.description}
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

                {/* Start Date & Time */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="calendar"
                      size={20}
                      color="black"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-[16px] font-semibold text-[#333]">
                      Start Date & Time *
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Text className="text-[16px] text-[#333] font-medium">
                        {startDateTime.toLocaleDateString()}
                      </Text>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#666"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text className="text-[16px] text-[#333] font-medium">
                        {startDateTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      <Ionicons name="time-outline" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* End Date & Time */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="calendar"
                      size={20}
                      color="black"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-[16px] font-semibold text-[#333]">
                      End Date & Time *
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text className="text-[16px] text-[#333] font-medium">
                        {endDateTime.toLocaleDateString()}
                      </Text>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#666"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text className="text-[16px] text-[#333] font-medium">
                        {endDateTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      <Ionicons name="time-outline" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Button - Only show when keyboard is not visible */}
            {!keyboardVisible && (
              <View className="pt-5 pb-2.5 bg-white items-center">
                <TouchableOpacity
                  className={`bg-black rounded-lg items-center justify-center w-48 h-14 ${isLoading ? "opacity-60" : ""}`}
                  onPress={handleCreateTask}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text className="text-white text-[16px] font-semibold">
                      Create Task
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Date and Time Pickers */}
            {showStartDatePicker && (
              <DateTimePicker
                value={startDateTime}
                mode="date"
                onChange={handleStartDateChange}
                minimumDate={new Date()}
              />
            )}

            {showStartTimePicker && (
              <DateTimePicker
                value={startDateTime}
                mode="time"
                onChange={handleStartTimeChange}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={endDateTime}
                mode="date"
                onChange={handleEndDateChange}
                minimumDate={startDateTime}
              />
            )}

            {showEndTimePicker && (
              <DateTimePicker
                value={endDateTime}
                mode="time"
                onChange={handleEndTimeChange}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default CreateTaskScreen;
