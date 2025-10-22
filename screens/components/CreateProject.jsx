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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';

// --- Redux Integration (MCP Context 7) ---
// Import Redux hooks and actions for centralized project creation
import { useDispatch } from 'react-redux';
import { createProject } from '../../store/slices/projectSlice';

function CreateProject({ navigation, onSuccess, onCancel }) {
  // --- Redux Integration ---
  const dispatch = useDispatch();
  
  // --- Get screen dimensions for responsive design ---
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // More aggressive screen size detection for better responsive design
  const isVerySmallScreen = screenWidth < 380 || screenHeight < 650; // Very small devices (more aggressive)
  const isSmallScreen = screenWidth < 400 || screenHeight < 700; // Small devices
  const isMediumScreen = screenWidth < 450; // Medium devices
  const isLargeScreen = screenWidth >= 450; // Large devices
  
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
  });
  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  const handleInputChange = (field, value) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
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

  // --- Create Project Handler ---
  // Use Redux action for optimistic project creation
  const handleCreateProject = async () => {
    // Validate required fields
    if (!projectData.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Project name is required',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    if (!projectData.description.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Project description is required',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    // Validate and format dates
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to midnight for date-only comparison
    
    // Allow creating projects on the same date (today) or in the future
    if (startDate < now) {
      Toast.show({
        type: 'error',
        text1: 'Date Error',
        text2: 'Start date cannot be in the past',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    // Format date with local timezone
    const formatWithTimezone = (date) => {
      const offset = -date.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offset) / 60);
      const offsetMinutes = Math.abs(offset) % 60;
      const offsetSign = offset >= 0 ? '+' : '-';
      const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
      
      const isoString = date.toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '.').replace(' ', 'T');
      
      return `${isoString}${offsetString}`;
    };

    const startDateWithTimezone = formatWithTimezone(startDate);

    setIsLoading(true);
    
    try {
      // Prepare the data for API call
      const projectPayload = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        startDate: startDateWithTimezone,
      };

      // --- Use Redux Action for Project Creation ---
      // This will create the project and automatically update the UI
      await dispatch(createProject(projectPayload)).unwrap();
      
      // --- Show Success Toast Message ---
      Toast.show({
        type: 'success',
        text1: 'Project Created Successfully!',
        text2: 'Your new project has been added to the list',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      
      // Navigate back after a short delay to show the toast
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          navigation.goBack();
        }
      }, 1000);
    } catch (error) {
      console.error('Error creating project:', error);
      
      let errorMessage = 'Failed to create project. Please try again.';
      
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
        text1: 'Project Creation Failed',
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
          onPress: () => {
            if (onCancel) {
              onCancel();
            } else {
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <View 
      className={`flex-1 ${isVerySmallScreen ? 'bg-blue-50' : 'bg-white'}`} 
      style={{ 
        height: screenHeight,
        width: screenWidth,
        margin: 0,
        padding: 0
      }}
    >
      {/* Black Navbar - Responsive sizing */}
      <View className={`bg-black ${isVerySmallScreen ? 'px-3 py-2' : 'px-4 py-3'} flex-row items-center justify-between`}>
        <Text className={`text-black ${isVerySmallScreen ? 'text-[16px]' : 'text-[18px]'} font-semibold`}>
          Create Project
        </Text>
        <TouchableOpacity onPress={() => {
          if (onCancel) {
            onCancel();
          } else {
            navigation.goBack();
          }
        }}>
          <Ionicons name="close" size={isVerySmallScreen ? 20 : 24} color="white" />
        </TouchableOpacity>
      </View>
      
      <View className={`flex-1 ${isVerySmallScreen ? 'px-2' : 'px-5'} items-center`} style={{ 
        paddingBottom: isVerySmallScreen ? 0 : 20,
        minHeight: screenHeight - 120 // Account for navbar and button areas
      }}>
        <ScrollView
          className={`flex-1 w-full ${isVerySmallScreen ? 'max-w-sm' : 'max-w-md'}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingBottom: isVerySmallScreen ? 120 : isSmallScreen ? 100 : 20,
            paddingTop: 0,
            flexGrow: 1
          }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={dismissKeyboard}
          style={{ flex: 1 }}
        >
          <View className={`${isVerySmallScreen ? 'mb-3' : isSmallScreen ? 'mb-4' : 'mb-8'} items-center`}>
            <Text className={`${isVerySmallScreen ? 'text-[18px]' : isSmallScreen ? 'text-[24px]' : 'text-[28px]'} font-bold text-[#333]`}>
              Create New Project
            </Text>
            <Text className={`${isVerySmallScreen ? 'text-[12px]' : 'text-[16px]'} text-[#666] text-center`}>
              Fill in the details below to create your project
            </Text>
          </View>

          <View className={`${isVerySmallScreen ? 'mb-2' : isSmallScreen ? 'mb-3' : 'mb-5'}`}>
            {/* Project Name */}
            <View className={`${isVerySmallScreen ? 'mb-2' : isSmallScreen ? 'mb-3' : 'mb-5'}`}>
              <View className="flex-row items-center mb-2">
                <Ionicons name="folder" size={isVerySmallScreen ? 18 : 20} color="black" style={{ marginRight: 8 }} />
                <Text className={`${isVerySmallScreen ? 'text-[14px]' : 'text-[16px]'} font-semibold text-[#333]`}>
                  Project Name *
                </Text>
              </View>
              <TextInput
                className={`border border-[#e1e8ed] rounded-lg ${isVerySmallScreen ? 'p-2' : 'p-3'} ${isVerySmallScreen ? 'text-[14px]' : 'text-[16px]'} bg-[#f8f9fa] text-[#333]`}
                placeholder="Enter project name"
                value={projectData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholderTextColor="#999"
                returnKeyType="next"
              />
            </View>

            {/* Project Description */}
            <View className={`${isVerySmallScreen ? 'mb-2' : isSmallScreen ? 'mb-3' : 'mb-5'}`}>
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text" size={isVerySmallScreen ? 18 : 20} color="black" style={{ marginRight: 8 }} />
                <Text className={`${isVerySmallScreen ? 'text-[14px]' : 'text-[16px]'} font-semibold text-[#333]`}>
                  Description *
                </Text>
              </View>
              <TextInput
                className={`border border-[#e1e8ed] rounded-lg ${isVerySmallScreen ? 'p-2' : 'p-3'} ${isVerySmallScreen ? 'text-[14px]' : 'text-[16px]'} bg-[#f8f9fa] text-[#333] ${isVerySmallScreen ? 'h-20' : 'h-24'}`}
                placeholder="Describe your project"
                value={projectData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                multiline
                numberOfLines={isVerySmallScreen ? 3 : 4}
                placeholderTextColor="#999"
                returnKeyType="next"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Start Date */}
            <View className={`${isVerySmallScreen ? 'mb-3' : 'mb-5'}`}>
              <View className="flex-row items-center mb-2">
                <Ionicons name="calendar" size={isVerySmallScreen ? 18 : 20} color="black" style={{ marginRight: 8 }} />
                <Text className={`${isVerySmallScreen ? 'text-[14px]' : 'text-[16px]'} font-semibold text-[#333]`}>
                  Start Date *
                </Text>
              </View>
              <TouchableOpacity
                className={`flex-row items-center justify-between border border-[#e1e8ed] rounded-lg ${isVerySmallScreen ? 'p-2' : 'p-3'} bg-[#f8f9fa]`}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text className={`${isVerySmallScreen ? 'text-[14px]' : 'text-[16px]'} text-[#333] font-medium`}>
                  {startDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={isVerySmallScreen ? 14 : 16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Fixed Action Button - Always positioned at bottom - Responsive sizing */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <View className={`${isVerySmallScreen ? 'px-2' : 'px-5'} pt-4 items-center ${isVerySmallScreen ? 'pb-3' : isSmallScreen ? 'pb-4' : 'pb-6'}`}>
          <TouchableOpacity
            className={`w-full ${isVerySmallScreen ? 'max-w-[260px]' : 'max-w-[280px]'} bg-black rounded-lg ${isVerySmallScreen ? 'p-3' : 'p-4'} items-center justify-center`}
            onPress={handleCreateProject}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            ) : (
              <Text className={`text-white ${isVerySmallScreen ? 'text-[14px]' : 'text-[16px]'} font-semibold`}>
                Create Project
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          onChange={handleStartDateChange}
          minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
        />
      )}
    </View>
  );
}

export default CreateProject;