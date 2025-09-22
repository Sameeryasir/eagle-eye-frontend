import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import WeekView from 'react-native-week-view';
import Toast from 'react-native-toast-message';
import getAllTasks from "../services/tasks/getAllTasks";
import { getEventsForLogInUser } from "../services/event/getEventsForLogInUser";
import { getUserRole } from "../services/utils/userRole";
import CustomBottomNav from "./components/CustomBottomNav";

export default function MyWeekView({ navigation }) {
  // --- State Management ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
      setLoading(true);
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
      
      // --- Show error toast ---
      Toast.show({
        type: 'error',
        text1: 'Error Loading Calendar Data',
        text2: 'Failed to load tasks and events',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      
      setEvents([]);
    } finally {
      setLoading(false);
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

  // --- Handle event press ---
  const onEventPress = (event) => {
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
  };

  // --- Show loading screen ---
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3155A1" />
          <Text style={styles.loadingText}>Loading week view...</Text>
        </View>
        <CustomBottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* --- Toggle Buttons (Weekly/Monthly) --- */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, styles.activeButton]} 
          onPress={() => {}} // Already on Weekly view
        >
          <Text style={[styles.toggleText, styles.activeText]}>Weekly</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.toggleButton, styles.inactiveButton]} 
          onPress={() => navigation.navigate('CalenderScreen')}
        >
          <Text style={[styles.toggleText, styles.inactiveText]}>Monthly</Text>
        </TouchableOpacity>
      </View>
      
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  // --- WeekView Container with Natural Flexible Height ---
  weekViewContainer: {
    flex: 0.85, // Takes all available space naturally (not fixed)
  },
  // --- Toggle Button Styles ---
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#000000', // Black background for selected Weekly button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveButton: {
    backgroundColor: 'transparent',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeText: {
    color: '#ffffff', // White text on black background
  },
  inactiveText: {
    color: '#666666', // Gray text for inactive buttons
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center'
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
