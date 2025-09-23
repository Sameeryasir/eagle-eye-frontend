import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateEventById } from "../../services/event/updateEventById";
import NoChangesDialog from './NoChangesDialog';
import ErrorDialog from './ErrorDialog';

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
  
  // --- State for date pickers ---
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [noChangesDialogVisible, setNoChangesDialogVisible] = useState(false);

  // --- State for custom error dialog ---
  const [errorDialog, setErrorDialog] = useState({
    visible: false,
    title: '',
    message: ''
  });

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
      setStartDate(event.startDate ? new Date(event.startDate) : new Date());
      setEndDate(event.endDate ? new Date(event.endDate) : new Date());
    }
  }, [event, visible]);

  // --- Event form handlers ---
  const handleEventFormChange = (field, value) => {
    setEventForm(prev => ({
      ...prev,
      [field]: value
    }));
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

  // --- Helper function to get minimum time for today ---
  // Business Rule: Users cannot select past times for today's events
  // This prevents setting event times that are in the past for today's events
  const getMinimumTimeForDate = (selectedDate) => {
    const today = new Date();
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // If the selected date is today, set minimum time to current time
    if (selectedDateOnly.getTime() === todayDateOnly.getTime()) {
      return today; // Return current time as minimum for today
    }
    
    // For future dates, no time restriction
    return null;
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
      
      // --- TIME VALIDATION: Check if selected time is in the past for today's events ---
      // Business Rule: Users cannot select past times for today's events
      // This prevents setting event times that are in the past for today's events
      const today = new Date();
      const selectedDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // If the selected date is today, check if the time is in the past
      if (selectedDateOnly.getTime() === todayDateOnly.getTime()) {
        if (combinedDateTime < today) {
          showErrorDialog(
            'Cannot Select Past Time', 
            'You cannot select a time that has already passed for today\'s event. Please select a current or future time.'
          );
          return; // Don't update the time if it's in the past
        }
      }
      
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
      
      // --- TIME VALIDATION: Check if selected time is in the past for today's events ---
      // Business Rule: Users cannot select past times for today's events
      // This prevents setting event times that are in the past for today's events
      const today = new Date();
      const selectedDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // If the selected date is today, check if the time is in the past
      if (selectedDateOnly.getTime() === todayDateOnly.getTime()) {
        if (combinedDateTime < today) {
          showErrorDialog(
            'Cannot Select Past Time', 
            'You cannot select a time that has already passed for today\'s event. Please select a current or future time.'
          );
          return; // Don't update the time if it's in the past
        }
      }
      
      setEndTime(combinedDateTime);
      const timeString = combinedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      handleEventFormChange('endTime', timeString);
    }
  };

  // --- Date picker handlers ---
  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleUpdateEvent = async () => {
    // --- CONSOLE LOG: User tapped Update Event button ---
    console.log('=== USER TAPPED UPDATE EVENT BUTTON ===');
    console.log('Current Date/Time:', new Date().toLocaleString());
    console.log('Event Object:', event);
    console.log('Event Start Date:', event.startDate);
    console.log('Event End Date:', event.endDate);
    console.log('Start Time State:', startTime.toLocaleString());
    console.log('End Time State:', endTime.toLocaleString());
    console.log('Event Form:', eventForm);
    console.log('==========================================');

    // --- PAST DATE VALIDATION ---
    // Business Rule: Users cannot update events to dates that are in the past
    // This prevents setting event dates that have already passed
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log('=== PAST DATE VALIDATION ===');
    console.log('Today Date Only:', todayDateOnly.toLocaleDateString());
    console.log('New Start Date:', startDate.toLocaleDateString());
    console.log('New End Date:', endDate.toLocaleDateString());
    console.log('============================');
    
    // Check if user selected a start date that is in the past
    const validationStartDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    if (validationStartDateOnly < todayDateOnly) {
      showErrorDialog(
        'Cannot Update to Past Date', 
        'You cannot update the event start date to a date that has already passed. Please select a current or future date.'
      );
      return; // Stop the update process
    }
    
    // Check if user selected an end date that is in the past
    const validationEndDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (validationEndDateOnly < todayDateOnly) {
      showErrorDialog(
        'Cannot Update to Past Date', 
        'You cannot update the event end date to a date that has already passed. Please select a current or future date.'
      );
      return; // Stop the update process
    }

    // --- TIME VALIDATION: Check if selected times are in the past for today's events ---
    // Business Rule: Users cannot set past times for today's events
    // This prevents setting event times that are in the past for today's events
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    // Check if start time is in the past for today's events
    if (startDateOnly.getTime() === todayDateOnly.getTime()) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(startTime.getHours());
      startDateTime.setMinutes(startTime.getMinutes());
      startDateTime.setSeconds(startTime.getSeconds());
      startDateTime.setMilliseconds(startTime.getMilliseconds());
      
      if (startDateTime < today) {
        showErrorDialog(
          'Cannot Update to Past Time', 
          'You cannot update the event start time to a time that has already passed for today\'s event. Please select a current or future time.'
        );
        return; // Stop the update process
      }
    }
    
    // Check if end time is in the past for today's events
    if (endDateOnly.getTime() === todayDateOnly.getTime()) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(endTime.getHours());
      endDateTime.setMinutes(endTime.getMinutes());
      endDateTime.setSeconds(endTime.getSeconds());
      endDateTime.setMilliseconds(endTime.getMilliseconds());
      
      if (endDateTime < today) {
        showErrorDialog(
          'Cannot Update to Past Time', 
          'You cannot update the event end time to a time that has already passed for today\'s event. Please select a current or future time.'
        );
        return; // Stop the update process
      }
    }

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

    // --- REMOVED: End time validation logic ---
    // Business Rule: Allow users to set any end time, including times before start time
    // This gives users full flexibility for event scheduling

    // --- CHANGE DETECTION: Check if any changes were made ---
    // Business Rule: Detect changes in title, description, dates, and times
    // This ensures users can update any aspect of the event
    const originalTitle = event.title || '';
    const originalDescription = event.description || '';
    const originalStartDate = event.startDate ? new Date(event.startDate) : new Date();
    const originalEndDate = event.endDate ? new Date(event.endDate) : new Date();
    const originalStartTime = event.startDate ? new Date(event.startDate) : new Date();
    const originalEndTime = event.endDate ? new Date(event.endDate) : new Date();

    // Check for changes in all fields
    const titleChanged = eventForm.title.trim() !== originalTitle;
    const descriptionChanged = eventForm.description.trim() !== originalDescription;
    
    // --- DATE CHANGE DETECTION ---
    // Compare dates only (ignore time) to detect date changes
    const originalStartDateOnly = new Date(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate());
    const originalEndDateOnly = new Date(originalEndDate.getFullYear(), originalEndDate.getMonth(), originalEndDate.getDate());
    const newStartDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const newEndDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    const startDateChanged = originalStartDateOnly.getTime() !== newStartDateOnly.getTime();
    const endDateChanged = originalEndDateOnly.getTime() !== newEndDateOnly.getTime();
    
    // --- TIME CHANGE DETECTION ---
    // Compare times only (ignore date) to detect time changes
    const startTimeChanged = Math.abs(startTime.getTime() - originalStartTime.getTime()) > 1000; // 1 second tolerance
    const endTimeChanged = Math.abs(endTime.getTime() - originalEndTime.getTime()) > 1000; // 1 second tolerance

    // --- DEBUG: Change Detection Logging ---
    console.log('=== CHANGE DETECTION DEBUG ===');
    console.log('Title Changed:', titleChanged);
    console.log('Description Changed:', descriptionChanged);
    console.log('Start Date Changed:', startDateChanged);
    console.log('End Date Changed:', endDateChanged);
    console.log('Start Time Changed:', startTimeChanged);
    console.log('End Time Changed:', endTimeChanged);
    console.log('--- Original Values ---');
    console.log('Original Start Date:', originalStartDateOnly.toLocaleDateString());
    console.log('New Start Date:', newStartDateOnly.toLocaleDateString());
    console.log('Original End Date:', originalEndDateOnly.toLocaleDateString());
    console.log('New End Date:', newEndDateOnly.toLocaleDateString());
    console.log('Original Start Time:', originalStartTime.toLocaleTimeString());
    console.log('New Start Time:', startTime.toLocaleTimeString());
    console.log('Original End Time:', originalEndTime.toLocaleTimeString());
    console.log('New End Time:', endTime.toLocaleTimeString());
    console.log('===============================');

    // Check if any changes were made
    if (!titleChanged && !descriptionChanged && !startDateChanged && !endDateChanged && !startTimeChanged && !endTimeChanged) {
      console.log('No changes detected - showing no changes dialog');
      setNoChangesDialogVisible(true);
      return;
    }

    setIsUpdating(true);

    try {
      // --- FIXED: Proper timezone handling for event update ---
      // Business Rule: Use same timezone conversion approach as task handling
      // This ensures events updated "today" appear on "today" in the calendar for all timezones
      
      // --- FIXED: Use selected dates for start and end times ---
      // Business Rule: Use the dates selected by the user for proper multi-day event support
      // This allows users to change both dates and times when updating events
      
      // --- Create date objects using selected dates and times ---
      const eventStartTime = new Date(startDate);
      eventStartTime.setHours(startTime.getHours());
      eventStartTime.setMinutes(startTime.getMinutes());
      eventStartTime.setSeconds(startTime.getSeconds());
      eventStartTime.setMilliseconds(startTime.getMilliseconds());
      
      const eventEndTime = new Date(endDate);
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
      
      // Format the event data - send Date objects (JavaScript auto-converts to UTC)
      const eventData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || '',
        startTime: eventStartTime, // Date object (auto-converts to proper UTC)
        endTime: eventEndTime // Date object (auto-converts to proper UTC)
      };

      console.log('=== EVENT UPDATE PROCESSING ===');
      console.log('Original Event Start Date:', event.startDate);
      console.log('Original Event End Date:', event.endDate);
      console.log('Start Date State:', startDate.toLocaleDateString());
      console.log('Start Date State (ISO):', startDate.toISOString());
      console.log('End Date State:', endDate.toLocaleDateString());
      console.log('End Date State (ISO):', endDate.toISOString());
      console.log('Start Time State:', startTime.toLocaleString());
      console.log('Start Time State (ISO):', startTime.toISOString());
      console.log('End Time State:', endTime.toLocaleString());
      console.log('End Time State (ISO):', endTime.toISOString());
      console.log('--- Processed Dates ---');
      console.log('Event Start Time:', eventStartTime.toLocaleString());
      console.log('Event Start Time (ISO):', eventStartTime.toISOString());
      console.log('Event End Time:', eventEndTime.toLocaleString());
      console.log('Event End Time (ISO):', eventEndTime.toISOString());
      console.log('Local Start Date:', localStartDate.toLocaleDateString());
      console.log('Event Date (YYYY-MM-DD):', eventDate);
      console.log('--- Final Data Being Sent to API ---');
      console.log('Event Data:', eventData);
      console.log('Start Time Being Sent:', eventData.startTime);
      console.log('End Time Being Sent:', eventData.endTime);
      console.log('=== END EVENT UPDATE PROCESSING ===');

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

              {/* Start Date & Time */}
              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="calendar-outline" size={16} color="#374151" style={{ marginRight: 6 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">Start Date & Time</Text>
                </View>
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text className="text-[16px] text-[#333] font-medium">
                      {startDate.toLocaleDateString() || 'Select date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text className="text-[16px] text-[#333] font-medium">
                      {eventForm.startTime || 'Select time'}
                    </Text>
                    <Ionicons name="time-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* End Date & Time */}
              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="calendar-outline" size={16} color="#374151" style={{ marginRight: 6 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">End Date & Time</Text>
                </View>
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text className="text-[16px] text-[#333] font-medium">
                      {endDate.toLocaleDateString() || 'Select date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text className="text-[16px] text-[#333] font-medium">
                      {eventForm.endTime || 'Select time'}
                    </Text>
                    <Ionicons name="time-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
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

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleStartDateChange}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleEndDateChange}
          />
        )}

        {/* Time Pickers */}
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            is24Hour={false}
            display="default"
            minimumDate={getMinimumTimeForDate(startDate)}
            onChange={handleStartTimeChange}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            is24Hour={false}
            display="default"
            minimumDate={getMinimumTimeForDate(endDate)}
            onChange={handleEndTimeChange}
          />
        )}

        {/* No Changes Dialog */}
        <NoChangesDialog
          visible={noChangesDialogVisible}
          onClose={() => setNoChangesDialogVisible(false)}
        />

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

export default UpdateEventModal;
