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
import { createProject } from '../../services/projects/createProject';
import Toast from 'react-native-toast-message';

function CreateProject({ navigation, onSuccess, onCancel }) {
  // --- Get screen dimensions for responsive design ---
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375 || screenHeight < 667; // iPhone SE and smaller
  
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

    const startDateISO = startDate.toISOString();

    setIsLoading(true);
    
    try {
      // Prepare the data for API call
      const projectPayload = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        startDate: startDateISO,
      };

      const response = await createProject(projectPayload);
      
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
    <View className="flex-1 bg-white">
      {/* Black Navbar */}
      <View className="bg-black px-4 py-3 flex-row items-center justify-between">
        <Text className="text-black text-[18px] font-semibold">Create Project</Text>
        <TouchableOpacity onPress={() => {
          if (onCancel) {
            onCancel();
          } else {
            navigation.goBack();
          }
        }}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <View className="flex-1 px-5 items-center" style={{ paddingBottom: isSmallScreen ? 0 : 20 }}>
        <ScrollView
          className="flex-1 w-full max-w-md"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingBottom: isSmallScreen ? 100 : 20,
            paddingTop: 0
          }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={dismissKeyboard}
        >
          <View className={`${isSmallScreen ? 'mb-4' : 'mb-8'} items-center`}>
            <Text className="text-[28px] font-bold text-[#333]">Create New Project</Text>
            <Text className="text-[16px] text-[#666] text-center">Fill in the details below to create your project</Text>
          </View>

          <View className={`${isSmallScreen ? 'mb-3' : 'mb-5'}`}>
            {/* Project Name */}
            <View className={`${isSmallScreen ? 'mb-3' : 'mb-5'}`}>
              <View className="flex-row items-center mb-2">
                <Ionicons name="folder" size={20} color="black" style={{ marginRight: 8 }} />
                <Text className="text-[16px] font-semibold text-[#333]">Project Name *</Text>
              </View>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                placeholder="Enter project name"
                value={projectData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholderTextColor="#999"
                returnKeyType="next"
              />
            </View>

            {/* Project Description */}
            <View className={`${isSmallScreen ? 'mb-3' : 'mb-5'}`}>
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text" size={20} color="black" style={{ marginRight: 8 }} />
                <Text className="text-[16px] font-semibold text-[#333]">Description *</Text>
              </View>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                placeholder="Describe your project"
                value={projectData.description}
                onChangeText={(value) => handleInputChange('description', value)}
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

      {/* Fixed Action Button - Always positioned at bottom */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <View className={`px-5 pt-4 items-center ${isSmallScreen ? 'pb-4' : 'pb-6'}`}>
          <TouchableOpacity
            className="w-full max-w-[280px] bg-black rounded-lg p-4 items-center justify-center"
            onPress={handleCreateProject}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            ) : (
              <Text className="text-white text-[16px] font-semibold">Create Project</Text>
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