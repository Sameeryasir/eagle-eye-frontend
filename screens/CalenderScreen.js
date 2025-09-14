import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Calendar } from "react-native-calendars";
import Toast from 'react-native-toast-message';
import getAllTasks from "../services/tasks/getAllTasks";
import { getEventsForLogInUser } from "../services/event/getEventsForLogInUser";
import { getUserRole } from "../services/utils/userRole";
import CustomBottomNav from "./components/CustomBottomNav";

const { height } = Dimensions.get("window");

function CalenderScreen({ navigation }) {
  // --- State Management ---
  const [tasks, setTasks] = useState({});
  const [events, setEvents] = useState({});
  const [combinedItems, setCombinedItems] = useState({}); // Combined tasks and events
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
      // Check user role - only Owner can access events
      const userRole = await getUserRole();
      if (userRole !== "Owner") {
        console.log('CalenderScreen - User role is not Owner, skipping event fetch');
        setEvents({});
        return;
      }

      // ✅ FIX: Fetch events for today to avoid timezone issues
      // Business Rule: Get events for today and let the calendar group them by local date
      // Note: API only supports fetching events by specific date
      console.log('CalenderScreen - Fetching events for today to avoid timezone issues');
      
      // --- Get today's date in YYYY-MM-DD format for API ---
      const today = new Date();
      const todayDate = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      // --- Fetch events for today (API requires a specific date) ---
      const response = await getEventsForLogInUser(todayDate);
      
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
          const localDate = new Date(event.startTime);
          const eventDate = localDate.getFullYear() + '-' + 
            String(localDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(localDate.getDate()).padStart(2, '0');
          
          // --- Debug: Log timezone conversion for verification ---
          console.log(`Event "${event.title}" - Original: ${event.startTime}, Local Date: ${localDate.toLocaleDateString()}, Event Date: ${eventDate}`);
          
          if (!eventsByDate[eventDate]) {
            eventsByDate[eventDate] = [];
          }
          
          eventsByDate[eventDate].push({
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
            status: event.status
          });
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
      <ScrollView 
        className="flex-1 pt-3"
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
        <Text className="text-3xl font-bold text-center  ">📅 My Schedule</Text>

        <Calendar
          markingType={"custom"}
          onDayPress={onDayPress}
          dayComponent={({ date, state }) => {
            const taskList = tasks[date.dateString];
            const visibleTasks = taskList?.slice(0, 2) || [];
            const hiddenCount = taskList?.length > 2 ? taskList.length - 2 : 0;

            return (
              <TouchableOpacity onPress={() => onDayPress(date)}>
                <View className="items-center py-2 mx-1 min-h-20 h-auto">
                  <Text className="text-lg text-black font-medium mb-1.5">{date.day}</Text>
                  <View className="w-full items-center gap-1">
                    {visibleTasks.map((task, index) => (
                      <View 
                        key={index} 
                        className="bg-gray-50 px-1.5 py-1 rounded-md border-l-2 border-l-black my-0.5 min-w-15 max-w-11/12 shadow-sm"
                      >
                        <Text numberOfLines={1} className="text-xs text-gray-800 font-medium text-center">
                          {task.title.length > 8
                            ? `${task.title.slice(0, 8)}...`
                            : task.title}
                        </Text>
                      </View>
                    ))}
                    {hiddenCount > 0 && (
                      <View className="bg-gray-100 px-1 py-0.5 rounded-lg border border-gray-400 mt-0.5">
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
      
      {/* --- Custom Bottom Navigation --- */}
      <CustomBottomNav />
    </View>
  );
}

export default CalenderScreen;
