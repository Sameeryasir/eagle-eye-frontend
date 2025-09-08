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

const { height } = Dimensions.get("window");

function CalenderScreen({ navigation }) {
  // --- State Management ---
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
          
          // Convert to local timezone for date extraction
          const localDate = new Date(task.startTime);
          const taskDate = localDate.toISOString().split('T')[0];
          
          if (!tasksByDate[taskDate]) {
            tasksByDate[taskDate] = [];
          }
          
          tasksByDate[taskDate].push({
            id: task.id,
            title: task.title,
            startTime: task.startTime ? new Date(task.startTime).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }) : 'No time set',
            endTime: task.endTime ? new Date(task.endTime).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }) : 'No end time',
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

  // --- Load tasks on component mount ---
  useEffect(() => {
    fetchTasks();
  }, []);

  // --- Handle day press ---
  const onDayPress = (day) => {
    const taskList = tasks[day.dateString] || [];
    
    if (taskList.length === 0) {
      // --- Show Info Toast Message ---
      Toast.show({
        type: 'info',
        text1: 'No Tasks',
        text2: `No tasks scheduled for ${day.dateString}`,
        visibilityTime: 2000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }
    
    // --- Show Navigation Toast Message ---
    Toast.show({
      type: 'success',
      text1: 'Viewing Tasks',
      text2: `Found ${taskList.length} task(s) for ${day.dateString}`,
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 80,
    });
    
    navigation.navigate("TaskDetails", {
      selectedDate: day.dateString,
      taskList: taskList,
    });
  };

  // --- Handle refresh ---
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
  };

  const onTaskPress = (task, date) => {
    // --- Show Navigation Toast Message ---
    Toast.show({
      type: 'success',
      text1: 'Viewing Task Details',
      text2: `Opening details for "${task.title}"`,
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 80,
    });
    
    navigation.navigate("CalenderDetailScreen", {
      selectedDate: date.dateString,
      taskList: tasks[date.dateString] || [],
      selectedTask: task
    });
  };

  // --- Show loading screen ---
  if (loading) {
    return (
      <View className="flex-1 bg-white pt-12 justify-center items-center">
        <ActivityIndicator size="large" color="black" />
        <Text className="text-base text-gray-600 mt-4 text-center">Loading your tasks...</Text>
      </View>
    );
  }

  // --- Show error screen ---
  if (error) {
    return (
      <View className="flex-1 bg-white pt-12 justify-center items-center">
        <Text className="text-base text-red-600 text-center mb-5 px-5">❌ {error}</Text>
        <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg" onPress={fetchTasks}>
          <Text className="text-white text-base font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-white pt-12"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#00adf5", "#007AFF"]}
          tintColor="#00adf5"
          progressBackgroundColor="#ffffff"
        />
      }
    >
      <Text className="text-3xl font-bold text-center mb-2 ">📅 My Tasks</Text>

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
                    <TouchableOpacity 
                      key={index} 
                      onPress={() => onTaskPress(task, date)}
                      className="bg-gray-50 px-1.5 py-1 rounded-md border-l-2 border-l-black my-0.5 min-w-15 max-w-11/12 shadow-sm"
                    >
                      <Text numberOfLines={1} className="text-xs text-gray-800 font-medium text-center">
                        {task.title.length > 8
                          ? `${task.title.slice(0, 8)}...`
                          : task.title}
                      </Text>
                    </TouchableOpacity>
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
          todayTextColor: "#00adf5",
          arrowColor: "black",
        }}
        enableSwipeMonths={true}
      />
    </ScrollView>
  );
}

export default CalenderScreen;
