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

  // --- Helper function to check if time is in the past today ---
  // Business Rule: Users cannot update events to times that have already passed today
  // This prevents setting event times that are in the past for today's events
  const isTimeInPastToday = (eventDate, newTime) => {
    const today = new Date();
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Check if event is for today
    if (eventDateOnly.getTime() === todayDateOnly.getTime()) {
      // Event is for today - check if new time is in the past
      const currentTime = today.getHours() * 60 + today.getMinutes(); // Convert to minutes
      const newEventTime = newTime.getHours() * 60 + newTime.getMinutes(); // Convert to minutes
      
      console.log('=== TIME VALIDATION FOR TODAY ===');
      console.log('Current Time (minutes):', currentTime);
      console.log('New Event Time (minutes):', newEventTime);
      console.log('Is Time in Past:', newEventTime < currentTime);
      console.log('================================');
      
      return newEventTime < currentTime; // Return true if new time is in the past
    }
    
    return false; // Not today, so time validation doesn't apply
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
      
      // --- TIME VALIDATION WARNING FOR TODAY'S EVENTS ---
      // Business Rule: Show warning if user selects past time for today's events
      // This gives users immediate feedback about time selection
      if (event && event.startDate) {
        const eventDate = new Date(event.startDate);
        if (isTimeInPastToday(eventDate, selectedTime)) {
          console.log('Warning: User selected start time that is in the past today');
          // Note: We allow the selection but will validate on update button press
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
      
      // --- TIME VALIDATION WARNING FOR TODAY'S EVENTS ---
      // Business Rule: Show warning if user selects past time for today's events
      // This gives users immediate feedback about time selection
      if (event && event.endDate) {
        const eventDate = new Date(event.endDate);
        if (isTimeInPastToday(eventDate, selectedTime)) {
          console.log('Warning: User selected end time that is in the past today');
          // Note: We allow the selection but will validate on update button press
        }
      }
      
      // --- REMOVED: End time validation logic ---
      // Business Rule: Allow users to set any end time, including times before start time
      // This gives users full flexibility for event scheduling
      
      setEndTime(combinedDateTime);
      const timeString = combinedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      handleEventFormChange('endTime', timeString);
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
    // Business Rule: Users cannot update events that are in the past
    // This prevents modification of historical event data
    if (event && event.startDate) {
      const today = new Date();
      const eventDate = new Date(event.startDate);
      
      // Compare only the date part (ignore time) to determine if event is in the past
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      console.log('=== PAST DATE VALIDATION ===');
      console.log('Today Date Only:', todayDateOnly.toLocaleDateString());
      console.log('Event Date Only:', eventDateOnly.toLocaleDateString());
      console.log('Is Event in Past:', eventDateOnly < todayDateOnly);
      console.log('============================');
      
      // Check if event date is before today
      if (eventDateOnly < todayDateOnly) {
        showErrorDialog(
          'Cannot Update Past Event', 
          'You cannot update events that are in the past. Please select a current or future event.'
        );
        return; // Stop the update process
      }

      // --- TIME VALIDATION FOR TODAY'S EVENTS ---
      // Business Rule: Users cannot update events to times that have already passed today
      // This prevents setting event times that are in the past for today's events
      if (eventDateOnly.getTime() === todayDateOnly.getTime()) {
        // Event is for today - validate ONLY the newly selected times
        
        // Check if user selected a new start time that is in the past today
        const originalStartTime = event.startDate ? new Date(event.startDate) : new Date();
        const startTimeChanged = Math.abs(startTime.getTime() - originalStartTime.getTime()) > 1000; // 1 second tolerance
        
        if (startTimeChanged && isTimeInPastToday(eventDate, startTime)) {
          showErrorDialog(
            'Cannot Update to Past Time',
            'You cannot update the event start time to a time that has already passed today.'
          );
          return; // Stop the update process
        }
        
        // Check if user selected a new end time that is in the past today
        const originalEndTime = event.endDate ? new Date(event.endDate) : new Date();
        const endTimeChanged = Math.abs(endTime.getTime() - originalEndTime.getTime()) > 1000; // 1 second tolerance
        
        if (endTimeChanged && isTimeInPastToday(eventDate, endTime)) {
          showErrorDialog(
            'Cannot Update to Past Time',
            'You cannot update the event end time to a time that has already passed today.'
          );
          return; // Stop the update process
        }
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
      // --- FIXED: Proper timezone handling for event update ---
      // Business Rule: Use same timezone conversion approach as task handling
      // This ensures events updated "today" appear on "today" in the calendar for all timezones
      
      // --- FIXED: Use the same date for both start and end times ---
      // Business Rule: Both start and end times should use the original event date
      // This prevents mixing different dates when updating event times
      const originalEventDate = event.startDate ? new Date(event.startDate) : new Date();
      
      // --- Create date objects that preserve the original event date ---
      // Both start and end times use the same date to maintain consistency
      const eventStartTime = new Date(originalEventDate);
      eventStartTime.setHours(startTime.getHours());
      eventStartTime.setMinutes(startTime.getMinutes());
      eventStartTime.setSeconds(startTime.getSeconds());
      eventStartTime.setMilliseconds(startTime.getMilliseconds());
      
      const eventEndTime = new Date(originalEventDate);
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
      console.log('Original Event Date:', event.startDate);
      console.log('Original Event Date Used:', originalEventDate.toLocaleDateString());
      console.log('Original Event Date Used (ISO):', originalEventDate.toISOString());
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
