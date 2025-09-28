import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Animated,
} from "react-native";
import { Calendar } from "react-native-calendars";
import Toast from 'react-native-toast-message';
import getAllTasks from "../services/tasks/getAllTasks";
import { getEventsForLogInUser } from "../services/event/getEventsForLogInUser";
import { getUserRole } from "../services/utils/userRole";
import CustomBottomNav from "./components/CustomBottomNav";
import MyWeekView from "./components/WeekView";
import CalendarToggle from "./components/CalendarToggle";
import CreateEventModal from "./components/CreateEventModal";

const { height } = Dimensions.get("window");

function CalenderScreen({ navigation }) {
  // --- State Management ---
  const [tasks, setTasks] = useState({});
  const [events, setEvents] = useState({});
  const [combinedItems, setCombinedItems] = useState({}); // Combined tasks and events
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'weekly' - controls which view to show
  const [weekViewEvents, setWeekViewEvents] = useState([]); // Events formatted for WeekView
  const [monthlyViewLoading, setMonthlyViewLoading] = useState(false); // Loading state for monthly view switch
  const [userRole, setUserRole] = useState(null); // User role state to prevent FAB lag
  
  // --- State for create event modal ---
  const [showEventCreationDialog, setShowEventCreationDialog] = useState(false);
  
  // --- Animation values for smooth toggle transitions ---
  const weeklyButtonScale = useState(new Animated.Value(viewMode === 'weekly' ? 1 : 0.95))[0];
  const monthlyButtonScale = useState(new Animated.Value(viewMode === 'monthly' ? 1 : 0.95))[0];

  // --- Helper function for date and time formatting ---
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString(); // "1/15/2024"
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit", 
      hour12: true,
    }); // "2:30 PM"
    return `${dateStr} ${timeStr}`; // "1/15/2024 2:30 PM"
  };


  // --- Fetch Tasks from API ---
  const fetchTasks = async () => {
    try {
      setError(null);
      const response = await getAllTasks();
      
      if (response.success && response.data) {
        // --- Group tasks by date ---
        const tasksByDate = {};
        
        response.data.forEach(task => {
          // Extract date from startTime only
          if (!task.startTime) {
            return; // Skip tasks without startTime
          }
          
          // --- FIXED: Convert to local timezone for date extraction ---
          // Business Rule: Use local date instead of UTC to prevent timezone issues
          // This ensures tasks created "today" appear on "today" in the calendar
          const localDate = new Date(task.startTime);
          const taskDate = localDate.getFullYear() + '-' + 
            String(localDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(localDate.getDate()).padStart(2, '0');
          
          // --- Debug: Log timezone conversion for verification ---
          console.log(`Task "${task.title}" - Original: ${task.startTime}, Local Date: ${localDate.toLocaleDateString()}, Task Date: ${taskDate}`);
          
          if (!tasksByDate[taskDate]) {
            tasksByDate[taskDate] = [];
          }
          
          tasksByDate[taskDate].push({
            id: task.id,
            title: task.title,
            // --- Keep original date objects for timetable ---
            startTime: task.startTime ? new Date(task.startTime) : null,
            endTime: task.endTime ? new Date(task.endTime) : null,
            // --- Add formatted date + time strings for display ---
            startTimeFormatted: task.startTime ? formatDateTime(task.startTime) : 'No time set',
            endTimeFormatted: task.endTime ? formatDateTime(task.endTime) : 'No end time',
            description: task.description || 'No description',
            priority: task.priority,
            status: task.status,
            assignedTo: task.assigned_to || task.assignedTo
          });
        });
        
        setTasks(tasksByDate);
      }
    } catch (err) {
      console.error('CalenderScreen - Error fetching tasks:', err);
      setError(err.message);
      
      // --- Show Error Toast Message ---
      Toast.show({
        type: 'error',
        text1: 'Error Loading Tasks',
        text2: err.message || 'Failed to load tasks from server',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- Fetch Events from API ---
  const fetchEvents = async () => {
    try {
      // Check user role - Owner, Employee, and Manager can access events
      const userRole = await getUserRole();
      const allowedRoles = ["Owner", "Employee", "Manager"];
      
      if (!allowedRoles.includes(userRole)) {
        console.log('CalenderScreen - User role is not allowed, skipping event fetch. User role:', userRole);
        setEvents({});
        return;
      }

      // ✅ FIXED: Fetch ALL events like tasks service
      // Business Rule: Get all events and let the calendar group them by local date
      // This matches how tasks are handled - fetch all data and group on frontend
      console.log('CalenderScreen - Fetching all events like tasks service');
      
      // --- Fetch ALL events (no date parameter needed) ---
      const response = await getEventsForLogInUser();
      
      if (response.success && response.data) {
        // --- Group events by date ---
        const eventsByDate = {};
        
        response.data.forEach(event => {
          // Extract date from startTime only
          if (!event.startTime) {
            return; // Skip events without startTime
          }
          
          // --- FIXED: Convert to local timezone for date extraction ---
          // Business Rule: Use local date instead of UTC to prevent timezone issues
          // This ensures events created "today" appear on "today" in the calendar
          const localStartDate = new Date(event.startTime);
          const localEndDate = event.endTime ? new Date(event.endTime) : localStartDate;
          
          // --- Get date strings for start and end dates ---
          const eventStartDate = localStartDate.getFullYear() + '-' + 
            String(localStartDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(localStartDate.getDate()).padStart(2, '0');
          
          const eventEndDate = localEndDate.getFullYear() + '-' + 
            String(localEndDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(localEndDate.getDate()).padStart(2, '0');
          
          // --- Debug: Log timezone conversion for verification ---
          console.log(`Event "${event.title}" - Original: ${event.startTime}, Local Start: ${localStartDate.toLocaleDateString()}, Local End: ${localEndDate.toLocaleDateString()}`);
          console.log(`Event "${event.title}" - Start Date: ${eventStartDate}, End Date: ${eventEndDate}`);
          
          // --- Check if this is a multi-day event ---
          const isMultiDayEvent = eventStartDate !== eventEndDate;
          
          // --- Create event object with multi-day information ---
          const eventObject = {
            id: event.id,
            title: event.title,
            type: 'event', // Mark as event for identification
            // --- Keep original date objects for timetable ---
            startTime: event.startTime ? new Date(event.startTime) : null,
            endTime: event.endTime ? new Date(event.endTime) : null,
            // --- Add formatted date + time strings for display ---
            startTimeFormatted: event.startTime ? formatDateTime(event.startTime) : 'No time set',
            endTimeFormatted: event.endTime ? formatDateTime(event.endTime) : 'No end time',
            description: event.description || 'No description',
            priority: event.priority,
            status: event.status,
            // --- Add project and employee assignment information ---
            assignedTo: event.assignedTo || [],
            projects: event.projects || [],
            // --- Multi-day event properties ---
            isMultiDayEvent: isMultiDayEvent,
            originalStartDate: eventStartDate,
            originalEndDate: eventEndDate
          };
          
          // --- Add event to all dates it spans ---
          if (isMultiDayEvent) {
            console.log(`Multi-day event "${event.title}" - Adding to all dates from ${eventStartDate} to ${eventEndDate}`);
            
            // Generate all dates between start and end (inclusive)
            const startDateObj = new Date(eventStartDate);
            const endDateObj = new Date(eventEndDate);
            
            for (let currentDate = new Date(startDateObj); currentDate <= endDateObj; currentDate.setDate(currentDate.getDate() + 1)) {
              const currentDateString = currentDate.getFullYear() + '-' + 
                String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                String(currentDate.getDate()).padStart(2, '0');
              
              if (!eventsByDate[currentDateString]) {
                eventsByDate[currentDateString] = [];
              }
              
              // Add the event to this date
              eventsByDate[currentDateString].push({
                ...eventObject,
                currentDisplayDate: currentDateString
              });
              
              console.log(`Added event "${event.title}" to date: ${currentDateString}`);
            }
          } else {
            // Single-day event - add only to start date
            if (!eventsByDate[eventStartDate]) {
              eventsByDate[eventStartDate] = [];
            }
            
            eventsByDate[eventStartDate].push(eventObject);
            console.log(`Single-day event "${event.title}" added to date: ${eventStartDate}`);
          }
        });
        
        setEvents(eventsByDate);
      }
    } catch (err) {
      console.error('CalenderScreen - Error fetching events:', err);
      
      // --- Show Error Toast Message for events ---
      Toast.show({
        type: 'error',
        text1: 'Error Loading Events',
        text2: err.message || 'Failed to load events from server',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
      
      // Don't set main error state for events, just show toast
      setEvents({});
    }
  };

  // --- Combine tasks and events for calendar display ---
  const combineTasksAndEvents = () => {
    const combined = {};
    
    // --- Process all unique dates from both tasks and events ---
    const allDates = new Set([
      ...Object.keys(tasks),
      ...Object.keys(events)
    ]);
    
    allDates.forEach(date => {
      const taskList = tasks[date] || [];
      const eventList = events[date] || [];
      
      // --- Mark tasks with type for identification ---
      const markedTasks = taskList.map(task => ({ ...task, type: 'task' }));
      const markedEvents = eventList.map(event => ({ ...event, type: 'event' }));
      
      // --- Combine and sort by start time ---
      const combinedItems = [...markedTasks, ...markedEvents].sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0;
        return new Date(a.startTime) - new Date(b.startTime);
      });
      
      if (combinedItems.length > 0) {
        combined[date] = combinedItems;
      }
    });
    
    setCombinedItems(combined);
  };

  // --- Load user role first to prevent FAB lag ---
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const role = await getUserRole();
        setUserRole(role);
        console.log('CalenderScreen - User role loaded early:', role);
      } catch (error) {
        console.error('CalenderScreen - Error loading user role:', error);
      }
    };
    
    loadUserRole();
  }, []);

  // --- Load data on component mount ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchTasks(), fetchEvents()]);
      } catch (err) {
        console.error('CalenderScreen - Error loading initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // --- Combine tasks and events when either changes ---
  useEffect(() => {
    combineTasksAndEvents();
  }, [tasks, events]);

  // --- Handler for when event is created ---
  const handleEventCreated = () => {
    // Refresh both tasks and events when a new event is created
    fetchEvents();
    fetchTasks();
  };

  // --- Handle day press ---
  const onDayPress = (day) => {
    const combinedList = combinedItems[day.dateString] || [];
    const taskList = tasks[day.dateString] || [];
    const eventList = events[day.dateString] || [];
    
    // --- Debug: Log the day press data ---
    console.log('=== CalenderScreen onDayPress Debug ===');
    console.log('Selected Date:', day.dateString);
    console.log('Combined Items:', combinedItems);
    console.log('Combined List for this date:', combinedList);
    console.log('Task List for this date:', taskList);
    console.log('Event List for this date:', eventList);
    console.log('Combined List length:', combinedList.length);
    console.log('=====================================');
    
    // --- Show Navigation Toast Message ---
    const totalItems = combinedList.length;
    const taskCount = taskList.length;
    const eventCount = eventList.length;
    
    Toast.show({
      type: 'success',
      text1: 'Opening Schedule',
      text2: totalItems > 0 
        ? `Found ${taskCount} task(s) and ${eventCount} event(s) for ${day.dateString}`
        : `Viewing schedule for ${day.dateString}`,
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 80,
    });
    
    // --- Always navigate to CalenderDetailScreen regardless of item count ---
    // Pass date in YYYY-MM-DD format as expected by backend
    navigation.navigate("CalenderDetailScreen", {
      selectedDate: day.dateString, // This is already in YYYY-MM-DD format from calendar
      tasks: taskList,
      events: eventList, // Pass events separately for backward compatibility
      combinedItems: combinedList, // Pass combined items for new functionality
    });
  };

  // --- Handle refresh ---
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchTasks(), fetchEvents()]);
    } catch (err) {
      console.error('CalenderScreen - Error refreshing data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // --- Handle view mode change with smooth animations ---
  const handleViewModeChange = (newViewMode) => {
    if (newViewMode === viewMode) return; // No change needed
    
    // Animate button scales
    if (newViewMode === 'weekly') {
      Animated.parallel([
        Animated.spring(weeklyButtonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(monthlyButtonScale, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(monthlyButtonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(weeklyButtonScale, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    setViewMode(newViewMode);
  };


  // --- Show loading screen ---
  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="black" />
          <Text className="text-base text-gray-600 mt-4 text-center">Loading your tasks...</Text>
        </View>
        {/* --- Custom Bottom Navigation - Always Visible --- */}
        <CustomBottomNav />
      </View>
    );
  }

  // --- Show error screen ---
  if (error) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Text className="text-base text-red-600 text-center mb-5 px-5">❌ {error}</Text>
          <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg" onPress={fetchTasks}>
            <Text className="text-white text-base font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
        {/* --- Custom Bottom Navigation - Always Visible --- */}
        <CustomBottomNav />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* --- Reusable Toggle Component --- */}
      <CalendarToggle
        currentView={viewMode}
        onWeeklyPress={() => setViewMode('weekly')}
        onMonthlyPress={() => setViewMode('monthly')}
      />

      {/* --- Conditional View Rendering --- */}
      {viewMode === 'monthly' ? (
        /* --- Monthly Calendar View in ScrollView --- */
        <ScrollView 
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[ "#3155A1"]}
              tintColor="#3155A1"
              progressBackgroundColor="#ffffff"
            />
          }
        >
          <Calendar
            markingType={"custom"}
            onDayPress={onDayPress}
            dayComponent={({ date, state }) => {
              // --- Get both tasks and events for this date ---
              const taskList = tasks[date.dateString] || [];
              const eventList = events[date.dateString] || [];
              const combinedList = [...taskList, ...eventList];
              
              // --- Show first item (task or event) ---
              const visibleItem = combinedList.slice(0, 1)[0];
              const hiddenCount = combinedList.length > 1 ? combinedList.length - 1 : 0;

              return (
                <TouchableOpacity onPress={() => onDayPress(date)}>
                  <View className="items-center py-1 mx-1 min-h-14 h-auto">
                    <Text className="text-lg text-black font-medium mb-1">{date.day}</Text>
                    <View className="w-full items-center gap-1">
                      {/* --- Show first item (task or event) --- */}
                      {visibleItem && (
                        <View 
                          className={`px-1.5 py-1 rounded-md border-l-2 my-0.5 min-w-15 max-w-11/12 shadow-sm ${
                            visibleItem.type === 'event' 
                              ? visibleItem.isMultiDayEvent
                                ? 'bg-blue-100 border-l-blue-600' // Multi-day events get darker blue
                                : 'bg-blue-50 border-l-blue-500' // Single-day events get lighter blue
                              : 'bg-gray-50 border-l-black'
                          }`}
                          style={{
                            borderStyle: visibleItem.isMultiDayEvent ? 'dashed' : 'solid' // Dashed border for multi-day events
                          }}
                        >
                          <Text numberOfLines={1} className="text-xs text-gray-800 font-medium text-center">
                            {visibleItem.title.length > 8
                              ? `${visibleItem.title.slice(0, 8)}...`
                              : visibleItem.title}
                          </Text>
                        </View>
                      )}
                      
                      {/* --- Show "more" indicator if there are additional items --- */}
                      {hiddenCount > 0 && (
                        <View className="bg-gray-100 px-1 py-0.5 rounded-lg border border-gray-400">
                          <Text className="text-xs text-gray-600 font-semibold text-center">+{hiddenCount} more</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            theme={{
              todayTextColor: "#000000",
              arrowColor: "black",
            }}
            enableSwipeMonths={true}
          />
        </ScrollView>
      ) : (
        /* --- Weekly View Component --- */
        <MyWeekView />
      )}
      
      {/* --- Custom Bottom Navigation --- */}
      <CustomBottomNav 
        userRole={userRole} // Pass user role to prevent FAB lag
        handleFabPress={() => {
          // Use already loaded user role to prevent async lag
          if (userRole === "Owner") {
            setShowEventCreationDialog(true);
          } else {
            // Show message for non-Owner users
            Toast.show({
              type: 'info',
              text1: 'Access Restricted',
              text2: 'Only Owners can create events',
              visibilityTime: 3000,
              autoHide: true,
              topOffset: 80,
            });
          }
        }}
      />

      {/* --- Create Event Modal --- */}
      <CreateEventModal
        visible={showEventCreationDialog}
        onClose={() => setShowEventCreationDialog(false)}
        selectedDate={null} // Let CreateEventModal use current date
        onEventCreated={handleEventCreated}
      />
    </View>
  );
}

// --- Note: Toggle styles moved to reusable CalendarToggle component ---
const styles = StyleSheet.create({
  // Other styles can be added here if needed
});

export default CalenderScreen;
