import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { createTask } from '../services/tasks/createTask';

function CreateTaskScreen({ navigation, route }) {
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Get projectId from route params if available
  const { projectId } = route.params || {};
  
  // Log projectId for debugging
  console.log('CreateTaskScreen - projectId:', projectId);

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

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

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

    // Validate that projectId is available
    if (!projectId) {
      Alert.alert('Error', 'Project ID is required to create a task');
      return;
    }

    // Validate and format dates
    const now = new Date();
    
    // Ensure start time is not in the past
    if (startDateTime <= now) {
      Alert.alert('Error', 'Start date and time must be in the future');
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
      
      Alert.alert(
        'Success',
        'Task created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
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
      
      Alert.alert('Error', errorMessage);
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
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.mainContainer}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Create New Task</Text>
              <Text style={styles.headerSubtitle}>Fill in the details below to create your task</Text>
            </View>

            <View style={styles.formContainer}>
              {/* Task Title */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="checkmark-circle" size={20} color="black" style={styles.labelIcon} />
                  <Text style={styles.label}>Task Title *</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter task title"
                  value={taskData.title}
                  onChangeText={(value) => handleInputChange('title', value)}
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>

              {/* Task Description */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="document-text" size={20} color="black" style={styles.labelIcon} />
                  <Text style={styles.label}>Description *</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe your task"
                  value={taskData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>


              {/* Start Date & Time */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="calendar" size={20} color="black" style={styles.labelIcon} />
                  <Text style={styles.label}>Start Date & Time *</Text>
                </View>
                <View style={styles.dateTimeContainer}>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, styles.dateButton]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={styles.dateTimeButtonText}>
                      {startDateTime.toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, styles.timeButton]}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={styles.dateTimeButtonText}>
                      {startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Ionicons name="time-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* End Date & Time */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="calendar" size={20} color="black" style={styles.labelIcon} />
                  <Text style={styles.label}>End Date & Time *</Text>
                </View>
                <View style={styles.dateTimeContainer}>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, styles.dateButton]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={styles.dateTimeButtonText}>
                      {endDateTime.toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, styles.timeButton]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={styles.dateTimeButtonText}>
                      {endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Ionicons name="time-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons - Only show when keyboard is not visible */}
          {!keyboardVisible && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.cancelButton, isLoading && styles.disabledButton]} 
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.createButton, isLoading && styles.disabledButton]} 
                onPress={handleCreateTask}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Create Task</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#333333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  dateButton: {
    flex: 2,
  },
  timeButton: {
    flex: 1,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default CreateTaskScreen;
