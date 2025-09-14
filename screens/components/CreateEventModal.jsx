import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Localization from 'expo-localization';
import { createEvent } from "../../services/event/createEvent";
import ErrorDialog from './ErrorDialog';

const CreateEventModal = ({ 
  visible, 
  onClose, 
  selectedDate, 
  onEventCreated 
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
  const [isCreating, setIsCreating] = useState(false);

  // --- State for custom error dialog ---
  const [errorDialog, setErrorDialog] = useState({
    visible: false,
    title: '',
    message: ''
  });

  // --- Set current time when modal opens ---
  useEffect(() => {
    if (visible) {
      const now = new Date();
      const eventDate = selectedDate ? new Date(selectedDate) : new Date();
      
      // Combine current time with the selected date
      const currentStartTime = new Date(eventDate);
      currentStartTime.setHours(now.getHours());
      currentStartTime.setMinutes(now.getMinutes());
      currentStartTime.setSeconds(0);
      currentStartTime.setMilliseconds(0);
      
      // Set end time to 1 hour after start time
      const currentEndTime = new Date(currentStartTime);
      currentEndTime.setHours(currentEndTime.getHours() + 1);
      
      setStartTime(currentStartTime);
      setEndTime(currentEndTime);
      
      // Update form with current times
      const startTimeString = currentStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      
      setEventForm(prev => ({
        ...prev,
        startTime: startTimeString,
        endTime: '' // Show "Not selected" initially
      }));
    }
  }, [visible, selectedDate]);

  // --- Event form handlers ---
  const handleEventFormChange = (field, value) => {
    setEventForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      startTime: '',
      endTime: ''
    });
    setStartTime(new Date());
    setEndTime(new Date());
  };

  // --- Helper function to show custom error dialog ---
  const showErrorDialog = (title, message) => {
    setErrorDialog({
      visible: true,
      title: title,
      message: message
    });
  };

  // --- Helper function to close custom error dialog ---
  const closeErrorDialog = () => {
    setErrorDialog({
      visible: false,
      title: '',
      message: ''
    });
  };

  // --- Time picker handlers ---
  const handleStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      // Combine selected time with the event date
      const eventDate = selectedDate ? new Date(selectedDate) : new Date();
      const combinedDateTime = new Date(eventDate);
      combinedDateTime.setHours(selectedTime.getHours());
      combinedDateTime.setMinutes(selectedTime.getMinutes());
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);
      
      // Only check for past time if the event date is today
     
      
      setStartTime(combinedDateTime);
      const timeString = combinedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      handleEventFormChange('startTime', timeString);
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      // Combine selected time with the event date
      const eventDate = selectedDate ? new Date(selectedDate) : new Date();
      const combinedDateTime = new Date(eventDate);
      combinedDateTime.setHours(selectedTime.getHours());
      combinedDateTime.setMinutes(selectedTime.getMinutes());
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);
      
      // Only check for past time if the event date is today
      const today = new Date();
      const isToday = eventDate.toDateString() === today.toDateString();
      
      if (isToday && combinedDateTime < today) {
        showErrorDialog(
          'Invalid Time',
          'You cannot select a time in the past for today. Please choose a future time.'
        );
        return;
      }
      
      // Check if end time is before start time
      if (startTime && combinedDateTime <= startTime) {
        showErrorDialog(
          'Invalid Time',
          'End time must be after start time. Please choose a later time.'
        );
        return;
      }
      
      setEndTime(combinedDateTime);
      const timeString = combinedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      handleEventFormChange('endTime', timeString);
    }
  };

  const handleCreateEvent = async () => {
    // Basic validation
    if (!eventForm.title.trim()) {
      showErrorDialog('Error', 'Please enter a title for the event');
      return;
    }

    if (!eventForm.startTime.trim()) {
      showErrorDialog('Error', 'Please enter a start time for the event');
      return;
    }

    if (!eventForm.endTime.trim()) {
      showErrorDialog('Error', 'Please enter an end time for the event');
      return;
    }

    // Check if end time is after start time (final validation)
    if (endTime <= startTime) {
      showErrorDialog('Error', 'End time must be after start time. Please adjust your times.');
      return;
    }

    setIsCreating(true);

    try {
      // --- FIXED: Proper timezone handling for event creation ---
      // Business Rule: Use same timezone conversion approach as task handling
      // This ensures events created "today" appear on "today" in the calendar for all timezones
      
      // Get the intended date (the date the user selected)
      const intendedDate = selectedDate ? new Date(selectedDate) : new Date();
      
      // --- Create date objects that preserve the intended calendar date ---
      // This approach matches the task timezone conversion logic
      const eventStartTime = new Date(intendedDate);
      eventStartTime.setHours(startTime.getHours());
      eventStartTime.setMinutes(startTime.getMinutes());
      eventStartTime.setSeconds(startTime.getSeconds());
      eventStartTime.setMilliseconds(startTime.getMilliseconds());
      
      const eventEndTime = new Date(intendedDate);
      eventEndTime.setHours(endTime.getHours());
      eventEndTime.setMinutes(endTime.getMinutes());
      eventEndTime.setSeconds(endTime.getSeconds());
      eventEndTime.setMilliseconds(endTime.getMilliseconds());
      
      // --- Convert to local timezone for date extraction (same as task handling) ---
      // This ensures the event appears on the correct calendar day
      const localStartDate = new Date(eventStartTime);
      const localEndDate = new Date(eventEndTime);
      
      // Extract the local date in YYYY-MM-DD format (same as task conversion)
      const eventDate = localStartDate.getFullYear() + '-' + 
        String(localStartDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(localStartDate.getDate()).padStart(2, '0');
      
      // --- TIMEZONE-AWARE TIMESTAMPS (Using Expo Localization) ---
      // Get timezone information using expo-localization for better accuracy
      const timezoneName = Localization.timezone; // e.g., "America/New_York"
      const locale = Localization.locale; // e.g., "en-US"
      const locales = Localization.locales; // Array of supported locales
      
      // Get timezone offset using expo-localization
      const timezoneOffset = new Date().getTimezoneOffset(); // Minutes offset from UTC
      const timezoneOffsetHours = -timezoneOffset / 60; // Convert to hours (negative because getTimezoneOffset returns opposite)
      
      // Format the event data - Backend DTO only accepts: title, description, startTime, endTime
      const eventData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || '',
        startTime: eventStartTime.toISOString(), // ISO 8601 string format (UTC)
        endTime: eventEndTime.toISOString() // ISO 8601 string format (UTC)
      };

      console.log('=== Event Creation Debug (Timezone-Aware) ===');
      console.log('Selected Date:', selectedDate);
      console.log('Intended Date:', intendedDate);
      console.log('Original Start Time:', startTime.toLocaleString());
      console.log('Event Start Time:', eventStartTime.toLocaleString());
      console.log('Original End Time:', endTime.toLocaleString());
      console.log('Event End Time:', eventEndTime.toLocaleString());
      console.log('Local Start Date:', localStartDate.toLocaleDateString());
      console.log('Event Date (YYYY-MM-DD):', eventDate);
      console.log('--- TIMEZONE INFORMATION (Expo Localization) - DEBUG ONLY ---');
      console.log('Timezone Name:', timezoneName);
      console.log('Timezone Offset (Hours):', timezoneOffsetHours);
      console.log('Timezone Offset (Minutes):', timezoneOffset);
      console.log('--- LOCALIZATION INFORMATION - DEBUG ONLY ---');
      console.log('Locale:', locale);
      console.log('Locales:', locales);
      console.log('Region:', Localization.region);
      console.log('--- TIME INFORMATION - DEBUG ONLY ---');
      console.log('Local Start Time:', eventStartTime.toLocaleString());
      console.log('Local End Time:', eventEndTime.toLocaleString());
      console.log('UTC Start Time:', eventData.startTime);
      console.log('UTC End Time:', eventData.endTime);
      console.log('--- BACKEND DATA (DTO Compliant) ---');
      console.log('Event Data Being Sent:', eventData);
      console.log('=== End Event Creation Debug ===');

      // Call the createEvent service
      const result = await createEvent(eventData);

      // Show success toast message
      Toast.show({
        type: 'success',
        text1: 'Event Created Successfully!',
        text2: 'Your new event has been added to the calendar',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });

      // Close modal and refresh events list
      onClose();
      resetEventForm();
      if (onEventCreated) {
        onEventCreated();
      }

    } catch (error) {
      console.error('Error creating event:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to create event. Please try again.';
      
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
        errorMessage = 'You do not have permission to create events.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      // Show error toast message
      Toast.show({
        type: 'error',
        text1: 'Event Creation Failed',
        text2: errorMessage,
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetEventForm();
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
          <Text className="text-black text-[18px] font-semibold">Create Event</Text>
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
              <Text className="text-[28px] font-bold text-[#333]">Create Event</Text>
              <Text className="text-[16px] text-[#666] text-center">Add a new event to your schedule</Text>
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
                    {eventForm.endTime || 'Not selected'}
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
            onPress={handleCreateEvent}
            activeOpacity={0.8}
            disabled={isCreating}
            style={{ opacity: isCreating ? 0.6 : 1 }}
          >
            {isCreating ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white text-[16px] font-semibold">Create Event</Text>
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
            minimumDate={selectedDate && new Date(selectedDate).toDateString() === new Date().toDateString() ? new Date() : undefined}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleEndTimeChange}
            minimumDate={selectedDate && new Date(selectedDate).toDateString() === new Date().toDateString() ? new Date() : undefined}
          />
        )}

        {/* --- Custom Error Dialog --- */}
        <ErrorDialog
          visible={errorDialog.visible}
          onClose={closeErrorDialog}
          title={errorDialog.title}
          message={errorDialog.message}
        />
      </View>
    </Modal>
  );
};

export default CreateEventModal;
