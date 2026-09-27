import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createProject } from '../services/projects/createProject';
import Toast from 'react-native-toast-message';
import HomeBottomNav from '../components/HomeBottomNav';

function CreateProjectScreen({ navigation }) {
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
  });
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
      
      // Ensure end date is not before start date
      if (newDate > endDate) {
        setEndDate(newDate);
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      // Set time to midnight (00:00:00) for consistency
      const newDate = new Date(selectedDate);
      newDate.setHours(0, 0, 0, 0);
      setEndDate(newDate);
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
    
    // Ensure start date is not in the past
    if (startDate <= now) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Start date must be in the future',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    // Ensure end date is after start date
    if (endDate <= startDate) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'End date must be after start date',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    // This ensures projects created "today" appear on "today" in the calendar for all timezones
    
    // This ensures the project appears on the correct calendar day
    const localStartDate = new Date(startDate);
    const localEndDate = new Date(endDate);
    
    // Extract the local dates in YYYY-MM-DD format (same as event/task conversion)
    const projectStartDate = localStartDate.getFullYear() + '-' + 
      String(localStartDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(localStartDate.getDate()).padStart(2, '0');
    
    const projectEndDate = localEndDate.getFullYear() + '-' + 
      String(localEndDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(localEndDate.getDate()).padStart(2, '0');

    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    setIsLoading(true);
    
    try {
      // Prepare the data for API call
      const projectPayload = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        startDate: startDateISO, // ISO 8601 string format
        endDate: endDateISO, // ISO 8601 string format
      };

      console.log('=== Project Creation Debug ===');
      console.log('Original Start Date:', startDate.toLocaleString());
      console.log('Local Start Date:', localStartDate.toLocaleDateString());
      console.log('Project Start Date (YYYY-MM-DD):', projectStartDate);
      console.log('Original End Date:', endDate.toLocaleString());
      console.log('Local End Date:', localEndDate.toLocaleDateString());
      console.log('Project End Date (YYYY-MM-DD):', projectEndDate);
      console.log('Project Payload Being Sent:', projectPayload);
      console.log('=== End Project Creation Debug ===');

      const response = await createProject(projectPayload);
      
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
        navigation.goBack();
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
    // Show toast message and navigate back after a short delay
    Toast.show({
      type: 'info',
      text1: 'Cancelled',
      text2: 'Project creation cancelled',
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 80,
    });
    
    // Navigate back after showing the toast
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 p-5">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={dismissKeyboard}
        >
   
          <View className="mb-5">
            <View className="mb-5">
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
            <View className="mb-5">
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

            {/* End Date */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons name="calendar" size={20} color="black" style={{ marginRight: 8 }} />
                <Text className="text-[16px] font-semibold text-[#333]">End Date *</Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text className="text-[16px] text-[#333] font-medium">
                  {endDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Fixed Action Buttons - Always positioned at bottom */}
      <View className="absolute bottom-0 left-0 right-0 flex-row justify-between gap-4 px-5 pt-5 pb-8 bg-white" style={{ zIndex: 1000 }}>
        <TouchableOpacity
          className="flex-1 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg p-4 items-center"
          onPress={handleCancel}
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.6 : 1 }}
        >
          <Text className="text-[#6c757d] text-[16px] font-semibold">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-black rounded-lg p-4 items-center justify-center"
          onPress={handleCreateProject}
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.6 : 1 }}
        >
          {isLoading ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
              <Text className="text-white text-[16px] font-semibold">Creating...</Text>
            </View>
          ) : (
            <Text className="text-white text-[16px] font-semibold">Create Project</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          onChange={handleEndDateChange}
          minimumDate={startDate}
        />
      )}

      <HomeBottomNav keyboardVisible={keyboardVisible} />
    </View>
  );
}

 

export default CreateProjectScreen;
