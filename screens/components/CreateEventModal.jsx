import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import * as Localization from 'expo-localization';
import { createEvent } from "../../services/event/createEvent";
import { getEmployeesToAssignTask } from "../../services/employees/getEmployeesOfTheCompany";
import { getMyProjects } from "../../services/projects/getProjectsByLoginUserId";
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
    endTime: '',
    isProject: false, // Add checkbox for project designation
    
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

  // --- State for React Native dropdown picker (Multiple Selection) ---
  const [employees, setEmployees] = useState([]);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [selectedEmployeeValues, setSelectedEmployeeValues] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // --- State for Project dropdown ---
  const [projects, setProjects] = useState([]);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [selectedProjectValues, setSelectedProjectValues] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

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

      // Always fetch projects when modal opens
      fetchProjects();
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
      endTime: '',
      isProject: false, // Reset checkbox to unchecked
      assignedEmployees: [], // Reset selected employees
      selectedProjects: [] // Reset selected projects
    });
    setStartTime(new Date());
    setEndTime(new Date());
    setSelectedEmployeeValues([]); // Reset dropdown selections
    setEmployeeDropdownOpen(false); // Close dropdown when form is reset
    setSelectedProjectValues([]); // Reset project selection
    setProjectDropdownOpen(false); // Close project dropdown when form is reset
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

  // --- Employee data is now fetched from real API service ---

  // --- Function to fetch projects ---
  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      // --- Use real API service to fetch projects ---
      const response = await getMyProjects();
      
      if (response && Array.isArray(response)) {
        // Business Rule: Convert API response to dropdown picker format (label, value)
        const formattedProjects = response.map(project => {
          // Create display name for project
          let displayName = project.name || project.title || 'Unnamed Project';
          
          // Add project description if available (truncated)
          if (project.description) {
            const truncatedDesc = project.description.length > 30 
              ? project.description.substring(0, 27) + '...'
              : project.description;
            displayName += ` - ${truncatedDesc}`;
          }
          
          // Truncate if too long (max 60 characters)
          if (displayName.length > 60) {
            displayName = displayName.substring(0, 57) + '...';
          }
          
          const formattedProject = {
            label: displayName,
            value: project.id, // Use project.id from API response
            project: project // Keep original project object for reference
          };
          
          // --- Debug logging to ensure data structure is correct ---
          console.log('Formatted Project:', formattedProject);
          console.log('Project ID:', project.id);
          console.log('Project Name:', project.name || project.title);
          
          return formattedProject;
        });
        
        console.log('=== Projects Loaded Successfully ===');
        console.log('All Formatted Projects from API:', formattedProjects);
        console.log('Total projects loaded:', formattedProjects.length);
        console.log('Setting projects state...');
        setProjects(formattedProjects);
        console.log('=== End Projects Loading ===');
        
        // Simulate loading delay for better UX
        setTimeout(() => {
          setIsLoadingProjects(false);
        }, 300);
        
      } else {
        console.warn('No projects data received from API');
        setProjects([]);
        setIsLoadingProjects(false);
      }
      
    } catch (error) {
      console.error('Error fetching projects from API:', error);
      showErrorDialog(
        'Error Loading Projects',
        'Failed to load projects list. Please try again.'
      );
      setIsLoadingProjects(false);
    }
  };

  // --- Function to fetch employees for project assignment ---
  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      // --- Use real API service to fetch employees ---
      const response = await getEmployeesToAssignTask();
      
      if (response && Array.isArray(response)) {
        // Business Rule: Convert API response to dropdown picker format (label, value)
        const formattedEmployees = response.map(employee => {
          // Create display name similar to UpdateTaskModal format
          const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
          let displayName = fullName ? `${fullName} (${employee.email})` : employee.email;
          
          // Truncate if too long (max 50 characters)
          if (displayName.length > 50) {
            displayName = displayName.substring(0, 47) + "...";
          }
          
          const formattedEmployee = {
            label: displayName,
            value: employee.id, // Use employee.id from API response
            employee: employee // Keep original employee object for reference
          };
          
          // --- Debug logging to ensure data structure is correct ---
          console.log('Formatted Employee:', formattedEmployee);
          console.log('Employee Email:', employee.email);
          console.log('Employee ID:', employee.id);
          
          return formattedEmployee;
        });
        
        console.log('All Formatted Employees from API:', formattedEmployees);
        console.log('Total employees loaded:', formattedEmployees.length);
        setEmployees(formattedEmployees);
        
        // Simulate loading delay for better UX
        setTimeout(() => {
          setIsLoadingEmployees(false);
        }, 300);
        
      } else {
        console.warn('No employees data received from API');
        setEmployees([]);
        setIsLoadingEmployees(false);
      }
      
    } catch (error) {
      console.error('Error fetching employees from API:', error);
      showErrorDialog(
        'Error Loading Employees',
        'Failed to load employees list. Please try again.'
      );
      setIsLoadingEmployees(false);
    }
  };

  // --- Handle project checkbox change ---
  const handleProjectCheckboxChange = (isChecked) => {
    console.log('Project checkbox changed to:', isChecked);
    handleEventFormChange('isProject', isChecked);
    
    if (isChecked) {
      // If checkbox is checked, fetch employees
      console.log('Project checkbox is checked - fetching employees');
      fetchEmployees();
    } else {
      // If checkbox is unchecked, clear selected employees (keep project selection)
      console.log('Project checkbox is unchecked - clearing employees');
      setSelectedEmployeeValues([]);
      handleEventFormChange('assignedEmployees', []);
    }
  };

  // --- Handle multiple project selection from dropdown ---
  const handleProjectSelection = (values) => {
    console.log('=== handleProjectSelection called ===');
    console.log('Values received:', values);
    console.log('Available projects:', projects);
    
    setSelectedProjectValues(values);
    
    // Find the selected project objects
    const selectedProjects = projects
      .filter(proj => values.includes(proj.value))
      .map(proj => proj.project);
    console.log('Found selected projects:', selectedProjects);
    
    handleEventFormChange('selectedProjects', selectedProjects);
    console.log('Updated form with projects:', selectedProjects);
    console.log('=== End handleProjectSelection ===');
  };

  // --- Handle multiple employee selection from dropdown ---
  const handleEmployeeSelection = (values) => {
    setSelectedEmployeeValues(values);
    
    // Find the selected employee objects
    const selectedEmployees = employees
      .filter(emp => values.includes(emp.value))
      .map(emp => emp.employee);
    
    handleEventFormChange('assignedEmployees', selectedEmployees);
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

    // --- Project-specific validation removed ---
    // Business Rule: Employee and project selection are for UI only, not sent to backend
    // Validation for project assignment is handled in UI state only

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
      
      // Format the event data - Backend DTO accepts: title, description, startTime, endTime
      // Business Rule: Employee selection is for UI only, not included in backend data
      const eventData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || '',
        startTime: eventStartTime.toISOString(), // ISO 8601 string format (UTC)
        endTime: eventEndTime.toISOString() // ISO 8601 string format (UTC)
        // Note: Employee data is kept in UI state but not sent to backend
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
      console.log('--- UI STATE DEBUG (Not Sent to Backend) ---');
      console.log('Is Project:', eventForm.isProject);
      console.log('Selected Projects (UI Only):', eventForm.selectedProjects);
      console.log('Assigned Employees (UI Only):', eventForm.assignedEmployees);
      console.log('Note: Project and employee data are for UI display only, not sent to backend');
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
          <View 
            className="flex-1 w-full max-w-md"
            style={{ paddingBottom: 100 }}
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

              {/* Project Checkbox */}
              <View className="mb-5">
                <TouchableOpacity className="flex-row items-center justify-between p-3 border border-[#e1e8ed] rounded-lg bg-[#f8f9fa]"
                  onPress={() => handleProjectCheckboxChange(!eventForm.isProject)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="folder" size={16} color="#374151" style={{ marginRight: 6 }} />
                    <Text className="text-[16px] font-medium text-[#333]">This is a Project</Text>
                  </View>
                  <View className={`w-5 h-5 border-2 rounded items-center justify-center ${
                    eventForm.isProject 
                      ? 'bg-black border-black' 
                      : 'bg-white border-[#d1d5db]'
                  }`}>
                    {eventForm.isProject && (
                      <Ionicons name="checkmark" size={12} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Project Selection Dropdown - Hidden when "This is a Project" is checked */}
              {!eventForm.isProject && (
                <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="folder-open" size={16} color="#374151" style={{ marginRight: 6 }} />
                  <Text className="text-[16px] font-semibold text-[#333]">Select Project</Text>
                </View>
                
                {/* Project Dropdown Picker - Single Selection */}
                <DropDownPicker
                  open={projectDropdownOpen}
                  value={selectedProjectValues}
                  items={projects}
                  setOpen={setProjectDropdownOpen}
                  setValue={(callback) => {
                    console.log('Project dropdown setValue called with callback:', callback);
                  }}
                  setItems={setProjects}
                  multiple={true}
                  min={0}
                  max={10}
                  placeholder="Select projects (multiple allowed)"
                  placeholderStyle={{
                    color: '#999',
                    fontSize: 16,
                    fontWeight: '500'
                  }}
                  multipleText={`${selectedProjectValues.length} Projects selected`}
                  multipleTextStyle={{
                    color: '#000000',
                    fontSize: 16,
                    fontWeight: '600'
                  }}
                  onSelectItem={(items) => {
                    console.log('Selected project items:', items);
                    const values = items.map(item => item.value);
                    handleProjectSelection(values);
                  }}
                  loading={isLoadingProjects}
                  activityIndicatorColor="#666"
                  searchable={true}
                  searchPlaceholder="Search projects..."
                  searchTextInputStyle={{
                    fontSize: 16,
                    color: '#333'
                  }}
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderColor: '#e1e8ed',
                    borderRadius: 8,
                    minHeight: 50,
                    paddingHorizontal: 12
                  }}
                  dropDownContainerStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e1e8ed',
                    borderRadius: 8,
                    borderTopWidth: 0,
                    elevation: 3,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    maxHeight: 300
                  }}
                  textStyle={{
                    fontSize: 16,
                    color: '#333',
                    fontWeight: '500'
                  }}
                  selectedItemContainerStyle={{
                    backgroundColor: '#f5f5f5',
                    borderLeftWidth: 3,
                    borderLeftColor: '#000000'
                  }}
                  selectedItemLabelStyle={{
                    color: '#000000',
                    fontWeight: '600'
                  }}
                  listItemContainerStyle={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: '#f0f0f0'
                  }}
                  listItemLabelStyle={{
                    fontSize: 16,
                    color: '#333',
                    flex: 1,
                    marginLeft: 12
                  }}
                  arrowIconStyle={{
                    tintColor: '#666'
                  }}
                  tickIconStyle={{
                    tintColor: '#000000',
                    width: 20,
                    height: 20
                  }}
                  // --- Custom checkbox styling ---
                  renderListItem={(item) => {
                    const isSelected = selectedProjectValues.includes(item.value);
                    // --- Safe access to project data ---
                    const project = item.project || {};
                    
                    return (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          backgroundColor: isSelected ? '#f5f5f5' : 'transparent',
                          borderLeftWidth: isSelected ? 3 : 0,
                          borderLeftColor: '#000000'
                        }}
                        onPress={() => {
                          const newValues = isSelected
                            ? selectedProjectValues.filter(val => val !== item.value)
                            : [...selectedProjectValues, item.value];
                          handleProjectSelection(newValues);
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Custom Checkbox */}
                        <View style={{
                          width: 20,
                          height: 20,
                          borderWidth: 2,
                          borderColor: isSelected ? '#000000' : '#d1d5db',
                          borderRadius: 4,
                          backgroundColor: isSelected ? '#000000' : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color="white" />
                          )}
                        </View>
                        
                        {/* Project Info - Single Line Layout */}
                        <View style={{ flex: 1, marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{
                            fontSize: 16,
                            color: isSelected ? '#000000' : '#333',
                            fontWeight: isSelected ? '600' : '500',
                            flex: 1
                          }}>
                            {item.label || 'Unknown Project'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  badgeTextStyle={{
                    fontSize: 12,
                    color: '#000000',
                    fontWeight: '600'
                  }}
                  badgeContainerStyle={{
                    backgroundColor: '#f0f0f0',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    marginRight: 4,
                    marginBottom: 4
                  }}
                  closeAfterSelecting={false}
                  zIndex={2000}
                  zIndexInverse={2000}
                />
              </View>
              )}

              {/* Employee Selection Dropdown - Only show when project is checked */}
              {eventForm.isProject && (
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="people" size={16} color="#374151" style={{ marginRight: 6 }} />
                    <Text className="text-[16px] font-semibold text-[#333]">Assign to Employee</Text>
                  </View>
                  
                  {/* React Native Dropdown Picker - Multiple Selection with Checkboxes */}
                  <DropDownPicker
                    open={employeeDropdownOpen}
                    value={selectedEmployeeValues}
                    items={employees}
                    setOpen={setEmployeeDropdownOpen}
                    setValue={setSelectedEmployeeValues}
                    setItems={setEmployees}
                    multiple={true}
                    min={0}
                    max={10}
                    placeholder="Select employees (multiple allowed)"
                    placeholderStyle={{
                      color: '#999',
                      fontSize: 16,
                      fontWeight: '500'
                    }}
                    multipleText="Employees selected"
                    multipleTextStyle={{
                      color: '#1e40af',
                      fontSize: 16,
                      fontWeight: '600'
                    }}
                    onSelectItem={(items) => {
                      console.log('Selected items:', items);
                      const values = items.map(item => item.value);
                      handleEmployeeSelection(values);
                    }}
                    loading={isLoadingEmployees}
                    activityIndicatorColor="#666"
                    searchable={true}
                    searchPlaceholder="Search employees..."
                    searchTextInputStyle={{
                      fontSize: 16,
                      color: '#333'
                    }}
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderColor: '#e1e8ed',
                      borderRadius: 8,
                      minHeight: 50,
                      paddingHorizontal: 12
                    }}
                    dropDownContainerStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e1e8ed',
                      borderRadius: 8,
                      borderTopWidth: 0,
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      maxHeight: 300
                    }}
                    textStyle={{
                      fontSize: 16,
                      color: '#333',
                      fontWeight: '500'
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: '#f0f9ff',
                      borderLeftWidth: 3,
                      borderLeftColor: '#1e40af'
                    }}
                    selectedItemLabelStyle={{
                      color: '#1e40af',
                      fontWeight: '600'
                    }}
                    listItemContainerStyle={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderBottomWidth: 1,
                      borderBottomColor: '#f0f0f0'
                    }}
                    listItemLabelStyle={{
                      fontSize: 16,
                      color: '#333',
                      flex: 1,
                      marginLeft: 12
                    }}
                    arrowIconStyle={{
                      tintColor: '#666'
                    }}
                    tickIconStyle={{
                      tintColor: '#1e40af',
                      width: 20,
                      height: 20
                    }}
                    // --- Custom checkbox styling ---
                    renderListItem={(item) => {
                      const isSelected = selectedEmployeeValues.includes(item.value);
                      // --- Safe access to employee data ---
                      const employee = item.employee || {};
                      const employeeEmail = employee.email || '';
                      
                      return (
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            backgroundColor: isSelected ? '#f5f5f5' : 'transparent',
                            borderLeftWidth: isSelected ? 3 : 0,
                            borderLeftColor: '#000000'
                          }}
                          onPress={() => {
                            const newValues = isSelected
                              ? selectedEmployeeValues.filter(val => val !== item.value)
                              : [...selectedEmployeeValues, item.value];
                            handleEmployeeSelection(newValues);
                          }}
                          activeOpacity={0.7}
                        >
                          {/* Custom Checkbox */}
                          <View style={{
                            width: 20,
                            height: 20,
                            borderWidth: 2,
                            borderColor: isSelected ? '#000000' : '#d1d5db',
                            borderRadius: 4,
                            backgroundColor: isSelected ? '#000000' : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={14} color="white" />
                            )}
                          </View>
                          
                          {/* Employee Info - Single Line Layout */}
                          <View style={{ flex: 1, marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{
                              fontSize: 16,
                              color: isSelected ? '#000000' : '#333',
                              fontWeight: isSelected ? '600' : '500',
                              flex: 1
                            }}>
                              {item.label || 'Unknown Employee'}
                            </Text>
                            {employeeEmail && (
                              <Text style={{
                                fontSize: 14,
                                color: '#666',
                                marginLeft: 8,
                                fontStyle: 'italic'
                              }}>
                                {employeeEmail.length > 25 ? employeeEmail.substring(0, 22) + '...' : employeeEmail}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    badgeTextStyle={{
                      fontSize: 12,
                      color: '#1e40af',
                      fontWeight: '600'
                    }}
                    badgeContainerStyle={{
                      backgroundColor: '#e0f2fe',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      marginRight: 4,
                      marginBottom: 4
                    }}
                    closeAfterSelecting={false}
                    zIndex={3000}
                    zIndexInverse={1000}
                  />
                  
                 
                </View>
              )}

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
          </View>
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
