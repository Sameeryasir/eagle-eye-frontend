import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import WeekView from 'react-native-week-view';
import Toast from 'react-native-toast-message';
import getAllTasks from "../../services/tasks/getAllTasks";
import { getEventsForLogInUser } from "../../services/event/getEventsForLogInUser";
import { getUserRole } from "../../services/utils/userRole";
import CustomBottomNav from "./CustomBottomNav";
import TaskDetailsModal from "./TaskDetailsModal";
import EventDetailsModal from "./EventDetailsModal";
import CreateEventModal from "./CreateEventModal";
import PastDateDialog from "./PastDateDialog";

export default function MyWeekView({ navigation }) {
  // --- State Management ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  
  // --- State for modals (same pattern as CalenderDetailScreen) ---
  const [dialogTask, setDialogTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [dialogEvent, setDialogEvent] = useState(null);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);
  
  // --- State for event creation (same pattern as CalenderDetailScreen) ---
  const [showEventCreationDialog, setShowEventCreationDialog] = useState(false);
  const [showPastDateDialog, setShowPastDateDialog] = useState(false);
  
  // --- Screen dimensions removed - using flexible approach ---

  // --- Priority-based color mapping function (same as CalenderDetailScreen) ---
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

  // --- Dynamic Spacing Logic ---
  // Calculate dynamic spacing based on event density and overlapping
  const calculateDynamicSpacing = (events) => {
    // Group events by time slots (30-minute intervals for more precise overlap detection)
    const timeSlotGroups = {};
    
    events.forEach(event => {
      const startTime = event.startDate.getTime();
      const endTime = event.endDate.getTime();
      
      // Create 30-minute time slots
      const slotDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
      const startSlot = Math.floor(startTime / slotDuration) * slotDuration;
      const endSlot = Math.ceil(endTime / slotDuration) * slotDuration;
      
      // Add event to all overlapping time slots
      for (let slot = startSlot; slot < endSlot; slot += slotDuration) {
        const slotKey = new Date(slot).toISOString();
        if (!timeSlotGroups[slotKey]) {
          timeSlotGroups[slotKey] = [];
        }
        timeSlotGroups[slotKey].push(event);
      }
    });

    // Calculate spacing for each event based on maximum overlap in its time range
    const eventsWithSpacing = events.map(event => {
      const startTime = event.startDate.getTime();
      const endTime = event.endDate.getTime();
      const slotDuration = 30 * 60 * 1000;
      const startSlot = Math.floor(startTime / slotDuration) * slotDuration;
      const endSlot = Math.ceil(endTime / slotDuration) * slotDuration;
      
      // Find maximum overlap count in the event's time range
      let maxOverlap = 1;
      for (let slot = startSlot; slot < endSlot; slot += slotDuration) {
        const slotKey = new Date(slot).toISOString();
        const overlapCount = timeSlotGroups[slotKey]?.length || 1;
        maxOverlap = Math.max(maxOverlap, overlapCount);
      }
      
      // Dynamic spacing calculation based on maximum overlap
      const baseMargin = 1;
      const basePadding = 2;
      const baseMinHeight = 20;
      
      let dynamicMargin = baseMargin;
      let dynamicPadding = basePadding;
      let dynamicMinHeight = baseMinHeight;
      let fontSize = 12;
      
      if (maxOverlap === 1) {
        // Single event - can be larger and more prominent
        dynamicMargin = 2;
        dynamicPadding = 4;
        dynamicMinHeight = 35;
        fontSize = 13;
      } else if (maxOverlap === 2) {
        // Two events - moderate spacing
        dynamicMargin = 1.5;
        dynamicPadding = 3;
        dynamicMinHeight = 28;
        fontSize = 12;
      } else if (maxOverlap === 3) {
        // Three events - compact spacing
        dynamicMargin = 1;
        dynamicPadding = 2;
        dynamicMinHeight = 22;
        fontSize = 11;
      } else if (maxOverlap >= 4) {
        // Four or more events - very compact spacing
        dynamicMargin = 0.5;
        dynamicPadding = 1;
        dynamicMinHeight = 18;
        fontSize = 10;
      }
      
      return {
        ...event,
        dynamicSpacing: {
          margin: dynamicMargin,
          padding: dynamicPadding,
          minHeight: dynamicMinHeight,
          fontSize: fontSize,
          maxOverlap: maxOverlap,
          // Add priority-based adjustments
          priorityMultiplier: event.priority === 'high' ? 1.2 : event.priority === 'low' ? 0.8 : 1.0
        }
      };
    });

    return eventsWithSpacing;
  };

  // --- Fetch Tasks and Events from API ---
  const fetchData = async () => {
    try {
      setError(null);

      // --- Fetch tasks and events in parallel ---
      const [tasksResponse, eventsResponse] = await Promise.all([
        getAllTasks(),
        fetchEventsWithRoleCheck()
      ]);

      const calendarEvents = [];

      // --- Process tasks ---
      if (tasksResponse.success && tasksResponse.data) {
        tasksResponse.data.forEach(task => {
          if (task.startTime) {
            calendarEvents.push({
              id: `task-${task.id}`,
              title: task.title, // For modals
              description: task.title, // For displaying in WeekView cards (library uses description field)
              taskDescription: task.description || 'No description provided', // Actual task description
              startDate: new Date(task.startTime),
              endDate: task.endTime ? new Date(task.endTime) : new Date(new Date(task.startTime).getTime() + 60 * 60 * 1000),
              color: getPriorityColor(task.priority), // Use priority-based color
              type: 'task',
              priority: task.priority,
              status: task.status,
              assignedTo: task.assignedTo,
              originalTaskId: task.id
            });
          }
        });
      }

      // --- Process events ---
      if (eventsResponse && eventsResponse.length > 0) {
        eventsResponse.forEach(event => {
          if (event.startTime) {
            // --- Calculate event date strings for multi-day detection ---
            const eventStartDate = new Date(event.startTime);
            const eventEndDate = event.endTime ? new Date(event.endTime) : eventStartDate;
            
            const eventStartDateString = eventStartDate.getFullYear() + '-' + 
              String(eventStartDate.getMonth() + 1).padStart(2, '0') + '-' + 
              String(eventStartDate.getDate()).padStart(2, '0');
            
            const eventEndDateString = eventEndDate.getFullYear() + '-' + 
              String(eventEndDate.getMonth() + 1).padStart(2, '0') + '-' + 
              String(eventEndDate.getDate()).padStart(2, '0');
            
            // --- Determine if this is a multi-day event ---
            const isMultiDayEvent = eventStartDateString !== eventEndDateString;
            
            calendarEvents.push({
              id: `event-${event.id}`,
              title: event.title, // For modals
              description: event.title, // For displaying in WeekView cards (library uses description field)
              eventDescription: event.description || 'No description provided', // Actual event description
              startDate: new Date(event.startTime),
              endDate: event.endTime ? new Date(event.endTime) : new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000),
              color: '#3B82F6', // Blue color for events
              type: 'event',
              priority: event.priority || 'medium',
              status: event.status || 'pending',
              originalEventId: event.id,
              assignedTo: event.assignedTo || [],
              projects: event.projects || [],
              // --- Multi-day event properties (same as CalendarDetailScreen) ---
              isMultiDayEvent: isMultiDayEvent,
              originalStartDate: eventStartDateString,
              originalEndDate: eventEndDateString,
              currentDisplayDate: new Date().getFullYear() + '-' + 
                String(new Date().getMonth() + 1).padStart(2, '0') + '-' + 
                String(new Date().getDate()).padStart(2, '0') // Current date for week view
            });
          }
        });
      }

      setEvents(calendarEvents);

    } catch (err) {
      console.error('WeekView - Error fetching data:', err);
      setError(err.message);
      
      Toast.show({
        type: 'error',
        text1: 'Error Loading Calendar Data',
        text2: 'Failed to load tasks and events',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      
      setEvents([]);
    }
  };

  // --- Helper function to fetch events with role check ---
  const fetchEventsWithRoleCheck = async () => {
    try {
      const userRole = await getUserRole();
      const allowedRoles = ["Owner", "Employee", "Manager"];
      
      if (!allowedRoles.includes(userRole)) {
        console.log('WeekView - User role not allowed for events:', userRole);
        return [];
      }

      const response = await getEventsForLogInUser();
      return response.success ? response.data : [];
    } catch (err) {
      console.error('WeekView - Error fetching events:', err);
      return [];
    }
  };

  // --- Load data on component mount ---
  useEffect(() => {
    const loadData = async () => {
      // Fetch user role first for FAB visibility
      try {
        const role = await getUserRole();
        setUserRole(role);
        console.log('WeekView - User role:', role);
      } catch (err) {
        console.error('WeekView - Error fetching user role:', err);
        setUserRole("Employee"); // Set to non-Owner role if fetch fails
      } finally {
        setIsRoleLoading(false); // Role loading is complete
      }
      
      // Then fetch calendar data
      await fetchData();
    };
    
    loadData();
  }, []);

  // --- Handler for task navigation (same as CalenderDetailScreen) ---
  const handleViewTask = (task) => {
    navigation.navigate('TaskDetails', { taskId: task.originalTaskId || task.id });
  };

  // --- Handle event press (same pattern as CalenderDetailScreen) ---
  const onEventPress = (event) => {
    // Check if it's a task or event and open appropriate modal
    if (event.type === 'task') {
      setDialogTask(event);
      setShowTaskDialog(true);
    } else if (event.type === 'event') {
      setDialogEvent(event);
      setShowEventDetailsDialog(true);
    } else {
      // Fallback to Toast for unknown types
      Toast.show({
        type: 'info',
        text1: event.title || event.description,
        text2: `${event.startDate.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })} - ${event.endDate.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })}`,
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  // --- Event Creation Handler (same pattern as CalenderDetailScreen) ---
  const handleEventCreated = () => {
    // Refresh data when event is created
    fetchData();
    setShowEventCreationDialog(false);
    
    Toast.show({
      type: 'success',
      text1: 'Event Created',
      text2: 'New event has been added to your calendar',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 80,
    });
  };

  // --- FAB Plus Button Handler (always creates events for current date) ---
  const handleFabPlusPress = async () => {
    try {
      // Check user role and only show event creation dialog for Owner
      const userRole = await getUserRole();
      if (userRole === "Owner") {
        // Always allow event creation since we're using current date (today)
        // No need to check if current date is in the past since we're always using today
        setShowEventCreationDialog(true);
      } else {
        // Show access denied message for non-Owner users
        Toast.show({
          type: 'error',
          text1: 'Access Denied',
          text2: 'Only Owners can create events',
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });
      }
    } catch (err) {
      console.error('WeekView - Error checking user role for event creation:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to check user permissions',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };


  return (
    <View style={styles.container}>
      {/* --- WeekView with proper bottom spacing --- */}
      <View style={styles.weekViewContainer}>
        <WeekView
          events={events}
          selectedDate={currentDate}     // Controls which week to show
          numberOfDays={7}              // Show full week
          formatDateHeader="ddd M/D"    // Day format (e.g. Sun 9/21, Mon 9/22)
          hoursInDisplay={8}  // Reduced from 12 to 8 hours for better fit in smaller height
          startHour={6}        // Start from 6 AM instead of midnight
          endHour={22}         // End at 10 PM instead of midnight
          formatTimeLabel="h:mm a"

          // Navigation
          onSwipeNext={() => {
            const next = new Date(currentDate);
            next.setDate(currentDate.getDate() + 7);
            setCurrentDate(next);
          }}
          onSwipePrev={() => {
            const prev = new Date(currentDate);
            prev.setDate(currentDate.getDate() - 7);
            setCurrentDate(prev);
          }}

          // Event click
          onEventPress={onEventPress}

          // Styles (same as CalenderDetailScreen)
          headerStyle={styles.header}
          todayHeaderStyle={styles.todayHeader}
          hourTextStyle={styles.hourText}
          eventContainerStyle={styles.eventContainer}
        />
      </View>
      
      {/* --- FAB (Floating Action Button) with Plus Icon - Only for Owner role --- */}
  
      
      <CustomBottomNav />
      
      {/* --- Modal Components (same pattern as CalenderDetailScreen) --- */}
      <TaskDetailsModal
        visible={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        task={dialogTask}
        onViewTask={handleViewTask}
      />

      <EventDetailsModal
        visible={showEventDetailsDialog}
        onClose={() => setShowEventDetailsDialog(false)}
        event={dialogEvent}
        onEventUpdated={() => {
          // Refresh data when event is updated
          fetchData();
        }}
      />

      {/* --- Event Creation Modal (same pattern as CalenderDetailScreen) --- */}
      <CreateEventModal
        visible={showEventCreationDialog}
        onClose={() => setShowEventCreationDialog(false)}
        selectedDate={new Date().getFullYear() + '-' + 
          String(new Date().getMonth() + 1).padStart(2, '0') + '-' + 
          String(new Date().getDate()).padStart(2, '0')} // Always use current date (today) for event creation
        onEventCreated={handleEventCreated}
      />

      {/* --- Past Date Dialog (same pattern as CalenderDetailScreen) --- */}
      <PastDateDialog
        visible={showPastDateDialog}
        onClose={() => setShowPastDateDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
  },
  // --- WeekView Container with Natural Flexible Height ---
  weekViewContainer: {
    flex: 0.85, // Takes all available space since no toggle buttons above
  },
  header: { 
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 0,
  },
  todayHeader: {
    backgroundColor: '#007AFF',
    color: 'white'
  },
  hourText: { 
    color: '#333' 
  },
  eventContainer: {
    borderRadius: 4,
    padding: 2, // Base padding - will be overridden by dynamic spacing
    margin: 1,  // Base margin - will be overridden by dynamic spacing
    minHeight: 20, // Base min height - will be overridden by dynamic spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    // Ensure text doesn't get cut off
    overflow: 'visible',
    // Better text wrapping for longer event names
    flexWrap: 'wrap',
  },
  // --- FAB (Floating Action Button) Styles ---
  fab: {
    position: 'absolute',
    bottom: 100, // Position above the CustomBottomNav (adjust as needed)
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000000', // Black color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8, // Android shadow
    zIndex: 1000, // Ensure it's above other components
  },
  fabText: {
    color: 'white',
    fontSize: 24, // Larger font size for plus icon
    fontWeight: 'bold',
  },
});
