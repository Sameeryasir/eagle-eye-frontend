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

export default function MyWeekView({ navigation }) {
  // --- State Management ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  
  // --- State for modals (same pattern as CalenderDetailScreen) ---
  const [dialogTask, setDialogTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [dialogEvent, setDialogEvent] = useState(null);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);
  
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
              description: task.title,
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
            calendarEvents.push({
              id: `event-${event.id}`,
              description: event.title,
              startDate: new Date(event.startTime),
              endDate: event.endTime ? new Date(event.endTime) : new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000),
              color: '#3B82F6', // Blue color for events
              type: 'event',
              priority: event.priority || 'medium',
              status: event.status || 'pending',
              originalEventId: event.id,
              assignedTo: event.assignedTo || [],
              projects: event.projects || []
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
    fetchData();
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
        text1: event.description,
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


  return (
    <View style={styles.container}>
      {/* --- WeekView with natural flexible height --- */}
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
    padding: 2,
    margin: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
