import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Platform, ActivityIndicator, Keyboard, TouchableWithoutFeedback, FlatList } from 'react-native';
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
    assignedTo: [], // Store selected employees (backend expects this field)
    projects: [] // Store selected projects (backend expects this field)
  });

  // --- State for date and time pickers (following task creation pattern) ---
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date());
  const [isCreating, setIsCreating] = useState(false);

  // --- State for keyboard handling (following UpdateTaskModal pattern) ---
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isDropdownInteracting, setIsDropdownInteracting] = useState(false);
  
  // --- Refs for scroll management ---
  const scrollViewRef = useRef(null);
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

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

  // --- Set current time when modal opens (following task creation pattern) ---
  useEffect(() => {
    // Add keyboard listeners with height tracking (following UpdateTaskModal pattern)
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    if (visible) {
      const now = new Date();
      const eventDate = selectedDate ? new Date(selectedDate) : new Date();
      
      // --- FIXED: Use selectedDate as the base date for event creation ---
      // Business Rule: When user taps on a specific date (like 29th), the event should start from that date
      // This ensures the date picker starts from the selected date, not today's date
      const currentStartDateTime = new Date(eventDate);
      
      // --- Smart time setting based on selected date ---
      // If selected date is today, use current time
      // If selected date is in the future, use a reasonable default time (9:00 AM)
      const today = new Date();
      const isToday = eventDate.toDateString() === today.toDateString();
      
      if (isToday) {
        // For today's date, use current time
        currentStartDateTime.setHours(now.getHours());
        currentStartDateTime.setMinutes(now.getMinutes());
        currentStartDateTime.setSeconds(0);
        currentStartDateTime.setMilliseconds(0);
      } else {
        // For future dates, use a reasonable default time (9:00 AM)
        currentStartDateTime.setHours(9);
        currentStartDateTime.setMinutes(0);
        currentStartDateTime.setSeconds(0);
        currentStartDateTime.setMilliseconds(0);
      }
      
      // Set end time to 1 hour after start time
      const currentEndDateTime = new Date(currentStartDateTime);
      currentEndDateTime.setHours(currentEndDateTime.getHours() + 1);
      
      setStartDateTime(currentStartDateTime);
      setEndDateTime(currentEndDateTime);
      
      // Update form with current times (display format)
      const startTimeString = currentStartDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const endTimeString = currentEndDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      
      setEventForm(prev => ({
        ...prev,
        startTime: startTimeString,
        endTime: endTimeString
      }));

      // Always fetch projects when modal opens
      fetchProjects();
    }

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [visible, selectedDate]);

  // --- Event form handlers ---
  const handleEventFormChange = (field, value) => {
    setEventForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetEventForm = () => {
    console.log('=== Resetting Event Form ===');
    console.log('Before reset - assignedTo:', eventForm.assignedTo);
    console.log('Before reset - projects:', eventForm.projects);
    console.log('Before reset - selectedEmployeeValues:', selectedEmployeeValues);
    console.log('Before reset - selectedProjectValues:', selectedProjectValues);
    
    setEventForm({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      isProject: false, // Reset checkbox to unchecked
      assignedTo: [], // Reset assignedTo field (for employees)
      projects: [] // Reset projects field (for projects)
    });
    setStartDateTime(new Date());
    setEndDateTime(new Date());
    setSelectedEmployeeValues([]); // Reset dropdown selections
    setEmployeeDropdownOpen(false); // Close dropdown when form is reset
    setSelectedProjectValues([]); // Reset project selection
    setProjectDropdownOpen(false); // Close project dropdown when form is reset
    
    console.log('Form reset completed');
    console.log('=== End Form Reset ===');
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
      // If checkbox is checked, fetch employees and clear project selection
      console.log('Project checkbox is checked - fetching employees and clearing projects');
      fetchEmployees();
      // Clear project selection when switching to employee mode
      setSelectedProjectValues([]);
      handleEventFormChange('projects', []); // Clear projects field
    } else {
      // If checkbox is unchecked, clear selected employees and keep project selection
      console.log('Project checkbox is unchecked - clearing employees');
      setSelectedEmployeeValues([]);
      handleEventFormChange('assignedTo', []); // Clear assignedTo field (employees)
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
    
    // Store project objects in projects field (backend expects this for projects)
    handleEventFormChange('projects', selectedProjects);
    
    // Clear employee selection when projects are selected (mutual exclusivity)
    if (values.length > 0) {
      setSelectedEmployeeValues([]);
      handleEventFormChange('assignedTo', []);
      console.log('Cleared employee selection due to project selection');
    }
    
    console.log('Updated form with projects:', selectedProjects);
    console.log('=== End handleProjectSelection ===');
  };

  // --- Handle multiple employee selection from dropdown ---
  const handleEmployeeSelection = (values) => {
    console.log('=== Employee Selection Debug ===');
    console.log('Selected values:', values);
    console.log('Available employees:', employees);
    
    setSelectedEmployeeValues(values);
    
    // Find the selected employee objects
    const selectedEmployees = employees
      .filter(emp => values.includes(emp.value))
      .map(emp => emp.employee);
    
    console.log('Selected employee objects:', selectedEmployees);
    console.log('Employee IDs being stored:', selectedEmployees.map(emp => emp.id));
    
    // Store employee objects in assignedTo field (backend expects this for employees)
    handleEventFormChange('assignedTo', selectedEmployees);
    
    // Clear project selection when employees are selected (mutual exclusivity)
    if (values.length > 0) {
      setSelectedProjectValues([]);
      handleEventFormChange('projects', []);
      console.log('Cleared project selection due to employee selection');
    }
    
    console.log('=== End Employee Selection Debug ===');
  };

  // --- Date and time picker handlers (following task creation pattern) ---
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

  const handleStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(startDateTime);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      
      // --- FIXED: Check for past time based on selectedDate, not just today ---
      // Business Rule: If user selected a specific date (like 29th), they can only select future times
      // If the selected date is today, check against current time
      // If the selected date is in the future, any time is allowed
      const now = new Date();
      const isToday = newDate.toDateString() === now.toDateString();
      
      if (isToday && newDate < now) {
        showErrorDialog(
          'Invalid Time',
          'You cannot select a time in the past for today. Please choose a future time.'
        );
        return;
      }
      
      setStartDateTime(newDate);
      
      // --- REMOVED: Automatic end time update ---
      // Business Rule: Users should manually set end time independently
      // This gives users full control over both start and end times
      
      // Update form display
      const timeString = newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      handleEventFormChange('startTime', timeString);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const newDate = new Date(selectedDate);
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

  const handleEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedTime) {
      if (endDateTime) {
        const newDate = new Date(endDateTime);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);
        
        // --- FIXED: Check for past time based on selectedDate, not just today ---
        // Business Rule: If user selected a specific date (like 29th), they can only select future times
        // If the selected date is today, check against current time
        // If the selected date is in the future, any time is allowed
        const now = new Date();
        const isToday = newDate.toDateString() === now.toDateString();
        
        if (isToday && newDate < now) {
          showErrorDialog(
            'Invalid Time',
            'You cannot select a time in the past for today. Please choose a future time.'
          );
          return;
        }
        
        // Validate that end time is not before start time
        if (newDate >= startDateTime) {
          setEndDateTime(newDate);
          
          // Update form display
          const timeString = newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          handleEventFormChange('endTime', timeString);
        } else {
          showErrorDialog(
            'Invalid Time',
            'End time must be after start time. Please choose a later time.'
          );
          return;
        }
      }
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
    if (endDateTime <= startDateTime) {
      showErrorDialog('Error', 'End time must be after start time. Please adjust your times.');
      return;
    }

    // --- Project-specific validation ---
    // Business Rule: Send ONLY ONE type at a time - either employees OR projects, never both
    // This ensures the API receives clean, unambiguous data
    
    // Validation: Ensure only one assignment type is selected
    const hasEmployees = eventForm.isProject && eventForm.assignedTo && eventForm.assignedTo.length > 0;
    const hasProjects = !eventForm.isProject && eventForm.projects && eventForm.projects.length > 0;
    
    // Additional safety check: prevent both from being true (should not happen with UI logic)
    if (hasEmployees && hasProjects) {
      showErrorDialog(
        'Invalid Assignment',
        'You cannot assign both employees and projects to the same event. Please choose one assignment type.'
      );
      return;
    }

    setIsCreating(true);

    try {
      // --- FIXED: Proper timezone handling for event creation (following task pattern) ---
      // Business Rule: Use same timezone conversion approach as task handling
      // This ensures events created "today" appear on "today" in the calendar for all timezones
      
      // --- Convert to local timezone for date extraction (same as task handling) ---
      // This ensures the event appears on the correct calendar day
      const localStartDate = new Date(startDateTime);
      const localEndDate = new Date(endDateTime);
      
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
      
      // Format the event data - Backend DTO accepts: title, description, startTime, endTime, assignedTo, projects
      // Business Rule: Send ONLY ONE type at a time - either employees OR projects, never both
      let assignedToIds = [];
      let projectIds = [];
      
      if (eventForm.isProject && eventForm.assignedTo && eventForm.assignedTo.length > 0) {
        // Case 1: "This is a Project" is checked - send employee IDs in assignedTo
        assignedToIds = eventForm.assignedTo.map(emp => emp.id);
        console.log('Sending EMPLOYEE IDs to API (assignedTo):', assignedToIds);
      } else if (!eventForm.isProject && eventForm.projects && eventForm.projects.length > 0) {
        // Case 2: "This is a Project" is NOT checked - send project IDs in projects
        projectIds = eventForm.projects.map(proj => proj.id);
        console.log('Sending PROJECT IDs to API (projects):', projectIds);
      } else {
        // Case 3: No assignments - send empty arrays
        assignedToIds = [];
        projectIds = [];
        console.log('No assignments - sending empty arrays to API');
      }
      
      const eventData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || '',
        startTime: startDateTime.toISOString(), // ISO 8601 string format (UTC)
        endTime: endDateTime.toISOString(), // ISO 8601 string format (UTC)
        assignedTo: assignedToIds, // Employee IDs (when isProject is true)
        projects: projectIds // Project IDs (when isProject is false)
      };

      console.log('=== Event Creation Debug (Timezone-Aware) ===');
      console.log('Selected Date:', selectedDate);
      console.log('Start DateTime:', startDateTime.toLocaleString());
      console.log('End DateTime:', endDateTime.toLocaleString());
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
      console.log('Local Start Time:', startDateTime.toLocaleString());
      console.log('Local End Time:', endDateTime.toLocaleString());
      console.log('UTC Start Time:', eventData.startTime);
      console.log('UTC End Time:', eventData.endTime);
      console.log('--- UI STATE DEBUG ---');
      console.log('Is Project:', eventForm.isProject);
      console.log('AssignedTo (UI State):', eventForm.assignedTo);
      console.log('Projects (UI State):', eventForm.projects);
      console.log('Selected Employee Values:', selectedEmployeeValues);
      console.log('Selected Project Values:', selectedProjectValues);
      console.log('--- BACKEND DATA (DTO Compliant) ---');
      console.log('Event Data Being Sent:', eventData);
      console.log('AssignedTo Array (Employee IDs):', eventData.assignedTo);
      console.log('Projects Array (Project IDs):', eventData.projects);
      console.log('Assignment Type:', eventForm.isProject ? 'Employees' : 'Projects');
      console.log('Employee Count:', eventData.assignedTo.length);
      console.log('Project Count:', eventData.projects.length);
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

  // --- Keyboard dismissal function (following UpdateTaskModal pattern) ---
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setIsDropdownInteracting(false);
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
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <Ionicons name="folder-open" size={16} color="#374151" style={{ marginRight: 6 }} />
                      <Text className="text-[16px] font-semibold text-[#333]">Select Project</Text>
                    </View>
                    
                    {/* Select All / Unselect All Button */}
                    {projects.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          const allProjectIds = projects.map(proj => proj.value);
                          const isAllSelected = allProjectIds.every(id => selectedProjectValues.includes(id));
                          
                          if (isAllSelected) {
                            // Unselect all projects
                            setSelectedProjectValues([]);
                            handleEventFormChange('projects', []);
                            console.log('Unselected all projects');
                          } else {
                            // Select all projects
                            setSelectedProjectValues(allProjectIds);
                            const allProjects = projects.map(proj => proj.project);
                            handleEventFormChange('projects', allProjects);
                            console.log('Selected all projects:', allProjectIds);
                          }
                        }}
                        className="bg-blue-100 px-3 py-1 rounded-lg"
                        activeOpacity={0.7}
                      >
                        <Text className="text-blue-600 text-[12px] font-medium">
                          {projects.every(proj => selectedProjectValues.includes(proj.value)) 
                            ? 'Unselect All' 
                            : 'Select All'
                          }
                        </Text>
                      </TouchableOpacity>
                    )}
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
                  multipleText={`${selectedProjectValues.length} Project${selectedProjectValues.length !== 1 ? 's' : ''} Selected`}
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
                    maxHeight: 200
                  }}
                  scrollViewProps={{
                    nestedScrollEnabled: true,
                    showsVerticalScrollIndicator: true,
                    bounces: true,
                    scrollEnabled: true
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
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <Ionicons name="people" size={16} color="#374151" style={{ marginRight: 6 }} />
                      <Text className="text-[16px] font-semibold text-[#333]">Assign to Employee</Text>
                    </View>
                    
                    {/* Select All / Unselect All Button */}
                    {employees.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          const allEmployeeIds = employees.map(emp => emp.value);
                          const isAllSelected = allEmployeeIds.every(id => selectedEmployeeValues.includes(id));
                          
                          if (isAllSelected) {
                            // Unselect all employees
                            setSelectedEmployeeValues([]);
                            handleEventFormChange('assignedTo', []);
                            console.log('Unselected all employees');
                          } else {
                            // Select all employees
                            setSelectedEmployeeValues(allEmployeeIds);
                            const allEmployees = employees.map(emp => emp.employee);
                            handleEventFormChange('assignedTo', allEmployees);
                            console.log('Selected all employees:', allEmployeeIds);
                          }
                        }}
                        className="bg-blue-100 px-3 py-1 rounded-lg"
                        activeOpacity={0.7}
                      >
                        <Text className="text-blue-600 text-[12px] font-medium">
                          {employees.every(emp => selectedEmployeeValues.includes(emp.value)) 
                            ? 'Unselect All' 
                            : 'Select All'
                          }
                        </Text>
                      </TouchableOpacity>
                    )}
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
                    multipleText={`${selectedEmployeeValues.length} Employee${selectedEmployeeValues.length !== 1 ? 's' : ''} Selected`}
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
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{
                              fontSize: 16,
                              color: isSelected ? '#000000' : '#333',
                              fontWeight: isSelected ? '600' : '500',
                              flex: 1
                            }}>
                              {item.label || 'Unknown Employee'}
                            </Text>
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
                  <Text className="text-[16px] font-semibold text-[#333]">End Date & Time *</Text>
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
        </View>

        {/* Fixed Action Button - Better positioning when keyboard is visible */}
        <View 
          className="absolute left-0 right-0 px-5 pt-5 pb-5 bg-transparent items-center"
          style={{ 
            bottom: keyboardVisible ? 10 : 0 
          }}
        >
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

        {/* Date and Time Pickers (following task creation pattern) */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDateTime}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
            minimumDate={selectedDate ? new Date(selectedDate) : new Date()}
          />
        )}

        {showStartTimePicker && (
          <DateTimePicker
            value={startDateTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleStartTimeChange}
            minimumDate={startDateTime.toDateString() === new Date().toDateString() ? new Date() : undefined}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDateTime}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
            minimumDate={selectedDate ? new Date(selectedDate) : startDateTime}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={endDateTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleEndTimeChange}
            minimumDate={endDateTime.toDateString() === new Date().toDateString() ? new Date() : undefined}
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
