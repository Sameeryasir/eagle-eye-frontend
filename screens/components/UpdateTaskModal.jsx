import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [endDateTime, setEndDateTime] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showAssignedDropdown, setShowAssignedDropdown] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
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
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
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
    setEmployeeSearchTerm(text);

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

    // Check which fields have changed and build payload with only changed fields
    const originalTask = {
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo || null,
      priority: task.priority || null,
      startTime: task.startTime ? new Date(task.startTime) : new Date(),
      endTime: task.endTime ? new Date(task.endTime) : new Date(),
    };

    const currentTask = {
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      assignedTo: taskData.assignedTo,
      priority: taskData.priority,
      startTime: startDateTime,
      endTime: endDateTime,
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

    // Check endTime changes
    if (originalTask.endTime.getTime() !== currentTask.endTime.getTime()) {
      taskPayload.endTime = currentTask.endTime.toISOString();
    }

    // Check if any changes were made
    const hasChanges = Object.keys(taskPayload).length > 0;

    if (!hasChanges) {
      Alert.alert('No Changes', 'No changes were made to the task.');
      return;
    }

    // Always include projectId for the API
    taskPayload.projectId = projectId;

    setIsLoading(true);
    
    try {
      const response = await updateTask(task.id, taskPayload);
      
      Alert.alert(
        'Success',
        'Task updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              if (onSuccess) onSuccess();
            }
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
          onPress: () => onClose()
        }
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
          <Text className="text-black text-[18px] font-semibold">Update Task</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
          if (showAssignedDropdown) {
            setShowAssignedDropdown(false);
            setEmployeeSearchTerm("");
            setFilteredEmployees(employees);
          }
          if (showPriorityDropdown) {
            setShowPriorityDropdown(false);
          }
        }}>
          <View className="flex-1 p-5 items-center">
            <ScrollView
              className="flex-1 w-full max-w-md"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={dismissKeyboard}
            >
            <View className="mb-8 items-center">
              <Text className="text-[28px] font-bold text-[#333]">Update Task</Text>
              <Text className="text-[16px] text-[#666] text-center">Modify the task details below</Text>
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
                <TouchableOpacity
                  className="flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                  onPress={() => {
                    setShowPriorityDropdown(!showPriorityDropdown);
                    setShowAssignedDropdown(false); // Close assigned dropdown
                  }}
                >
                  <Text className={`text-[16px] ${taskData.priority ? "text-[#333]" : "text-[#9ca3af]"}`}>
                    {taskData.priority ? priorityOptions.find(p => p.id === taskData.priority)?.label : "Select Priority"}
                  </Text>
                  <Ionicons 
                    name={showPriorityDropdown ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
              </View>

              {/* Assigned Employee Dropdown */}
              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="person" size={16} color="#374151" style={{ marginRight: 6 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">Assigned To</Text>
                </View>
                <TouchableOpacity
                  className="flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                  onPress={() => {
                    setShowAssignedDropdown(!showAssignedDropdown);
                    setShowPriorityDropdown(false); // Close priority dropdown
                  }}
                >
                  <Text className={`text-[16px] ${taskData.assignedTo ? "text-[#333]" : "text-[#9ca3af]"}`}>
                    {taskData.assignedTo
                      ? `${taskData.assignedTo.first_name || ""} ${taskData.assignedTo.last_name || ""}`.trim() ||
                        taskData.assignedTo.email
                      : "Select Employee"}
                  </Text>
                  <Ionicons 
                    name={showAssignedDropdown ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
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
                  <Ionicons name="calendar" size={16} color="#374151" style={{ marginRight: 6 }} />
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
          </ScrollView>
        </View>
        </TouchableWithoutFeedback>

        {/* Dropdowns */}
        {showAssignedDropdown && (
          <View 
            className="absolute bg-white border border-gray-300 rounded-lg shadow-lg"
            style={{
              top: 545,
              left: 20,
              right: 20,
              maxHeight: 200,
              elevation: 999999,
              zIndex: 999999,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            }}
          >
            {/* Search Bar */}
            <View className="p-2 border-b border-gray-200">
              <View className="flex-row items-center rounded-lg px-3 py-1.5 bg-gray-50 border border-gray-200">
                <Ionicons
                  name="search"
                  size={14}
                  color="#6B7280"
                  style={{ marginRight: 6 }}
                />
                <TextInput
                  className="flex-1 text-[13px] text-[#111827]"
                  placeholder="Search employees..."
                  placeholderTextColor="#9CA3AF"
                  value={employeeSearchTerm}
                  onChangeText={handleEmployeeSearch}
                  returnKeyType="search"
                  blurOnSubmit={false}
                />
                {employeeSearchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => handleEmployeeSearch("")} className="ml-2">
                    <Ionicons name="close-circle" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
      
            <ScrollView 
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              style={{ maxHeight: 160 }}
              contentContainerStyle={{ paddingVertical: 2 }}
            >
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <TouchableOpacity
                    key={employee.id}
                    className="px-3 py-3 border-b border-gray-100 active:bg-gray-50"
                                      onPress={() => {
                    handleInputChange('assignedTo', employee);
                    setShowAssignedDropdown(false);
                    setShowPriorityDropdown(false); // Close priority dropdown
                    setEmployeeSearchTerm("");
                    setFilteredEmployees(employees);
                  }}
                  >
                    <Text className="text-[15px] text-[#333] font-medium">
                      {`${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
                        employee.email}
                    </Text>
                    {employee.email && (
                      <Text className="text-[12px] text-[#666] mt-1">
                        {employee.email}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View className="px-3 py-4">
                  <Text className="text-[14px] text-[#666] text-center">
                    {employeeSearchTerm.trim() !== "" ? "No employees match your search" : "No employees available"}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {showPriorityDropdown && (
          <View 
            className="absolute bg-white border border-gray-300 rounded-lg shadow-lg"
            style={{
              top: 454,
              left: 20,
              right: 20,
              maxHeight: 200,
              elevation: 999999,
              zIndex: 999999,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            }}
          >
            <ScrollView 
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              style={{ maxHeight: 160 }}
              contentContainerStyle={{ paddingVertical: 2 }}
            >
              {priorityOptions.map((priority) => (
                <TouchableOpacity
                  key={priority.id}
                  className="px-3 py-3 border-b border-gray-100 active:bg-gray-50"
                  onPress={() => {
                    handleInputChange('priority', priority.id);
                    setShowPriorityDropdown(false);
                    setShowAssignedDropdown(false); // Close assigned dropdown
                  }}
                >
                  <View className="flex-row items-center">
                    <View 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: priority.color }}
                    />
                    <Text className="text-[15px] text-[#333] font-medium">
                      {priority.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Fixed Action Button - Always positioned at bottom, hidden when keyboard is visible */}
        {!keyboardVisible && (
          <View className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-8 bg-white items-center">
            <TouchableOpacity
              className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
              onPress={handleUpdateTask}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#ffffff" size="small" />
                </View>
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
    </Modal>
  );
}
