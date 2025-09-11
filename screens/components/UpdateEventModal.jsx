import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateEventById } from "../../services/event/updateEventById";
import NoChangesDialog from './NoChangesDialog';

const UpdateEventModal = ({ 
  visible, 
  onClose, 
  event, 
  onEventUpdated 
}) => {
  // --- State for event form ---
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: ''
  });

  // --- State for time pickers ---
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [noChangesDialogVisible, setNoChangesDialogVisible] = useState(false);

  // --- Initialize form with event data ---
  useEffect(() => {
    if (event && visible) {
      setEventForm({
        title: event.title || '',
        description: event.description || '',
        startTime: event.startDate ? event.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
        endTime: event.endDate ? event.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : ''
      });
      setStartTime(event.startDate ? new Date(event.startDate) : new Date());
      setEndTime(event.endDate ? new Date(event.endDate) : new Date());
    }
  }, [event, visible]);

  // --- Event form handlers ---
  const handleEventFormChange = (field, value) => {
    setEventForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // --- Time picker handlers ---
  const handleStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      // Combine selected time with the event date
      const eventDate = event.startDate ? new Date(event.startDate) : new Date();
      const combinedDateTime = new Date(eventDate);
      combinedDateTime.setHours(selectedTime.getHours());
      combinedDateTime.setMinutes(selectedTime.getMinutes());
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);
      
      setStartTime(combinedDateTime);
      const timeString = combinedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      handleEventFormChange('startTime', timeString);
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      // Combine selected time with the event date
      const eventDate = event.endDate ? new Date(event.endDate) : new Date();
      const combinedDateTime = new Date(eventDate);
      combinedDateTime.setHours(selectedTime.getHours());
      combinedDateTime.setMinutes(selectedTime.getMinutes());
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);
      
      // Check if end time is before start time
      if (startTime && combinedDateTime <= startTime) {
        Alert.alert(
          'Invalid Time',
          'End time must be after start time. Please choose a later time.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setEndTime(combinedDateTime);
      const timeString = combinedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      handleEventFormChange('endTime', timeString);
    }
  };

  const handleUpdateEvent = async () => {
    // Basic validation
    if (!eventForm.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the event');
      return;
    }

    if (!eventForm.startTime.trim()) {
      Alert.alert('Error', 'Please enter a start time for the event');
      return;
    }

    if (!eventForm.endTime.trim()) {
      Alert.alert('Error', 'Please enter an end time for the event');
      return;
    }

    // Check if end time is after start time (final validation)
    if (endTime <= startTime) {
      Alert.alert('Error', 'End time must be after start time. Please adjust your times.');
      return;
    }

    // Check if any changes were made
    const originalTitle = event.title || '';
    const originalDescription = event.description || '';
    const originalStartTime = event.startDate ? new Date(event.startDate) : new Date();
    const originalEndTime = event.endDate ? new Date(event.endDate) : new Date();

    const titleChanged = eventForm.title.trim() !== originalTitle;
    const descriptionChanged = eventForm.description.trim() !== originalDescription;
    const startTimeChanged = Math.abs(startTime.getTime() - originalStartTime.getTime()) > 1000; // 1 second tolerance
    const endTimeChanged = Math.abs(endTime.getTime() - originalEndTime.getTime()) > 1000; // 1 second tolerance

    if (!titleChanged && !descriptionChanged && !startTimeChanged && !endTimeChanged) {
      setNoChangesDialogVisible(true);
      return;
    }

    setIsUpdating(true);

    try {
      // Format the event data - backend expects ISO 8601 strings
      const eventData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || '',
        startTime: startTime.toISOString(), // ISO 8601 string format
        endTime: endTime.toISOString() // ISO 8601 string format
      };

      console.log('Updating event data:', eventData);

      // Call the updateEventById service
      const result = await updateEventById(event.originalEventId || event.id, eventData);

      // Show success toast message
      Toast.show({
        type: 'success',
        text1: 'Event Updated Successfully!',
        text2: 'Your event has been modified',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });

      // Close modal and refresh events list
      onClose();
      if (onEventUpdated) {
        onEventUpdated();
      }

    } catch (error) {
      console.error('Error updating event:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to update event. Please try again.';
      
      if (error.response?.status === 400) {
        // Handle validation errors
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else {
          errorMessage = 'Invalid event data. Please check your inputs.';
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to update events.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Event not found.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      // Show error toast message
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: errorMessage,
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-white">
        {/* Black Navbar */}
        <View className="bg-black px-4 py-3 flex-row items-center justify-between">
          <Text className="text-black text-[18px] font-semibold">Update Event</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View className="flex-1 p-5 items-center">
          <ScrollView 
            className="flex-1 w-full max-w-md"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View className="mb-8 items-center">
              <Text className="text-[28px] font-bold text-[#333]">Update Event</Text>
              <Text className="text-[16px] text-[#666] text-center">Modify your event details</Text>
            </View>

            <View className="mb-5">
              {/* Event Title */}
              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="document-text" size={16} color="#374151" style={{ marginRight: 6 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">Event Title</Text>
                </View>
                <TextInput
                  className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                  placeholder="Enter event title"
                  value={eventForm.title}
                  onChangeText={(text) => handleEventFormChange('title', text)}
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>

              {/* Event Description */}
              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="chatbubble-ellipses" size={16} color="#374151" style={{ marginRight: 6 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">Description</Text>
                </View>
                <TextInput
                  className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                  placeholder="Describe your event"
                  value={eventForm.description}
                  onChangeText={(text) => handleEventFormChange('description', text)}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                  returnKeyType="next"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>

              {/* Start Time */}
              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="time" size={16} color="#374151" style={{ marginRight: 6 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">Start Time</Text>
                </View>
                <TouchableOpacity
                  className="flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text className="text-[16px] text-[#333] font-medium">
                    {eventForm.startTime || 'Select start time'}
                  </Text>
                  <Ionicons name="time-outline" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              {/* End Time */}
              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="calendar" size={16} color="#374151" style={{ marginRight: 6 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">End Time</Text>
                </View>
                <TouchableOpacity
                  className="flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text className="text-[16px] text-[#333] font-medium">
                    {eventForm.endTime || 'Select end time'}
                  </Text>
                  <Ionicons name="time-outline" size={16} color="#666" />
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </View>

        {/* Fixed Action Button - Always positioned at bottom */}
        <View className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-5 bg-transparent items-center">
          <TouchableOpacity
            className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
            onPress={handleUpdateEvent}
            activeOpacity={0.8}
            disabled={isUpdating}
            style={{ opacity: isUpdating ? 0.6 : 1 }}
          >
            {isUpdating ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white text-[16px] font-semibold">Update Event</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Time Pickers */}
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleStartTimeChange}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            is24Hour={false}
            display="default"
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
};

export default UpdateEventModal;
