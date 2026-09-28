// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { updateTask } from '../services/tasks/updateTaskById';
import Toast from 'react-native-toast-message';
import HomeBottomNav from '../components/HomeBottomNav';

function UpdateTaskScreen({ navigation, route }) {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assignedTo: '',
  });
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Get task and projectId from route params
  const { task, projectId } = route.params || {};
  
  // Log task data for debugging
  console.log('UpdateTaskScreen - task:', task);
  console.log('UpdateTaskScreen - projectId:', projectId);

  useEffect(() => {
    // Initialize form with existing task data
    if (task) {
      setTaskData({
        title: task.title || '',
        description: task.description || '',
        assignedTo: task.assignedTo || '',
      });
      
      if (task.startTime) {
        setStartDateTime(new Date(task.startTime));
      }
      
      if (task.endTime) {
        setEndDateTime(new Date(task.endTime));
      }
    }

    // Add keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [task]);

  const handleInputChange = (field, value) => {
    setTaskData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(startDateTime.getHours());
      newDate.setMinutes(startDateTime.getMinutes());
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
      newDate.setHours(endDateTime.getHours());
      newDate.setMinutes(endDateTime.getMinutes());
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
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleUpdateTask = async () => {
    // Validate required fields
    if (!taskData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    if (!taskData.description.trim()) {
      Alert.alert('Error', 'Task description is required');
      return;
    }

    // Validate that task ID is available
    if (!task?.id) {
      Alert.alert('Error', 'Task ID is required to update a task');
      return;
    }

    // Validate and format dates
    const now = new Date();
    
    // Ensure start time is not in the past (allow current time for updates)
    if (startDateTime < now) {
      Alert.alert('Error', 'Start date and time cannot be in the past');
      return;
    }

    // Ensure end time is after start time
    if (endDateTime <= startDateTime) {
      Alert.alert('Error', 'End date and time must be after start date and time');
      return;
    }

    // Additional validation for reasonable time ranges
    const timeDifference = endDateTime.getTime() - startDateTime.getTime();
    const minDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    
    if (timeDifference < minDuration) {
      Alert.alert('Error', 'Task duration must be at least 15 minutes');
      return;
    }
    
    if (timeDifference > maxDuration) {
      Alert.alert('Error', 'Task duration cannot exceed 1 year');
      return;
    }

    // Use built-in toLocaleString for automatic timezone formatting (same as CreateEventModal)
    const formatWithTimezone = (date) => {
      // Get timezone offset automatically
      const timezoneOffset = date.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
      const offsetMinutes = Math.abs(timezoneOffset) % 60;
      const offsetSign = timezoneOffset <= 0 ? '+' : '-';
      const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
      
      // Use toLocaleString with ISO format for automatic formatting
      const isoString = date.toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      }).replace(' ', 'T');
      
      return `${isoString}${timezoneString}`;
    };

    const startTime = formatWithTimezone(startDateTime); // Local timezone format
    const endTime = formatWithTimezone(endDateTime); // Local timezone format

    setIsLoading(true);
    
    try {
      // Prepare the data for API call
      const taskPayload = {
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        startTime: startTime, // Local timezone format (e.g., 2025-10-21T20:34:00.000+05:00)
        endTime: endTime, // Local timezone format (e.g., 2025-10-21T21:34:00.000+05:00)
        projectId: projectId, // Include projectId if available
      };

      const response = await updateTask(task.id, taskPayload);
      
      Alert.alert(
        'Success',
        'Task updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error updating task:', error);
      
      let errorMessage = 'Failed to update task. Please try again.';
      
      // Handle different types of error responses
      if (error.response?.data?.message) {
        // If message is an array, join it, otherwise use as string
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(', ');
        } else {
          errorMessage = String(error.response.data.message);
        }
      } else if (error.message) {
        errorMessage = String(error.message);
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? All changes will be lost.',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 p-5">
        <View className="flex-1">
          <View className="mb-8 items-center">
            <Text className="text-[28px] font-bold text-[#333]">Update Task</Text>
            <Text className="text-[16px] text-[#666] text-center">Modify the task details below</Text>
          </View>

          <View className="mb-5">
            {/* Task Title */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons name="checkmark-circle" size={20} color="black" style={{ marginRight: 8 }} />
                <Text className="text-[16px] font-semibold text-[#333]">Task Title *</Text>
              </View>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                placeholder="Enter task title"
                value={taskData.title}
                onChangeText={(value) => handleInputChange('title', value)}
                placeholderTextColor="#999"
                returnKeyType="next"
              />
            </View>

            {/* Task Description */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text" size={20} color="black" style={{ marginRight: 8 }} />
                <Text className="text-[16px] font-semibold text-[#333]">Description *</Text>
              </View>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                placeholder="Describe your task"
                value={taskData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
                returnKeyType="next"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Start Date & Time */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons name="calendar" size={20} color="black" style={{ marginRight: 8 }} />
                <Text className="text-[16px] font-semibold text-[#333]">Start Date & Time *</Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text className="text-[16px] text-[#333] font-medium">
                    {startDateTime.toLocaleDateString()}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text className="text-[16px] text-[#333] font-medium">
                    {startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name="time-outline" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* End Date & Time */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons name="calendar" size={20} color="black" style={{ marginRight: 8 }} />
                <Text className="text-[16px] font-semibold text-[#333]">End Date & Time *</Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text className="text-[16px] text-[#333] font-medium">
                    {endDateTime.toLocaleDateString()}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text className="text-[16px] text-[#333] font-medium">
                    {endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name="time-outline" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons - Only show when keyboard is not visible */}
        {!isKeyboardVisible && (
          <View className="flex-row justify-between gap-4 pt-5 pb-5 bg-white">
            <TouchableOpacity
              className={`flex-1 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg p-4 items-center ${isLoading ? 'opacity-60' : ''}`}
              onPress={handleCancel}
              disabled={isLoading}
            >
              <Text className="text-[#6c757d] text-[16px] font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 bg-black rounded-lg p-4 items-center ${isLoading ? 'opacity-60' : ''}`}
              onPress={handleUpdateTask}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-white text-[16px] font-semibold">Update Task</Text>
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

      <HomeBottomNav keyboardVisible={isKeyboardVisible} />
    </View>
  );
}

/* Removed StyleSheet in favor of Tailwind classes */
 

export default UpdateTaskScreen;
