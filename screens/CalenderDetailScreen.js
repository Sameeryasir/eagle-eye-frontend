
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Alert } from "react-native";
import Timetable from "react-native-calendar-timetable";
import CustomBottomNav from "./components/CustomBottomNav";
import { Ionicons } from "@expo/vector-icons";
import * as Localization from 'expo-localization';
import { useDispatch } from 'react-redux';
// --- REMOVED: eventSlice import (file doesn't exist) ---
import { getUserRole } from "../services/utils/userRole";
import { getEventsForLogInUser } from "../services/event/getEventsForLogInUser";
import CreateEventModal from "./components/CreateEventModal";
import EventDetailsModal from "./components/EventDetailsModal";
import PastDateDialog from "./components/PastDateDialog";
import TaskDetailsModal from "./components/TaskDetailsModal";

const { width, height } = Dimensions.get("window");


const CalenderDetailScreen = ({ route, navigation }) => {
  // --- FIXED: Removed Redux hooks (eventSlice doesn't exist) ---
  // Using local state instead of Redux since eventSlice is not available
  const dispatch = useDispatch();
  
  // --- Local state for events (replacing Redux state) ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);
  
  // --- Extract data passed from CalenderScreen ---
  const { selectedDate, tasks, selectedTask } = route.params || {};
  
  // --- Debug: Console log the received params ---
  console.log('=== CalenderDetailScreen Debug Info ===');
  console.log('Selected Date:', selectedDate);
  console.log('Tasks Array:', tasks);
  console.log('Tasks Length:', tasks?.length);
  console.log('Selected Task:', selectedTask);
  console.log('Route Params:', route.params);
  console.log('Redux Events:', events);
  console.log('Redux Loading:', loading);
  console.log('Redux Error:', error);
  console.log('=====================================');
  
  // --- State for timetable items ---
  const [items, setItems] = useState([]);
  
  // --- State for task dialog ---
  const [dialogTask, setDialogTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  
  
  // --- State for modals ---
  const [showEventCreationDialog, setShowEventCreationDialog] = useState(false);
  const [showPastDateDialog, setShowPastDateDialog] = useState(false);
  const [dialogEvent, setDialogEvent] = useState(null);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);

  // --- Priority-based color mapping function ---
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
      case 'critical':
        return '#EF4444'; // Red for high priority
      case 'medium':
      case 'normal':
        return '#F59E0B'; // Orange for medium priority
      case 'low':
      case 'lowest':
        return '#10B981'; // Green for low priority
      default:
        return '#6B7280'; // Gray for unknown/no priority
    }
  };

  // --- FIXED: Direct API Event Fetch Handler (eventSlice doesn't exist) ---
  // Using direct API calls and local state instead of Redux since eventSlice is not available
  const fetchEventsForDate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check user role - Owner, Employee, and Manager can fetch events
      const userRole = await getUserRole();
      const allowedRoles = ["Owner", "Employee", "Manager"];
      
      if (!allowedRoles.includes(userRole)) {
        console.log('User role is not allowed, skipping event fetch. User role:', userRole);
        setEvents([]);
        setLoading(false);
        return;
      }
      
      // Call events API directly
      const eventsResponse = await getEventsForLogInUser();
      
      // Update local state with fetched events
      if (eventsResponse && eventsResponse.data) {
        setEvents(eventsResponse.data);
      } else if (eventsResponse && Array.isArray(eventsResponse)) {
        setEvents(eventsResponse);
      } else {
        setEvents([]);
      }
      
      setIsFromCache(false); // Direct API call, not from cache
      console.log('Events fetched successfully:', eventsResponse);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError(error.message || 'Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Handler for when event is created/updated/deleted ---
  const handleEventCreated = () => {
    fetchEventsForDate();
  };

  // --- Handler for task navigation ---
  const handleViewTask = (task) => {
    navigation.navigate('TaskDetails', { taskId: task.originalTaskId || task.id });
  };


  // --- Handle Redux Error (MCP Context 7) ---
  // Monitor errors from local state and show appropriate user feedback
  useEffect(() => {
    if (error) {
      console.error('Events error:', error);
      Alert.alert('Error', error);
      // Clear error after showing it
      setError(null);
    }
  }, [error]);

  // --- Fetch events on component mount and when selectedDate changes ---
  useEffect(() => {
    fetchEventsForDate();
  }, [selectedDate]);

  // --- Convert task and event data to Timetable format ---
  useEffect(() => {
    console.log('=== useEffect triggered ===');
    console.log('Tasks in useEffect:', tasks);
    console.log('Tasks length in useEffect:', tasks?.length);
    console.log('Redux Events in useEffect:', events);
    console.log('Redux Events length in useEffect:', events?.length);
    console.log('Selected date for filtering:', selectedDate);
    
    const allItems = [];
    
    // --- Filter Redux events by selected date (including multi-day events) ---
    // Business Rule: Show events that start, end, or span across the selected date
    let filteredEvents = [];
    if (events && events.length > 0 && selectedDate) {
      console.log('=== Filtering Redux Events by Selected Date ===');
      console.log('All Redux events:', events);
      console.log('Selected date:', selectedDate);
      
      filteredEvents = events.filter(event => {
        if (!event.startTime) return false;
        
        // Convert event dates to local timezone
        const eventStartDate = new Date(event.startTime);
        const eventEndDate = event.endTime ? new Date(event.endTime) : eventStartDate;
        
        // Get date strings for comparison (YYYY-MM-DD format)
        const eventStartDateString = eventStartDate.getFullYear() + '-' + 
          String(eventStartDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(eventStartDate.getDate()).padStart(2, '0');
        
        const eventEndDateString = eventEndDate.getFullYear() + '-' + 
          String(eventEndDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(eventEndDate.getDate()).padStart(2, '0');
        
        // Check if selected date falls within the event's date range
        const isEventOnSelectedDate = selectedDate >= eventStartDateString && selectedDate <= eventEndDateString;
        
        console.log(`Event "${event.title}" - Start: ${eventStartDateString}, End: ${eventEndDateString}, Selected: ${selectedDate}, Show: ${isEventOnSelectedDate}`);
        
        return isEventOnSelectedDate;
      });
      
      console.log('Filtered Redux events for selected date:', filteredEvents);
    }
    
    // --- Process tasks ---
    if (tasks && tasks.length > 0) {
      console.log('Processing tasks for timetable...');
      
      const taskItems = tasks.map((task, index) => {
        console.log(`Processing task ${index}:`, {
          id: task.id,
          title: task.title,
          startTime: task.startTime,
          endTime: task.endTime,
          startTimeType: typeof task.startTime,
          endTimeType: typeof task.endTime
        });
        
        // --- FIXED: Convert task times to local time for proper display ---
        // Business Rule: Tasks come from server in UTC format, convert to local timezone
        // This fixes the issue where tasks created before 3-4 AM don't show up
        let startDate, endDate;
        
        if (task.startTime) {
          // Parse UTC time and convert to local time
          startDate = new Date(task.startTime);
          console.log(`Task UTC startTime: ${task.startTime} -> Local: ${startDate.toLocaleString()}`);
        } else {
          startDate = new Date();
        }
        
        if (task.endTime) {
          // Parse UTC time and convert to local time
          endDate = new Date(task.endTime);
          
          // Apply the same date adjustment for end time
          const selectedDateObj = selectedDate ? new Date(selectedDate) : new Date();
          const taskEndDate = new Date(task.endTime);
          
          const selectedDateStr = selectedDateObj.toDateString();
          const taskEndDateStr = taskEndDate.toDateString();
          
          if (selectedDateStr !== taskEndDateStr) {
            console.log(`Adjusting task end date to match selected date`);
            endDate = new Date(selectedDateObj);
            endDate.setHours(taskEndDate.getHours());
            endDate.setMinutes(taskEndDate.getMinutes());
            endDate.setSeconds(taskEndDate.getSeconds());
            endDate.setMilliseconds(taskEndDate.getMilliseconds());
          }
          
          console.log(`Task UTC endTime: ${task.endTime} -> Local: ${endDate.toLocaleString()}`);
        } else {
          // Default 1 hour duration if no end time
          endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        }
        
        console.log(`Converted dates for task ${index}:`, {
          startDate: startDate,
          endDate: endDate,
          startTimeString: startDate.toLocaleTimeString(),
          endTimeString: endDate.toLocaleTimeString(),
          startDateISO: startDate.toISOString(),
          endDateISO: endDate.toISOString()
        });
        
        // --- Ensure unique key for each task item ---
        // Business Rule: Create stable, unique keys to prevent React key warnings
        // Use task ID as primary key, with fallback to ensure uniqueness
        const taskId = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const uniqueKey = `task-${taskId}`;
        
        return {
          id: uniqueKey,
          key: uniqueKey, // Add explicit key property for React
          title: task.title || 'Untitled Task',
          startDate: startDate,
          endDate: endDate,
          // --- Additional task properties for reference ---
          description: task.description,
          priority: task.priority,
          status: task.status,
          assignedTo: task.assignedTo,
          originalTaskId: task.id,
          type: 'task' // Mark as task
        };
      });
      
      allItems.push(...taskItems);
    }
    
    // --- Process filtered Redux events ---
    if (filteredEvents && filteredEvents.length > 0) {
      console.log('Processing filtered Redux events for timetable...');
      
      const eventItems = filteredEvents.map((event, index) => {
        console.log(`Processing event ${index}:`, {
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          startTimeType: typeof event.startTime,
          endTimeType: typeof event.endTime,
          // --- Debug: Log project and employee assignment information ---
          projects: event.projects,
          projectsCount: event.projects ? event.projects.length : 0,
          assignedTo: event.assignedTo,
          assignedToCount: event.assignedTo ? event.assignedTo.length : 0
        });
        
        // --- Debug: Log detailed project information ---
        if (event.projects && event.projects.length > 0) {
          console.log(`Event "${event.title}" has ${event.projects.length} project(s):`);
          event.projects.forEach((project, projectIndex) => {
            console.log(`  Project ${projectIndex + 1}:`, {
              id: project.id,
              name: project.name,
              description: project.description,
              startDate: project.startDate,
              createdAt: project.createdAt
            });
          });
        } else {
          console.log(`Event "${event.title}" has no projects assigned`);
        }
        
        // --- Debug: Log detailed employee assignment information ---
        if (event.assignedTo && event.assignedTo.length > 0) {
          console.log(`Event "${event.title}" has ${event.assignedTo.length} employee(s) assigned:`);
          event.assignedTo.forEach((employee, employeeIndex) => {
            console.log(`  Employee ${employeeIndex + 1}:`, {
              id: employee.id,
              email: employee.email,
              first_name: employee.first_name,
              last_name: employee.last_name,
              title: employee.title
            });
          });
        } else {
          console.log(`Event "${event.title}" has no employees assigned`);
        }
        
        // --- FIXED: Convert UTC times to local time and handle multi-day events ---
        // Business Rule: Events come from server in UTC format, convert to user's local timezone
        // For multi-day events, adjust display times based on selected date
        let startDate, endDate;
        
        if (event.startTime) {
          // Parse UTC time and convert to local time using user's timezone
          startDate = new Date(event.startTime);
          // Use expo-localization to get proper local time display
          const localStartTime = startDate.toLocaleString(Localization.locale, {
            timeZone: Localization.timezone
          });
          console.log(`UTC startTime: ${event.startTime} -> Local (${Localization.timezone}): ${localStartTime}`);
        } else {
          startDate = new Date();
        }
        
        if (event.endTime) {
          // Parse UTC time and convert to local time using user's timezone
          endDate = new Date(event.endTime);
          // Use expo-localization to get proper local time display
          const localEndTime = endDate.toLocaleString(Localization.locale, {
            timeZone: Localization.timezone
          });
          console.log(`UTC endTime: ${event.endTime} -> Local (${Localization.timezone}): ${localEndTime}`);
        } else {
          // Default 1 hour duration if no end time
          endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        }
        
        // --- Handle multi-day events display ---
        // Business Rule: For multi-day events, show appropriate time range for the selected date
        const selectedDateObj = selectedDate ? new Date(selectedDate) : new Date();
        const eventStartDateString = startDate.getFullYear() + '-' + 
          String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(startDate.getDate()).padStart(2, '0');
        const eventEndDateString = endDate.getFullYear() + '-' + 
          String(endDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(endDate.getDate()).padStart(2, '0');
        const selectedDateString = selectedDateObj.getFullYear() + '-' + 
          String(selectedDateObj.getMonth() + 1).padStart(2, '0') + '-' + 
          String(selectedDateObj.getDate()).padStart(2, '0');
        
        // Adjust display times for multi-day events
        if (selectedDateString !== eventStartDateString || selectedDateString !== eventEndDateString) {
          console.log(`Multi-day event detected: "${event.title}"`);
          console.log(`Event spans: ${eventStartDateString} to ${eventEndDateString}, showing for: ${selectedDateString}`);
          
          // If this is the start date, show from start time to end of day
          if (selectedDateString === eventStartDateString) {
            endDate = new Date(selectedDateObj);
            endDate.setHours(23, 59, 59, 999); // End of day
            console.log(`Start day: showing from ${startDate.toLocaleTimeString()} to end of day`);
          }
          // If this is the end date, show from start of day to end time
          else if (selectedDateString === eventEndDateString) {
            startDate = new Date(selectedDateObj);
            startDate.setHours(0, 0, 0, 0); // Start of day
            console.log(`End day: showing from start of day to ${endDate.toLocaleTimeString()}`);
          }
          // If this is a middle day, show full day
          else {
            startDate = new Date(selectedDateObj);
            startDate.setHours(0, 0, 0, 0); // Start of day
            endDate = new Date(selectedDateObj);
            endDate.setHours(23, 59, 59, 999); // End of day
            console.log(`Middle day: showing full day`);
          }
        }
        
        console.log(`Converted dates for event ${index}:`, {
          startDate: startDate,
          endDate: endDate,
          startTimeString: startDate.toLocaleTimeString(),
          endTimeString: endDate.toLocaleTimeString(),
          startDateISO: startDate.toISOString(),
          endDateISO: endDate.toISOString()
        });
        
        // --- Ensure unique key for each event item ---
        // Business Rule: Create stable, unique keys to prevent React key warnings
        // Use event ID as primary key, with fallback to ensure uniqueness
        const eventId = event.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const uniqueKey = `event-${eventId}`;
        
        // --- Determine if this is a multi-day event ---
        const isMultiDayEvent = eventStartDateString !== eventEndDateString;
        
        return {
          id: uniqueKey,
          key: uniqueKey, // Add explicit key property for React
          title: event.title || 'Untitled Event',
          startDate: startDate,
          endDate: endDate,
          // --- Additional event properties for reference ---
          description: event.description,
          priority: event.priority || 'medium',
          status: event.status || 'pending',
          originalEventId: event.id,
          type: 'event', // Mark as event
          // --- Add project and employee assignment information ---
          assignedTo: event.assignedTo || [],
          projects: event.projects || [],
          // --- Multi-day event properties ---
          isMultiDayEvent: isMultiDayEvent,
          originalStartDate: eventStartDateString,
          originalEndDate: eventEndDateString,
          currentDisplayDate: selectedDateString
        };
      });
      
      allItems.push(...eventItems);
    }
    
    console.log('Final timetable items (tasks + filtered Redux events):', allItems);
    console.log('Total items count:', allItems.length);
    console.log('Selected date for timetable:', selectedDate ? new Date(selectedDate) : new Date());
    
    setItems(allItems);
  }, [tasks, events, selectedDate]);

  // --- Always show CalenderDetailScreen regardless of task count ---
  // Removed the early return for no tasks - now always displays the screen

  // --- Custom render item component (styled for both tasks and events) ---
  const renderItem = ({ style, item }) => {
    const priorityColor = getPriorityColor(item.priority);

    // --- Calculate duration to determine layout ---
    const duration = item.endDate.getTime() - item.startDate.getTime();
    const durationMinutes = Math.round(duration / (1000 * 60));
    const isShortDuration = durationMinutes < 60; // Less than 1 hour

    // --- Handle item press ---
    const handleItemPress = () => {
      if (isEvent) {
        setDialogEvent(item);
        setShowEventDetailsDialog(true);
      } else {
        setDialogTask(item);
        setShowTaskDialog(true);
      }
    };

    // --- Different styling for tasks vs events ---
    const isEvent = item.type === 'event';
    const isMultiDayEvent = item.isMultiDayEvent;
    
    // --- Enhanced styling for multi-day events ---
    let backgroundColor, borderColor, borderStyle;
    
    if (isEvent) {
      if (isMultiDayEvent) {
        // Multi-day events get a special gradient-like background
        backgroundColor = '#DBEAFE'; // Lighter blue for multi-day events
        borderColor = '#1D4ED8'; // Darker blue border
        borderStyle = 'dashed'; // Dashed border to indicate continuation
      } else {
        // Single-day events
        backgroundColor = '#EFF6FF'; // Standard blue tint
        borderColor = '#3B82F6'; // Standard blue border
        borderStyle = 'solid';
      }
    } else {
      // Tasks
      backgroundColor = '#F9FAFB'; // Gray for tasks
      borderColor = priorityColor; // Priority color for tasks
      borderStyle = 'solid';
    }

    return (
      <TouchableOpacity
        style={[
          style,
          {
            backgroundColor: backgroundColor,
            borderRadius: 6,
            padding: isShortDuration ? 4 : 8,
            borderLeftWidth: 3,
            borderLeftColor: borderColor,
            borderStyle: borderStyle, // Apply dashed border for multi-day events
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 1,
            },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
            justifyContent: 'center',
          }
        ]}
        activeOpacity={0.6}
        onPress={handleItemPress}
      >
        {/* --- Item Title with Multi-day Indicator --- */}
        <Text 
          className="text-gray-800 text-sm font-semibold text-center"
          numberOfLines={1}
          style={{ 
            marginBottom: 2,
            lineHeight: 16
          }}
        >
          {isMultiDayEvent ? `📅 ${item.title}` : item.title}
        </Text>
        
        {/* --- Time Display - Enhanced for multi-day events --- */}
        <Text 
          className="text-gray-500 text-xs font-medium text-center"
          numberOfLines={1}
          style={{ 
            lineHeight: isShortDuration ? 12 : 14,
            fontSize: isShortDuration ? 10 : 12
          }}
        >
          {isMultiDayEvent ? (
            // Show date range for multi-day events
            `${item.originalStartDate} to ${item.originalEndDate}`
          ) : (
            // Show time range for single-day events
            `${item.startDate.toLocaleTimeString(Localization.locale, { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: true,
              timeZone: Localization.timezone 
            })} - ${item.endDate.toLocaleTimeString(Localization.locale, { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true,
              timeZone: Localization.timezone 
            })}`
          )}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {/* --- Header with selected date --- */}
        <View className="bg-white border-b-2 border-gray-200 shadow-sm" style={{ elevation: 3 }}>
          <View className="flex-row justify-between items-center px-5 py-4">
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-500 tracking-wider mb-1 uppercase">
                {items.length > 0 ? 'SCHEDULED ITEMS' : 'SCHEDULE VIEW'}
              </Text>
              <Text className="text-lg font-semibold text-gray-800 leading-6">
                {selectedDate ? new Date(selectedDate).toLocaleDateString(Localization.locale, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  timeZone: Localization.timezone
                }) : 'Selected Date'}
              </Text>
            </View>
            <View className="items-center bg-gray-100 px-3 py-2 rounded-lg min-w-15">
              <Text className="text-xl font-bold text-gray-800 leading-6">{items.length}</Text>
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {items.length === 1 ? 'Item' : 'Items'}
              </Text>
            </View>
          </View>
        </View>
        
        <Timetable
          items={items}
          renderItem={renderItem}
          date={selectedDate ? new Date(selectedDate) : new Date()} // Use the selected date from navigation
          fromHour={0} // 12 AM
          toHour={24}  // 12 AM next day - Shows until 11:59 PM clearly
          is12Hour={true} // 12-hour format
          hourHeight={60}
          timeWidth={60}
          // --- FIXED: Show events that start on the selected date ---
          // The timetable will automatically filter items by the date prop
        />
      </ScrollView>
      

      {/* --- Custom Bottom Navigation - Always Visible --- */}
      <CustomBottomNav 
        handleFabPress={async () => {
          // Check user role and only show event creation dialog for Owner
          const userRole = await getUserRole();
          if (userRole === "Owner") {
            // Check if selected date is in the past
            const today = new Date();
            const selectedDateObj = selectedDate ? new Date(selectedDate) : new Date();
            
            // Set time to start of day for accurate comparison
            today.setHours(0, 0, 0, 0);
            selectedDateObj.setHours(0, 0, 0, 0);
            
            const isPastDate = selectedDateObj < today;
            
            // Only show event creation dialog if date is today or future
            if (!isPastDate) {
              setShowEventCreationDialog(true);
            } else {
              // Show custom dialog for past date
              setShowPastDateDialog(true);
            }
          }
        }}
      />
      
      {/* --- Modal Components --- */}
      <TaskDetailsModal
        visible={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        task={dialogTask}
        onViewTask={handleViewTask}
      />

      <CreateEventModal
        visible={showEventCreationDialog}
        onClose={() => setShowEventCreationDialog(false)}
        selectedDate={selectedDate}
        onEventCreated={handleEventCreated}
      />

      <PastDateDialog
        visible={showPastDateDialog}
        onClose={() => setShowPastDateDialog(false)}
      />

      <EventDetailsModal
        visible={showEventDetailsDialog}
        onClose={() => setShowEventDetailsDialog(false)}
        event={dialogEvent}
        onEventUpdated={handleEventCreated}
      />
    </View>
  );
};

export default CalenderDetailScreen;
