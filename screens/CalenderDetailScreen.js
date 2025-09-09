
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, Dimensions } from "react-native";
import Timetable from "react-native-calendar-timetable";
import CustomBottomNav from "./components/CustomBottomNav";
import { Ionicons } from "@expo/vector-icons";

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

  // --- Convert task data to Timetable format ---
  useEffect(() => {
    console.log('=== useEffect triggered ===');
    console.log('Tasks in useEffect:', tasks);
    console.log('Tasks length in useEffect:', tasks?.length);
    
    if (tasks && tasks.length > 0) {
      console.log('Processing tasks for timetable...');
      
      // --- Process each task and convert to Timetable format ---
      const timetableItems = tasks.map((task, index) => {
        console.log(`Processing task ${index}:`, {
          id: task.id,
          title: task.title,
          startTime: task.startTime,
          endTime: task.endTime,
          startTimeType: typeof task.startTime,
          endTimeType: typeof task.endTime
        });
        
        // --- Use the actual task startTime and endTime ---
        const startDate = task.startTime ? new Date(task.startTime) : new Date();
        const endDate = task.endTime ? new Date(task.endTime) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
        
        console.log(`Converted dates for task ${index}:`, {
          startDate: startDate,
          endDate: endDate,
          startTimeString: startDate.toLocaleTimeString(),
          endTimeString: endDate.toLocaleTimeString()
        });
        
        return {
          id: task.id || index,
          title: task.title || 'Untitled Task',
          startDate: startDate,
          endDate: endDate,
          // --- Additional task properties for reference ---
          description: task.description,
          priority: task.priority,
          status: task.status,
          assignedTo: task.assignedTo
        };
      });
      
      console.log('Final timetable items:', timetableItems);
      setItems(timetableItems);
    } else {
      console.log('No tasks to process or tasks array is empty');
      // --- Fallback to empty array if no tasks ---
      setItems([]);
    }
  }, [tasks]);

  // --- Handle case when no tasks are available ---
  if (!tasks || tasks.length === 0) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center p-5">
          <Text className="text-base text-gray-500 text-center mb-5">No tasks found for {selectedDate}</Text>
          <TouchableOpacity 
            className="bg-blue-500 px-5 py-2.5 rounded-lg"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white text-base font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
        {/* --- Custom Bottom Navigation - Always Visible --- */}
        <CustomBottomNav />
      </View>
    );
  }

  // --- Custom render item component (styled like CalenderScreen tasks) ---
  const renderItem = ({ style, item }) => {
    const priorityColor = getPriorityColor(item.priority);

    // --- Calculate task duration to determine layout ---
    const duration = item.endDate.getTime() - item.startDate.getTime();
    const durationMinutes = Math.round(duration / (1000 * 60));
    const isShortDuration = durationMinutes < 60; // Less than 1 hour

    // --- Handle task press ---
    const handleTaskPress = () => {
      setDialogTask(item);
      setShowTaskDialog(true);
    };

    return (
      <TouchableOpacity
        style={[
          style,
          {
            backgroundColor: '#F9FAFB', // Light gray background like CalenderScreen
            borderRadius: 6, // Rounded corners like CalenderScreen
            padding: isShortDuration ? 4 : 8, // Reduced padding for short duration tasks
            borderLeftWidth: 3, // Slightly thicker border for better visibility
            borderLeftColor: priorityColor, // Priority-based colored left border
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 1,
            },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2, // Subtle shadow like CalenderScreen
            justifyContent: 'center', // Center content vertically for short tasks
          }
        ]}
        activeOpacity={0.8}
        onPress={handleTaskPress}
      >
        {/* --- Task Title - Always show --- */}
        <Text 
          className="text-gray-800 text-xs font-semibold text-center"
          numberOfLines={isShortDuration ? 1 : 1}
          style={{ 
            marginBottom: isShortDuration ? 0 : 2,
            lineHeight: isShortDuration ? 12 : 14
          }}
        >
          {item.title}
        </Text>
        
        {/* --- Task Description - Only show for longer duration tasks --- */}
        {!isShortDuration && (
          <Text 
            className="text-gray-600 text-xs font-normal text-center italic"
            numberOfLines={1}
            style={{ marginBottom: 2 }}
          >
            {item.description || 'No description available'}
          </Text>
        )}
        
        {/* --- Time Display - Compact for short duration --- */}
        <Text 
          className="text-gray-500 text-xs font-medium text-center"
          numberOfLines={1}
          style={{ 
            lineHeight: isShortDuration ? 12 : 14,
            fontSize: isShortDuration ? 10 : 12 // Slightly smaller font for short duration
          }}
        >
          {item.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - {item.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
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
              <Text className="text-xs font-bold text-gray-500 tracking-wider mb-1 uppercase">SCHEDULED TASKS</Text>
              <Text className="text-lg font-semibold text-gray-800 leading-6">
                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Selected Date'}
              </Text>
            </View>
            <View className="items-center bg-gray-100 px-3 py-2 rounded-lg min-w-15">
              <Text className="text-xl font-bold text-gray-800 leading-6">{items.length}</Text>
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {items.length === 1 ? 'Task' : 'Tasks'}
              </Text>
            </View>
          </View>
        </View>
        
        <Timetable
          items={items}
          renderItem={renderItem}
          date={selectedDate ? new Date(selectedDate) : new Date()} // Use the selected date from navigation
          fromHour={0} // 12 AM
          toHour={23.99}  // 11:59 PM - Shows until 11:59 PM
          is12Hour={true} // 12-hour format
          hourHeight={60}
          timeWidth={60}
        />
      </ScrollView>
      
      {/* --- Custom Bottom Navigation - Always Visible --- */}
      <CustomBottomNav />
      
      {/* --- Task Details Dialog --- */}
      <Modal
        visible={showTaskDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTaskDialog(false)}
      >
        <View className="flex-1 bg-transparent justify-center items-center px-6" style={{ paddingTop: height * 0.15, paddingBottom: height * 0.15 }}>
          <View className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* --- Black Header Navbar --- */}
            <View className="bg-black px-6 py-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-white">Task Details</Text>
                <TouchableOpacity
                  onPress={() => setShowTaskDialog(false)}
                  className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* --- Dialog Content --- */}
            <View className="p-6">
            
            {dialogTask && (
              <>
                {/* --- Task Title --- */}
                <Text className="text-xl font-bold text-gray-800 mb-3">
                  {dialogTask.title}
                </Text>
                
                {/* --- Task Description --- */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-600 mb-1">Description:</Text>
                  <Text className="text-base text-gray-700 leading-5">
                    {dialogTask.description || 'No description available'}
                  </Text>
                </View>
                
                {/* --- Time Information --- */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-600 mb-2">Schedule:</Text>
                  <Text className="text-base text-gray-700 mb-2">
                    {dialogTask.startDate.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      hour12: true 
                    })} - {dialogTask.endDate.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      hour12: true 
                    })}
                  </Text>
                  <Text className="text-base text-gray-700">
                    {dialogTask.startDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
                
                {/* --- Priority and Status --- */}
                <View className="flex-row justify-between items-center mb-6">
                  <View className="flex-row items-center">
                    <View 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: getPriorityColor(dialogTask.priority) }}
                    />
                    <Text className="text-sm font-medium text-gray-600">
                      {dialogTask.priority || 'No Priority'}
                    </Text>
                  </View>
                  {dialogTask.status && (
                    <View className="bg-gray-100 px-3 py-1 rounded-full">
                      <Text className="text-sm font-medium text-gray-700">
                        {dialogTask.status}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* --- Close Button --- */}
                <TouchableOpacity
                  onPress={() => setShowTaskDialog(false)}
                  className="bg-black py-3 rounded-xl"
                >
                  <Text className="text-white text-center font-semibold text-base">Close</Text>
                </TouchableOpacity>
              </>
            )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CalenderDetailScreen;
