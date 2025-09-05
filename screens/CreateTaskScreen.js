import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from "react-native-dropdown-picker";
import { createTask } from '../services/tasks/createTask';
import { getEmployeesToAssignTask } from '../services/employees/getEmployeesOfTheCompany';
import Toast from 'react-native-toast-message';

function CreateTaskScreen({ navigation, route }) {
  // Get projectId from route params if available
  const projectId = route?.params?.projectId;
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assignedTo: null,
    priority: null,
  });
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(null);
  const [minStartTime] = useState(() => {
    // --- Set minimum start time to current time rounded down to the minute ---
    // Business Rule: Allow tasks to start at the current minute or later
    const now = new Date();
    now.setSeconds(0, 0); // Round down to the minute (remove seconds and milliseconds)
    return now;
  });
  
  // --- Draft Task State Management ---
  // Business Rule: Create draft tasks that can be saved and edited later, just like ViewAllTasksScreen
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [draftTaskId, setDraftTaskId] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [showAssignedDropdown, setShowAssignedDropdown] = useState(false);
  const [isDropdownInteracting, setIsDropdownInteracting] = useState(false);
  const [flatListRef, setFlatListRef] = useState(null);
  const [priorityOptions] = useState([
    { id: 'low', label: 'Low', color: '#10B981' },
    { id: 'medium', label: 'Medium', color: '#F59E0B' },
    { id: 'high', label: 'High', color: '#EF4444' },
    { id: 'critical', label: 'Critical', color: '#DC2626' }
  ]);

  useEffect(() => {
    // Add keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    // Load employees when screen mounts
    loadEmployees();

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await getEmployeesToAssignTask();
      if (response && Array.isArray(response)) {
        setEmployees(response);
        setFilteredEmployees(response);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  // --- Draft Task Management Functions ---
  // Business Rule: Create and manage draft tasks like ViewAllTasksScreen
  const createDraftTask = () => {
    const now = new Date();
    now.setSeconds(0, 0); // Round down to the minute
    const newDraftTask = {
      id: Math.floor(Math.random() * 1000000) + 1, // Integer ID
      title: taskData.title || "",
      description: taskData.description || "",
      startTime: startDateTime,
      minStartTime: minStartTime, // Capture when draft was created for backend validation
      endTime: endDateTime, // Let user manually select end time
      assignedToUserId: taskData.assignedTo?.id || null,
      priority: taskData.priority || "low",
      isDraft: true,
    };
    
    setDraftTaskId(newDraftTask.id);
    setIsDraftMode(true);
    
    // --- Show Success Toast Message ---
    Toast.show({
      type: 'success',
      text1: 'Draft Saved!',
      text2: 'Your task has been saved as a draft',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 80,
    });
    
    return newDraftTask;
  };

  const handleEmployeeSearch = (text) => {
    if (text.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const searchLower = text.toLowerCase().trim();

      const filtered = employees.filter((employee) => {
        const firstName = (employee.first_name || "").toLowerCase();
        const lastName = (employee.last_name || "").toLowerCase();
        const email = (employee.email || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();

        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          fullName.includes(searchLower) ||
          email.includes(searchLower)
        );
      });

      setFilteredEmployees(filtered);
    }
  };

  // Function to handle dropdown opening
  const openDropdown = (dropdownType) => {
    // Close keyboard when opening any dropdown
    Keyboard.dismiss();

    // Close all other dropdowns
    setShowAssignedDropdown(false);
    setPriorityOpen(false);

    // Open the selected dropdown
    if (dropdownType === 'priority') {
      setPriorityOpen(true);
    } else if (dropdownType === 'assigned') {
      setShowAssignedDropdown(true);
    }
  };

  // Function to close all dropdowns
  const closeAllDropdowns = () => {
    setShowAssignedDropdown(false);
    setPriorityOpen(false);
    setIsDropdownInteracting(false);
  };

  const handleInputChange = (field, value) => {
    setTaskData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    // Only update if user selected a date (not cancelled)
    if (event.type === 'set' && selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(startDateTime.getHours());
      newDate.setMinutes(startDateTime.getMinutes());
      newDate.setSeconds(startDateTime.getSeconds());
      setStartDateTime(newDate);

      // Only update end date if it's before the new start date
      // This prevents automatic end date changes when start date is selected
      if (endDateTime && newDate > endDateTime) {
        // Keep the end date as is, user will need to manually adjust if needed
        // The validation in handleCreateTask will catch invalid date ranges
      }
    }
  };

  const handleStartTimeChange = (event, selectedDate) => {
    setShowStartTimePicker(false);
    // Only update if user selected a time (not cancelled)
    if (event.type === 'set' && selectedDate) {
      // Create a new date object based on the current start date
      const newDate = new Date(startDateTime);
      // Only update the time components, preserve the date
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setStartDateTime(newDate);

      // Only update end date if it's before the new start date
      // This prevents automatic end date changes when start time is selected
      if (endDateTime && newDate > endDateTime) {
        // Keep the end date as is, user will need to manually adjust if needed
        // The validation in handleCreateTask will catch invalid date ranges
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    // Only update if user selected a date (not cancelled)
    if (event.type === 'set' && selectedDate) {
      const newDate = new Date(selectedDate);
      // If endDateTime exists, preserve the time, otherwise set default time to 23:59
      if (endDateTime) {
        newDate.setHours(endDateTime.getHours());
        newDate.setMinutes(endDateTime.getMinutes());
        newDate.setSeconds(endDateTime.getSeconds());
      } else {
        newDate.setHours(23);
        newDate.setMinutes(59);
        newDate.setSeconds(0);
      }
      setEndDateTime(newDate);
    }
  };

  const handleEndTimeChange = (event, selectedDate) => {
    setShowEndTimePicker(false);
    // Only update if user selected a time (not cancelled)
    if (event.type === 'set' && selectedDate) {
      // If endDateTime exists, update the time on the existing date
      // If not, create a new date with current date and selected time
      const newDate = endDateTime ? new Date(endDateTime) : new Date();
      // Only update the time components, preserve the date
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setEndDateTime(newDate);
    }
  };

  const handleCreateTask = async () => {
    // Validate required fields
    if (!taskData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    if (!taskData.description.trim()) {
      Alert.alert('Error', 'Task description is required');
      return;
    }

    // --- Validation: Dates & Times (MCP Context 7) ---
    // Business Rule: Validate startTime >= minStartTime (when draft was created) and endTime > startTime

    // Ensure start time is not before the minimum start time (when draft was created)
    // Allow start time to be equal to minStartTime (same minute) with small buffer
    if (minStartTime && startDateTime < minStartTime) {
      Alert.alert(
        "Error",
        "Start time cannot be before the draft creation time"
      );
      return;
    }

    // Only validate end time if it's provided (optional field)
    if (endDateTime) {
      // Ensure end time is after start time
      if (endDateTime <= startDateTime) {
        Alert.alert(
          "Error",
          "End date and time must be after start date and time"
        );
        return;
      }

      // Additional validation for reasonable time ranges
      const timeDifference =
        endDateTime.getTime() - startDateTime.getTime();
      const minDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
      const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

      // Ensure end time is at least 15 minutes after start time
      if (timeDifference < minDuration) {
        Alert.alert("Error", "Task duration must be at least 15 minutes");
        return;
      }

      if (timeDifference > maxDuration) {
        Alert.alert("Error", "Task duration cannot exceed 1 year");
        return;
      }
    }

    // Validate that projectId is available
    if (!projectId) {
      Alert.alert('Error', 'Project ID is required to create a task');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare the data for API call
      const taskPayload = {
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        assignedToUserId: taskData.assignedTo?.id || null,
        priority: taskData.priority || null,
        startTime: startDateTime.toISOString(),
        minStartTime: minStartTime.toISOString(), // Send captured time for backend validation
        endTime: endDateTime ? endDateTime.toISOString() : null,
        projectId: projectId,
      };

      const response = await createTask(taskPayload);

      // --- Show Success Toast Message ---
      Toast.show({
        type: 'success',
        text1: 'Task Created Successfully!',
        text2: 'Your task has been created and saved',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });

      // Navigate back after a short delay to show the toast
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error creating task:', error);

      let errorMessage = 'Failed to create task. Please try again.';

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

      Alert.alert('Error', errorMessage); 332
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? All data will be lost.',
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
      {/* Black Navbar - Matching UpdateTaskModal */}

      <View className="flex-1 p-5 items-center">
        <FlatList
          className="flex-1 w-full max-w-md"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: keyboardVisible ? keyboardHeight + 120 : 20
          }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!isDropdownInteracting}
          data={[{ key: 'form' }]}
          renderItem={() => (
            <View>
              <View className="mb-8 items-center">
                <Text className="text-[16px] text-[#666] text-center">Fill in the details below to create your task</Text>
              </View>

              <View className="mb-5">
                {/* Task Title */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="document-text" size={16} color="#374151" style={{ marginRight: 6 }} />
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
                    <Ionicons name="chatbubble-ellipses" size={16} color="#374151" style={{ marginRight: 6 }} />
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

                {/* Priority Dropdown */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="flag" size={16} color="#374151" style={{ marginRight: 6 }} />
                    <Text className="text-[16px] font-semibold text-[#333]">Priority</Text>
                  </View>
                  <View style={{ zIndex: 9999 }}>
                    <DropDownPicker
                      open={priorityOpen}
                      value={taskData.priority || null}
                      items={priorityOptions.map((priority) => ({
                        label: priority.label,
                        value: priority.id,
                        icon: () => (
                          <View
                            className="w-3 h-3 rounded-full ml-1"
                            style={{ backgroundColor: priority.color }}
                          />
                        ),
                      }))}
                      setOpen={(open) => {
                        if (open) {
                          openDropdown('priority');
                        } else {
                          setPriorityOpen(false);
                          setIsDropdownInteracting(false);
                        }
                      }}
                      setValue={(callback) => {
                        const newValue = callback(taskData.priority || null);
                        handleInputChange('priority', newValue);
                      }}
                      placeholder="Select Priority"
                      placeholderStyle={{
                        color: "#9ca3af",
                        fontSize: 16,
                        fontWeight: "400",
                      }}
                      style={{
                        backgroundColor: "#f8f9fa",
                        borderColor: "#e1e8ed",
                        borderRadius: 8,
                        minHeight: 0,
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                      }}
                      textStyle={{
                        fontSize: 16,
                        color: taskData.priority ? "#333" : "#9ca3af",
                        fontWeight: "400",
                      }}
                      dropDownContainerStyle={{
                        backgroundColor: "white",
                        borderColor: "#e5e7eb",
                        borderRadius: 8,
                        shadowColor: "#000",
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: 999999,
                        maxHeight: 160,
                        zIndex: 999999,
                      }}
                      listItemContainerStyle={{
                        height: 40,
                        paddingHorizontal: 12,
                      }}
                      listItemLabelStyle={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#333",
                      }}
                      arrowIconStyle={{
                        width: 16,
                        height: 16,
                        tintColor: "#6b7280",
                      }}
                      showArrowIcon={true}
                    />
                  </View>
                </View>



                {/* Start Date & Time */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="time" size={16} color="#374151" style={{ marginRight: 6 }} />
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
                      className={`flex-1 flex-row items-center justify-between border rounded-lg p-3 ${startDateTime ? 'border-[#e1e8ed] bg-[#f8f9fa]' : 'border-[#d1d5db] bg-[#f3f4f6]'
                        }`}
                      onPress={() => startDateTime && setShowStartTimePicker(true)}
                      disabled={!startDateTime}
                      activeOpacity={startDateTime ? 0.8 : 1}
                    >
                      <Text className={`text-[16px] font-medium ${startDateTime ? 'text-[#333]' : 'text-[#9ca3af]'
                        }`}>
                        {startDateTime ? startDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : "Select time"}
                      </Text>
                      <Ionicons name="time-outline" size={16} color={startDateTime ? "#666" : "#9ca3af"} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* End Date & Time */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="calendar" size={16} color="#374151" style={{ marginRight: 6 }} />
                    <Text className="text-[16px] font-semibold text-[#333]">End Date & Time *</Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text className="text-[16px] text-[#333] font-medium">
                        {endDateTime ? endDateTime.toLocaleDateString() : "No end date selected"}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text className="text-[16px] text-[#333] font-medium">
                        {endDateTime ? endDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : "No time"}
                      </Text>
                      <Ionicons name="time-outline" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.key}
        />
      </View>

      {/* Fixed Action Button - Positioned at bottom when keyboard is closed, at top of keyboard when open */}
      <View
        className={`absolute left-0 right-0 px-5 pt-5 pb-5 bg-transparent items-center ${keyboardVisible ? 'bottom-0' : 'bottom-0'
          }`}
        style={{
          bottom: keyboardVisible ? keyboardHeight + 10 : 0,
        }}
      >
        <TouchableOpacity
          className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
          onPress={handleCreateTask}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <View className="flex-row items-center ">
              <ActivityIndicator color="#ffffff" size="small" />
            </View>
          ) : (
            <Text className="text-white text-[16px] font-semibold">Create Task</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date and Time Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDateTime}
          mode="date"
          onChange={handleStartDateChange}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={startDateTime}
          mode="time"
          onChange={handleStartTimeChange}
          is24Hour={false}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDateTime || new Date()}
          mode="date"
          onChange={handleEndDateChange}
          minimumDate={startDateTime}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={endDateTime || new Date()}
          mode="time"
          onChange={handleEndTimeChange}
          is24Hour={false}
        />
      )}
    </View>
  );
}

export default CreateTaskScreen;
