
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Alert } from "react-native";
import Timetable from "react-native-calendar-timetable";
import CustomBottomNav from "./components/CustomBottomNav";
import { Ionicons } from "@expo/vector-icons";
import * as Localization from 'expo-localization';
import { getEventsForLogInUser } from "../services/event/getEventsForLogInUser";
import { getUserRole } from "../services/utils/userRole";
import CreateEventModal from "./components/CreateEventModal";
import EventDetailsModal from "./components/EventDetailsModal";
import PastDateDialog from "./components/PastDateDialog";
import TaskDetailsModal from "./components/TaskDetailsModal";

const { width, height } = Dimensions.get("window");


const CalenderDetailScreen = ({ route, navigation }) => {
  // --- Extract data passed from CalenderScreen ---
  const { selectedDate, tasks, selectedTask } = route.params || {};
  
  // --- Debug: Console log the received params ---
  console.log('=== CalenderDetailScreen Debug Info ===');
  console.log('Selected Date:', selectedDate);
  console.log('Tasks Array:', tasks);
  console.log('Tasks Length:', tasks?.length);
  console.log('Selected Task:', selectedTask);
  console.log('Route Params:', route.params);
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

  // --- State for events ---
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

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

  // --- Fetch events function ---
  const fetchEvents = async () => {
    try {
      setIsLoadingEvents(true);
      
      // Check user role - Owner, Employee, and Manager can fetch events
      const userRole = await getUserRole();
      const allowedRoles = ["Owner", "Employee", "Manager"];
      
      if (!allowedRoles.includes(userRole)) {
        console.log('User role is not allowed, skipping event fetch. User role:', userRole);
        setEvents([]);
        return;
      }
      
      const response = await getEventsForLogInUser(); // Fetch all events like tasks service
      console.log('=== fetchEvents Response ===');
      console.log('Response:', response);
      console.log('Response success:', response.success);
      console.log('Response data:', response.data);
      console.log('Response data length:', response.data?.length);
      
      if (response.success && response.data) {
        console.log('=== Filtering Events by Selected Date ===');
        console.log('All events:', response.data);
        console.log('Selected date:', selectedDate);
        
        // --- Filter events by selected date (like tasks are handled) ---
        // Business Rule: Filter all events to show only those for the selected date
        const filteredEvents = response.data.filter(event => {
          if (!event.startTime) return false;
          
          // Convert event date to local timezone and compare with selected date
          const eventDate = new Date(event.startTime);
          const eventDateString = eventDate.getFullYear() + '-' + 
            String(eventDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(eventDate.getDate()).padStart(2, '0');
          
          console.log(`Event "${event.title}" - Event Date: ${eventDateString}, Selected Date: ${selectedDate}`);
          return eventDateString === selectedDate;
        });
        
        console.log('Filtered events for selected date:', filteredEvents);
        setEvents(filteredEvents);
        console.log('Events set successfully');
      } else {
        console.log('No events to set - response.success:', response.success, 'response.data:', response.data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load events. Please try again.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // --- Handler for when event is created ---
  const handleEventCreated = () => {
    fetchEvents();
  };

  // --- Handler for task navigation ---
  const handleViewTask = (task) => {
    navigation.navigate('TaskDetails', { taskId: task.originalTaskId || task.id });
  };


  // --- Fetch events on component mount and when selectedDate changes ---
  useEffect(() => {
    fetchEvents();
  }, [selectedDate]);

  // --- Convert task and event data to Timetable format ---
  useEffect(() => {
    console.log('=== useEffect triggered ===');
    console.log('Tasks in useEffect:', tasks);
    console.log('Tasks length in useEffect:', tasks?.length);
    console.log('Events in useEffect:', events);
    console.log('Events length in useEffect:', events?.length);
    
    const allItems = [];
    
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
    
    // --- Process events ---
    if (events && events.length > 0) {
      console.log('Processing events for timetable...');
      
      const eventItems = events.map((event, index) => {
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
        
        // --- FIXED: Convert UTC times to local time using expo-localization ---
        // Business Rule: Events come from server in UTC format, convert to user's local timezone
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
          projects: event.projects || []
        };
      });
      
      allItems.push(...eventItems);
    }
    
    console.log('Final timetable items (tasks + events):', allItems);
    console.log('Total items count:', allItems.length);
    console.log('Selected date for timetable:', selectedDate ? new Date(selectedDate) : new Date());
    
    setItems(allItems);
  }, [tasks, events]);

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
    const backgroundColor = isEvent ? '#EFF6FF' : '#F9FAFB'; // Blue tint for events, gray for tasks
    const borderColor = isEvent ? '#3B82F6' : priorityColor; // Blue border for events, priority color for tasks

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
        {/* --- Item Title --- */}
        <Text 
          className="text-gray-800 text-sm font-semibold text-center"
          numberOfLines={1}
          style={{ 
            marginBottom: 2,
            lineHeight: 16
          }}
        >
          {item.title}
        </Text>
        
        {/* --- Time Display - Compact for short duration --- */}
        <Text 
          className="text-gray-500 text-xs font-medium text-center"
          numberOfLines={1}
          style={{ 
            lineHeight: isShortDuration ? 12 : 14,
            fontSize: isShortDuration ? 10 : 12
          }}
        >
          {item.startDate.toLocaleTimeString(Localization.locale, { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true,
            timeZone: Localization.timezone 
          })} - {item.endDate.toLocaleTimeString(Localization.locale, { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true,
            timeZone: Localization.timezone 
          })}
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
