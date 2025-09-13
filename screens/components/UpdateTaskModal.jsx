import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import NoChangesDialog from './NoChangesDialog';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from "react-native-dropdown-picker";
import { updateTask } from '../../services/tasks/updateTaskById';
import { getEmployeesToAssignTask } from '../../services/employees/getEmployeesOfTheCompany';

export default function UpdateTaskModal({ 
  visible, 
  onClose, 
  task, 
  projectId,
  onSuccess 
}) {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assignedTo: null,
    priority: null,
  });
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(null); // Start as null like CreateTaskScreen
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
  const [noChangesDialogVisible, setNoChangesDialogVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityOptions] = useState([
    { id: 'low', label: 'Low', color: '#10B981' },
    { id: 'medium', label: 'Medium', color: '#F59E0B' },
    { id: 'high', label: 'High', color: '#EF4444' },
    { id: 'critical', label: 'Critical', color: '#EF4444' } // Match CalenderDetailScreen color
  ]);

  useEffect(() => {
    // Add keyboard listeners with height tracking
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

    if (task) {
      setTaskData({
        title: task.title || '',
        description: task.description || '',
        assignedTo: task.assigned_to || task.assignedTo || null,
        priority: task.priority || null,
      });
      
      if (task.startTime) {
        setStartDateTime(new Date(task.startTime));
      }
      
      if (task.endTime) {
        setEndDateTime(new Date(task.endTime));
      } else {
        setEndDateTime(null); // Set to null when no end time, like CreateTaskScreen
      }
    }

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [task]);

  // Load employees when modal opens
  useEffect(() => {
    if (visible) {
      loadEmployees();
    }
  }, [visible]);

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

  const handleEmployeeSearch = (text) => {
    setSearchQuery(text);
    
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
    setIsSearching(false);
  };

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
      if (endDateTime && newDate > endDateTime) {
        // If end date exists but is before new start time, update end date to match start date
        setEndDateTime(newDate);
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    // Only update if user selected a date (not cancelled) - matching CreateTaskScreen
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
    // Only update if user selected a time (not cancelled) - matching CreateTaskScreen
    if (event.type === 'set' && selectedDate) {
      // Always preserve the original end date, only update the time components
      if (endDateTime) {
        // If endDateTime exists, preserve the existing date and only update time
        const newDate = new Date(endDateTime);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);
        
        // Validate that end time is not before start time
        if (newDate >= startDateTime) {
          setEndDateTime(newDate);
        } else {
          // Show error if end time is before start time
          Toast.show({
            type: 'error',
            text1: 'Invalid Time',
            text2: 'End time cannot be before start time',
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 80,
          });
        }
      } else {
        // If no endDateTime exists, use startDateTime date with selected time
        const newDate = new Date(startDateTime);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);
        setEndDateTime(newDate);
      }
    }
  };

  const handleUpdateTask = async () => {
    // Validate required fields
    if (!taskData.title.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Task title is required',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    if (!taskData.description.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Task description is required',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    // Validate that task ID is available
    if (!task?.id) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Task ID is required to update a task',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    // Validate that end time is not before start time
    if (endDateTime && endDateTime < startDateTime) {
      Toast.show({
        type: 'error',
        text1: 'Time Validation Error',
        text2: 'End time cannot be before start time. Please adjust your dates.',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    // Check which fields have changed and build payload with only changed fields
    const originalTask = {
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo || null,
      priority: task.priority || null,
      startTime: task.startTime ? new Date(task.startTime) : new Date(),
      endTime: task.endTime ? new Date(task.endTime) : null,
    };

    const currentTask = {
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      assignedTo: taskData.assignedTo,
      priority: taskData.priority,
      startTime: startDateTime,
      endTime: endDateTime, // Use endDateTime directly (null if not set)
    };

    // Build payload with only changed fields
    const taskPayload = {};

    // Check title changes
    if (originalTask.title !== currentTask.title) {
      taskPayload.title = currentTask.title;
    }

    // Check description changes
    if (originalTask.description !== currentTask.description) {
      taskPayload.description = currentTask.description;
    }

    // Check assignedTo changes
    if (originalTask.assignedTo?.id !== currentTask.assignedTo?.id) {
      taskPayload.assignedToUserId = currentTask.assignedTo?.id || null;
    }

    // Check priority changes
    if (originalTask.priority !== currentTask.priority) {
      taskPayload.priority = currentTask.priority;
    }

    // Check startTime changes
    if (originalTask.startTime.getTime() !== currentTask.startTime.getTime()) {
      taskPayload.startTime = currentTask.startTime.toISOString();
    }

    // Check endTime changes - matching CreateTaskScreen logic
    const originalEndTime = originalTask.endTime?.getTime() || null;
    const currentEndTime = currentTask.endTime?.getTime() || null;
    
    if (originalEndTime !== currentEndTime) {
      taskPayload.endTime = currentTask.endTime ? currentTask.endTime.toISOString() : null;
    }

    // Check if any changes were made
    const hasChanges = Object.keys(taskPayload).length > 0;

    if (!hasChanges) {
      setNoChangesDialogVisible(true);
      return;
    }

    // Always include projectId for the API
    taskPayload.projectId = projectId;

    setIsLoading(true);
    
    try {
      const response = await updateTask(task.id, taskPayload);
      
      // --- Show Success Toast Message ---
      Toast.show({
        type: 'success',
        text1: 'Task Updated Successfully!',
        text2: 'Your task changes have been saved',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      
      // Close modal after a short delay to allow toast to be visible
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1000);
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
      
      // --- Show Error Toast Message ---
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: errorMessage,
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Simply close the modal without confirmation dialog
    // Users can use the X button if they want to cancel
    onClose();
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    closeAllDropdowns();
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
          <Text className="text-black text-[18px] font-semibold">Update Task</Text>
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
              scrollEnabled={!isDropdownInteracting || isSearching}
              data={[{ key: 'form' }]}
              renderItem={() => (
              <View>
                <View className="mb-8 items-center">
                  <Text className="text-[28px] font-bold text-[#333]">Update Task</Text>
                  <Text className="text-[16px] text-[#666] text-center">Modify the task details below</Text>
                </View>

                <View className="mb-5">
                  {/* Task Title */}
                  <View className="mb-5">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="document-text" size={16} color="#374151" style={{ marginRight: 6 }} />
                      <Text className="text-[16px] font-semibold text-[#333]">Task Title</Text>
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
                      <Text className="text-[16px] font-semibold text-[#333]">Description</Text>
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

                  {/* Assigned Employee Dropdown */}
                  <View className="mb-5">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="person" size={16} color="#374151" style={{ marginRight: 6 }} />
                      <Text className="text-[16px] font-semibold text-[#333]">Assigned To</Text>
                    </View>
                    <DropDownPicker
                      open={showAssignedDropdown}
                      value={taskData.assignedTo?.id || null}
                      items={filteredEmployees.map((employee) => {
                        const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
                        let displayName = fullName ? `${fullName} - ${employee.email}` : employee.email;
                        
                        // Truncate if too long (max 40 characters)
                        if (displayName.length > 40) {
                          displayName = displayName.substring(0, 37) + "...";
                        }
                        
                        return {
                          label: displayName,
                          value: employee.id,
                        };
                      })}
                      setOpen={(open) => {
                        if (open) {
                          // Close priority dropdown if open
                          setPriorityOpen(false);
                          setIsDropdownInteracting(true);
                          setIsSearching(false);
                          // Don't dismiss keyboard when opening - let user search
                        } else {
                          setIsDropdownInteracting(false);
                          setIsSearching(false);
                        }
                        setShowAssignedDropdown(open);
                      }}
                      setValue={(callback) => {
                        const newValue = callback(taskData.assignedTo?.id || null);
                        const selectedEmployee = employees.find(emp => emp.id === newValue);
                        handleInputChange('assignedTo', selectedEmployee || null);
                      }}
                      placeholder="Select Employee"
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
                        color: taskData.assignedTo ? "#333" : "#9ca3af",
                        fontWeight: "400",
                      }}
                      labelProps={{
                        numberOfLines: 1,
                      }}
                      customItemContainerStyle={{
                        height: 40,
                      }}
                      customItemLabelStyle={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#333",
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
                        maxHeight: 200, // Keep consistent height regardless of keyboard state
                        zIndex: 999999,
                        // Position dropdown above keyboard when keyboard is visible
                        ...(keyboardVisible && {
                          marginBottom: keyboardHeight - 50, // Adjust position to stay above keyboard
                        }),
                      }}
                      listMode="SCROLLVIEW"
                      scrollViewProps={{
                        nestedScrollEnabled: true,
                        showsVerticalScrollIndicator: true,
                        onScrollBeginDrag: () => {
                          setIsDropdownInteracting(true);
                        },
                        onScrollEndDrag: () => {
                          if (showAssignedDropdown) {
                            setIsDropdownInteracting(true);
                          }
                        },
                        scrollEventThrottle: 16,
                        onTouchStart: () => {
                          setIsDropdownInteracting(true);
                        },
                        onTouchEnd: () => {
                          if (!showAssignedDropdown) {
                            setIsDropdownInteracting(false);
                          }
                        },
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
                      searchable={true}
                      searchPlaceholder="Search employees..."
                      searchTextInputStyle={{
                        borderColor: "#e5e7eb",
                        borderRadius: 6,
                        fontSize: 14,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                      }}
                      searchTextInputProps={{
                        placeholderTextColor: "#9ca3af",
                        returnKeyType: "search",
                        blurOnSubmit: false, // Keep focus for better UX
                        autoCorrect: false,
                        autoCapitalize: "none",
                        onFocus: () => {
                          setIsSearching(true);
                        },
                        onBlur: () => {
                          setIsSearching(false);
                        },
                      }}
                      onSearch={(text) => {
                        handleEmployeeSearch(text);
                      }}
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
                          borderColor: "#E5E7EB",
                          borderRadius: 12,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.15,
                          shadowRadius: 8,
                          elevation: 8,
                          maxHeight: 250,
                          zIndex: 1000,
                          borderWidth: 1,
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
                      <Text className="text-[16px] font-semibold text-[#333]">Start Date & Time</Text>
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
                          {startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </Text>
                        <Ionicons name="time-outline" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* End Date & Time - Matching CreateTaskScreen */}
                  <View className="mb-5">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="calendar" size={16} color="#374151" style={{ marginRight: 6 }} />
                      <Text className="text-[16px] font-semibold text-[#333]">End Date & Time</Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Text className="text-[16px] text-[#333] font-medium">
                          {endDateTime ? endDateTime.toLocaleDateString() : "Not selected"}
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
          </TouchableWithoutFeedback>



        {/* Fixed Action Button - Always positioned at bottom */}
        <View className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-5 bg-transparent items-center">
          <TouchableOpacity
            className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
            onPress={handleUpdateTask}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View className="flex-row items-center ">
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            ) : (
              <Text className="text-white text-[16px] font-semibold">Update Task</Text>
            )}
          </TouchableOpacity>
        </View>

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
            value={endDateTime || startDateTime}
            mode="date"
            onChange={handleEndDateChange}
            minimumDate={new Date()}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={endDateTime || startDateTime}
            mode="time"
            onChange={handleEndTimeChange}
          />
        )}

        {/* No Changes Dialog */}
        <NoChangesDialog
          visible={noChangesDialogVisible}
          onClose={() => setNoChangesDialogVisible(false)}
        />
      </View>
    </Modal>
  );
}
