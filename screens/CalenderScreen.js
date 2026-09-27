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
import { getUserRole } from "../services/utils/userRole";
import CustomBottomNav from "../components/CustomBottomNav";
import MyWeekView from "../components/WeekView";
import CalendarToggle from "../components/CalendarToggle";
import CreateEventModal from "../components/CreateEventModal";
import { getEventsForLogInUser } from "../services/event/getEventsForLogInUser";
import getAllTasks from "../services/tasks/getAllTasks";

const { height } = Dimensions.get("window");

function CalenderScreen({ navigation }) {
  const [tasks, setTasks] = useState({});
  const [localEvents, setLocalEvents] = useState({}); // Processed events grouped by date
  const [combinedItems, setCombinedItems] = useState({}); // Combined tasks and events
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'weekly' - controls which view to show
  const [weekViewEvents, setWeekViewEvents] = useState([]); // Events formatted for WeekView
  const [monthlyViewLoading, setMonthlyViewLoading] = useState(false); // Loading state for monthly view switch
  const [userRole, setUserRole] = useState(null); // User role state to prevent FAB lag
  
  const [showEventCreationDialog, setShowEventCreationDialog] = useState(false);
  
  const weeklyButtonScale = useState(new Animated.Value(viewMode === 'weekly' ? 1 : 0.95))[0];
  const monthlyButtonScale = useState(new Animated.Value(viewMode === 'monthly' ? 1 : 0.95))[0];

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

  const processTasks = (tasksArray) => {
    try {
      console.log('CalenderScreen - Processing tasks from Redux:', tasksArray.length);
      
      if (tasksArray && tasksArray.length > 0) {
        const tasksByDate = {};
        
        tasksArray.forEach(task => {
          // Extract date from startTime only
          if (!task.startTime) {
            return; // Skip tasks without startTime
          }
          
          // This ensures tasks created "today" appear on "today" in the calendar
          const localDate = new Date(task.startTime);
          const taskDate = localDate.getFullYear() + '-' + 
            String(localDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(localDate.getDate()).padStart(2, '0');
          
          console.log(`Task "${task.title}" - Original: ${task.startTime}, Local Date: ${localDate.toLocaleDateString()}, Task Date: ${taskDate}`);
          
          if (!tasksByDate[taskDate]) {
            tasksByDate[taskDate] = [];
          }
          
          tasksByDate[taskDate].push({
            id: task.id,
            title: task.title,
            startTime: task.startTime ? new Date(task.startTime) : null,
            endTime: task.endTime ? new Date(task.endTime) : null,
            startTimeFormatted: task.startTime ? formatDateTime(task.startTime) : 'No time set',
            endTimeFormatted: task.endTime ? formatDateTime(task.endTime) : 'No end time',
            hasEndTime: task.endTime !== null && task.endTime !== undefined,
            description: task.description || 'No description',
            priority: task.priority,
            status: task.status,
            assignedTo: task.assigned_to || task.assignedTo
          });
        });
        
        setTasks(tasksByDate);
      } else {
        setTasks({});
      }
    } catch (err) {
      console.error('CalenderScreen - Error processing tasks:', err);
      setTasks({});
    }
  };

  const processEvents = (eventsArray) => {
    try {
      console.log('=== CalenderScreen processEvents Debug ===');
      console.log('User role:', userRole);
      console.log('Events array:', eventsArray);
      console.log('Events array type:', typeof eventsArray);
      console.log('Events array length:', eventsArray ? eventsArray.length : 'N/A');
      console.log('==========================================');
      
      // Check user role - Owner, Employee, and Manager can access events
      const allowedRoles = ["Owner", "Employee", "Manager"];
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        console.log('CalenderScreen - User role is not allowed, skipping event processing. User role:', userRole);
        console.log('CalenderScreen - Allowed roles:', allowedRoles);
        setLocalEvents({});
        return;
      }

      console.log('CalenderScreen - Processing events from Redux:', eventsArray.length);
      
      if (eventsArray && eventsArray.length > 0) {
        const eventsByDate = {};
        
        eventsArray.forEach(event => {
          // Extract date from startTime only
          if (!event.startTime) {
            return; // Skip events without startTime
          }
          
          // This ensures events created "today" appear on "today" in the calendar
          const localStartDate = new Date(event.startTime);
          const localEndDate = event.endTime ? new Date(event.endTime) : localStartDate;
          
          const eventStartDate = localStartDate.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/,/g, ''); // Format: YYYY-MM-DD
          
          const eventEndDate = localEndDate.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/,/g, ''); // Format: YYYY-MM-DD
          
          console.log(`Event "${event.title}" - Original: ${event.startTime}, Local Start: ${localStartDate.toLocaleDateString()}, Local End: ${localEndDate.toLocaleDateString()}`);
          console.log(`Event "${event.title}" - Start Date: ${eventStartDate}, End Date: ${eventEndDate}`);
          
          const isMultiDayEvent = eventStartDate !== eventEndDate;
          
          const eventObject = {
            id: event.id,
            title: event.title,
            type: 'event', // Mark as event for identification
            startTime: event.startTime ? new Date(event.startTime) : null,
            endTime: event.endTime ? new Date(event.endTime) : null,
            startTimeFormatted: event.startTime ? formatDateTime(event.startTime) : 'No time set',
            endTimeFormatted: event.endTime ? formatDateTime(event.endTime) : 'No end time',
            description: event.description || 'No description',
            priority: event.priority,
            status: event.status,
            assignedTo: event.assignedTo || [],
            projects: event.projects || [],
            isMultiDayEvent: isMultiDayEvent,
            originalStartDate: eventStartDate,
            originalEndDate: eventEndDate
          };
          
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
        
        setLocalEvents(eventsByDate);
      } else {
        setLocalEvents({});
      }
    } catch (err) {
      console.error('CalenderScreen - Error processing events:', err);
      setLocalEvents({});
    }
  };

  const combineTasksAndEvents = () => {
    const combined = {};
    
    const allDates = new Set([
      ...Object.keys(tasks),
      ...Object.keys(localEvents)
    ]);
    
    allDates.forEach(date => {
      const taskList = tasks[date] || [];
      const eventList = localEvents[date] || [];
      
      const markedTasks = taskList.map(task => ({ ...task, type: 'task' }));
      const markedEvents = eventList.map(event => ({ ...event, type: 'event' }));
      
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('CalenderScreen - Starting to load data...');
        console.log('CalenderScreen - User role:', userRole);
        
        // Fetch tasks and events directly from API
        const [tasksResponse, eventsResponse] = await Promise.all([
          getAllTasks(),
          getEventsForLogInUser()
        ]);
        
        console.log('CalenderScreen - Tasks response:', tasksResponse);
        console.log('CalenderScreen - Events response:', eventsResponse);
        
        // Process the API responses
        if (tasksResponse && tasksResponse.data) {
          console.log('CalenderScreen - Processing tasks:', tasksResponse.data.length);
          processTasks(tasksResponse.data);
        }
        
        if (eventsResponse && eventsResponse.data) {
          console.log('CalenderScreen - Processing events:', eventsResponse.data.length);
          processEvents(eventsResponse.data);
        } else if (eventsResponse && Array.isArray(eventsResponse)) {
          console.log('CalenderScreen - Processing events (fallback):', eventsResponse.length);
          processEvents(eventsResponse);
        } else {
          console.log('CalenderScreen - No events data found in response:', eventsResponse);
          setLocalEvents({});
        }
      } catch (err) {
        console.error('CalenderScreen - Error loading initial data:', err);
        console.error('CalenderScreen - Error details:', err.message);
        
        if (err.message.includes('Access denied')) {
          setError(`Access denied: ${err.message}`);
        } else if (err.message.includes('No token found')) {
          setError('Authentication required. Please log in again.');
        } else {
          setError(`Failed to load calendar data: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (userRole !== null) {
      loadData();
    }
  }, [userRole]); // Add userRole as dependency

  useEffect(() => {
    // Re-process events when user role is loaded
    if (userRole) {
      // Events will be processed when data is loaded
    }
  }, [userRole]);

  useEffect(() => {
    combineTasksAndEvents();
  }, [tasks, localEvents]);

  const handleEventCreated = async () => {
    // Refresh both tasks and events when a new event is created
    try {
      const [tasksResponse, eventsResponse] = await Promise.all([
        getAllTasks(),
        getEventsForLogInUser()
      ]);
      
      // Process the API responses
      if (tasksResponse && tasksResponse.data) {
        processTasks(tasksResponse.data);
      }
      
      if (eventsResponse && eventsResponse.data) {
        processEvents(eventsResponse.data);
      } else if (eventsResponse && Array.isArray(eventsResponse)) {
        processEvents(eventsResponse);
      } else {
        console.log('CalenderScreen - No events data found after event creation:', eventsResponse);
        setLocalEvents({});
      }
    } catch (err) {
      console.error('CalenderScreen - Error refreshing data after event creation:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to refresh calendar data',
        visibilityTime: 3000,
      });
    }
  };

  const onDayPress = (day) => {
    const combinedList = combinedItems[day.dateString] || [];
    const taskList = tasks[day.dateString] || [];
    const eventList = localEvents[day.dateString] || [];
    
    console.log('=== CalenderScreen onDayPress Debug ===');
    console.log('Selected Date:', day.dateString);
    console.log('Combined Items:', combinedItems);
    console.log('Combined List for this date:', combinedList);
    console.log('Task List for this date:', taskList);
    console.log('Event List for this date:', eventList);
    console.log('Combined List length:', combinedList.length);
    console.log('=====================================');
    
    const totalItems = combinedList.length;
    const taskCount = taskList.length;
    const eventCount = eventList.length;
    
    // Toast notification removed - no longer showing "Found X task(s) and X event(s)"
    
    // Pass date in YYYY-MM-DD format as expected by backend
    navigation.navigate("CalenderDetailScreen", {
      selectedDate: day.dateString, // This is already in YYYY-MM-DD format from calendar
      tasks: taskList,
      events: eventList, // Pass events separately for backward compatibility
      combinedItems: combinedList, // Pass combined items for new functionality
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Fetch fresh data from API
      const [tasksResponse, eventsResponse] = await Promise.all([
        getAllTasks(),
        getEventsForLogInUser()
      ]);
      
      // Process the API responses
      if (tasksResponse && tasksResponse.data) {
        processTasks(tasksResponse.data);
      }
      
      if (eventsResponse && eventsResponse.data) {
        processEvents(eventsResponse.data);
      } else if (eventsResponse && Array.isArray(eventsResponse)) {
        processEvents(eventsResponse);
      } else {
        console.log('CalenderScreen - No events data found during refresh:', eventsResponse);
        setLocalEvents({});
      }
    } catch (err) {
      console.error('CalenderScreen - Error refreshing data:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to refresh calendar data',
        visibilityTime: 3000,
      });
    } finally {
      setRefreshing(false);
    }
  };

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

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="black" />
          <Text className="text-base text-gray-600 mt-4 text-center">Loading your tasks and events...</Text>
        </View>
        <CustomBottomNav />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Text className="text-base text-red-600 text-center mb-5 px-5">❌ {error}</Text>
          <TouchableOpacity 
            className="bg-blue-500 px-6 py-3 rounded-lg" 
            onPress={async () => {
              setError(null);
              setLoading(true);
              try {
                const [tasksResponse, eventsResponse] = await Promise.all([
                  getAllTasks(),
                  getEventsForLogInUser()
                ]);
                
                if (tasksResponse && tasksResponse.data) {
                  processTasks(tasksResponse.data);
                }
                
                if (eventsResponse && eventsResponse.data) {
                  processEvents(eventsResponse.data);
                } else if (eventsResponse && Array.isArray(eventsResponse)) {
                  processEvents(eventsResponse);
                } else {
                  console.log('CalenderScreen - No events data found during retry:', eventsResponse);
                  setLocalEvents({});
                }
              } catch (err) {
                console.error('CalenderScreen - Error retrying data load:', err);
                setError('Failed to load calendar data. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
          >
            <Text className="text-white text-base font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <CalendarToggle
        currentView={viewMode}
        onWeeklyPress={() => setViewMode('weekly')}
        onMonthlyPress={() => setViewMode('monthly')}
      />

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
              const taskList = tasks[date.dateString] || [];
              const eventList = localEvents[date.dateString] || [];
              const combinedList = [...taskList, ...eventList];
              
              const visibleItem = combinedList.slice(0, 1)[0];
              const hiddenCount = combinedList.length > 1 ? combinedList.length - 1 : 0;

              return (
                <TouchableOpacity onPress={() => onDayPress(date)}>
                  <View className="items-center py-1 mx-1 min-h-14 h-auto">
                    <Text className="text-lg text-black font-medium mb-1">{date.day}</Text>
                    <View className="w-full items-center gap-1">
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

      <CreateEventModal
        visible={showEventCreationDialog}
        onClose={() => setShowEventCreationDialog(false)}
        selectedDate={null} // Let CreateEventModal use current date
        onEventCreated={handleEventCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Other styles can be added here if needed
});

export default CalenderScreen;
