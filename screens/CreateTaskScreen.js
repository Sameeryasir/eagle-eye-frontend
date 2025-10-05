import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from "react-native-dropdown-picker";
import Toast from 'react-native-toast-message';

// --- Redux Integration (MCP Context 7) ---
import { useDispatch, useSelector } from 'react-redux';
import {
  createNewTask,
  fetchEmployeesForTaskAssignment,
  selectTaskCreating,
  selectTaskCreateError,
  selectEmployeesForAssignment,
} from '../store/slices/taskSlice';

function CreateTaskScreen({ navigation, route }) {
  // --- Redux State (MCP Context 7) ---
  const dispatch = useDispatch();
  const creating = useSelector(selectTaskCreating);
  const createError = useSelector(selectTaskCreateError);
  const employees = useSelector(selectEmployeesForAssignment);

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [showAssignedDropdown, setShowAssignedDropdown] = useState(false);
  const [isDropdownInteracting, setIsDropdownInteracting] = useState(false);
  const [flatListRef, setFlatListRef] = useState(null);
  
  // --- Smooth Animation References ---
  // Business Rule: Provide smooth UI transitions for better user experience
  const buttonPositionAnim = useRef(new Animated.Value(0)).current;
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const [priorityOptions] = useState([
    { id: 'low', label: 'Low', color: '#10B981' },
    { id: 'medium', label: 'Medium', color: '#F59E0B' },
    { id: 'high', label: 'High', color: '#EF4444' },
    { id: 'critical', label: 'Critical', color: '#DC2626' }
  ]);

  useEffect(() => {
    // --- Smooth Keyboard Animation Setup ---
    // Business Rule: Provide smooth transitions when keyboard shows/hides
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
        
        // Animate button position smoothly
        Animated.parallel([
          Animated.timing(buttonPositionAnim, {
            toValue: event.endCoordinates.height + 10,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(keyboardHeightAnim, {
            toValue: event.endCoordinates.height,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          })
        ]).start();
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
        
        // Animate button back to original position
        Animated.parallel([
          Animated.timing(buttonPositionAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(keyboardHeightAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          })
        ]).start();
      }
    );

    // Load employees when screen mounts using Redux
    dispatch(fetchEmployeesForTaskAssignment());

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Update filtered employees when Redux employees change
  useEffect(() => {
    if (employees && Array.isArray(employees)) {
      setFilteredEmployees(employees);
    }
  }, [employees]);

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

  // --- Smooth Dropdown Opening Function ---
  // Business Rule: Smoothly dismiss keyboard when opening dropdowns
  const openDropdown = (dropdownType) => {
    // Smoothly dismiss keyboard with animation
    Keyboard.dismiss();
    
    // Set dropdown interaction state to prevent scrolling conflicts
    setIsDropdownInteracting(true);

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

    // Description is now optional - no validation required

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

    try {
      // --- FIXED: Proper timezone handling for task creation ---
      // Business Rule: Use same timezone conversion approach as event and project handling
      // This ensures tasks created "today" appear on "today" in the calendar for all timezones
      
      // --- Convert to local timezone for date extraction (same as event/project handling) ---
      // This ensures the task appears on the correct calendar day
      const localStartDate = new Date(startDateTime);
      const localEndDate = endDateTime ? new Date(endDateTime) : null;
      
      // Extract the local dates in YYYY-MM-DD format (same as event/project conversion)
      const taskStartDate = localStartDate.getFullYear() + '-' + 
        String(localStartDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(localStartDate.getDate()).padStart(2, '0');
      
      const taskEndDate = localEndDate ? localEndDate.getFullYear() + '-' + 
        String(localEndDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(localEndDate.getDate()).padStart(2, '0') : null;

      // Prepare the data for Redux action
      const taskPayload = {
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        assignedToUserId: taskData.assignedTo?.id || null,
        priority: taskData.priority || null,
        startTime: startDateTime.toISOString(), // ISO 8601 string format
        minStartTime: minStartTime.toISOString(), // Send captured time for backend validation
        endTime: endDateTime ? endDateTime.toISOString() : null, // ISO 8601 string format
        projectId: projectId,
      };

      console.log('=== CreateTaskScreen Task Creation Debug ===');
      console.log('Original Start Time:', startDateTime.toLocaleString());
      console.log('Local Start Date:', localStartDate.toLocaleDateString());
      console.log('Task Start Date (YYYY-MM-DD):', taskStartDate);
      if (endDateTime) {
        console.log('Original End Time:', endDateTime.toLocaleString());
        console.log('Local End Date:', localEndDate.toLocaleDateString());
        console.log('Task End Date (YYYY-MM-DD):', taskEndDate);
      }
      console.log('Task Payload Being Sent:', taskPayload);
      console.log('=== End CreateTaskScreen Task Creation Debug ===');

      // Use Redux action to create task (MCP Context 7)
      const result = await dispatch(createNewTask(taskPayload));
      
      if (createNewTask.fulfilled.match(result)) {
        // Success - task created and added to Redux state automatically
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
      } else {
        // Error handling
        const errorMessage = result.payload || 'Failed to create task. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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
                    <Text className="text-[16px] font-semibold text-[#333]">Description (Optional)</Text>
                  </View>
                  <TextInput
                    className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                    placeholder="Describe your task (optional)"
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
                          // Smoothly dismiss keyboard when dropdown opens
                          Keyboard.dismiss();
                          setIsDropdownInteracting(true);
                          setPriorityOpen(true);
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
                    <Text className="text-[16px] font-semibold text-[#333]">End Date & Time (Optional)</Text>
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

      {/* Fixed Action Button - Smoothly animated position based on keyboard state */}
      <Animated.View
        className="absolute left-0 right-0 px-5 pt-5 pb-5 bg-transparent items-center"
        style={{
          bottom: buttonPositionAnim,
        }}
      >
        <TouchableOpacity
          className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
          onPress={handleCreateTask}
          disabled={creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <View className="flex-row items-center ">
              <ActivityIndicator color="#ffffff" size="small" />
            </View>
          ) : (
            <Text className="text-white text-[16px] font-semibold">Create Task</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

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
