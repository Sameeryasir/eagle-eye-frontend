import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import UpdateTaskModal from "./components/UpdateTaskModal";
import { deleteTaskById } from "../services/tasks/deleteTaskById";
import { getUserRole } from "../services/utils/userRole";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';

function TaskDetailsScreen({ navigation, route }) {
  const { task } = route.params || {};
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  
  // Responsive spacing calculations
  const isLargeScreen = screenHeight > 800;
  const topSpacing = isLargeScreen ? 16 : 12;
  const bottomSpacing = isLargeScreen ? 24 : 16;
  const cardSpacing = isLargeScreen ? 20 : 16;

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const role = await getUserRole();
        setUserRole(role);
      } catch (error) {
        console.error("Error loading user role:", error);
      }
    };
    loadUserRole();
  }, []);

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} ${timeStr}`;
  };

  const getAssignedToName = (assignedTo) => {
    if (!assignedTo) return "Unassigned";
    const firstName = assignedTo.first_name || "";
    const lastName = assignedTo.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName && assignedTo.email) {
      return assignedTo.email;
    }
    return fullName || "Unassigned";
  };

  const priorityOptions = [
    { id: 'low', label: 'Low', color: '#10B981', bgColor: '#D1FAE5' },
    { id: 'medium', label: 'Medium', color: '#F59E0B', bgColor: '#FEF3C7' },
    { id: 'high', label: 'High', color: '#EF4444', bgColor: '#FEE2E2' },
    { id: 'critical', label: 'Critical', color: '#DC2626', bgColor: '#FEE2E2' }
  ];

  const handleUpdate = () => {
    setShowUpdateModal(true);
  };

  const handleUpdateTask = () => {
    // Navigate to update task screen
    navigation.navigate('UpdateTask', { task });
    setIsUpdateMode(false);
  };

  const handleCancelUpdate = () => {
    setIsUpdateMode(false);
  };

  const handleUpdateSuccess = () => {
    // Refresh the task data or navigate back
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTaskById(task.id);
              Alert.alert(
                "Success",
                "Task deleted successfully!",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      navigation.navigate('ViewAllTasksScreen');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert(
                "Error",
                "Failed to delete task. Please try again.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  };



  if (!task) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-[16px] text-[#666]">Task not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
      
      <View 
        className="flex-1" 
        style={{ 
          paddingBottom: bottomSpacing,
          paddingTop: 20
        }}
      >
        {/* Task Title Card */}
        <View style={{ marginHorizontal: 24, marginBottom: cardSpacing }}>
          <View style={{ 
            backgroundColor: 'white', 
            borderRadius: 16, 
            padding: isLargeScreen ? 24 : 20, 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6'
          }}>
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 rounded-xl bg-blue-100 items-center justify-center mr-4">
                <Ionicons name="document-text" size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-blue-600 mb-1">TASK TITLE</Text>
                <Text className="text-xl font-bold text-gray-900 leading-tight">
                  {task.title || "Untitled Task"}
                </Text>
              </View>
              {userRole !== 'Employee' && (
                <Menu rendererProps={{ placement: 'bottom-end', anchorStyle: { marginRight: 0 } }}>
                  <MenuTrigger>
                    <View style={{ activeOpacity: 1 }}>
                      <Ionicons name="ellipsis-vertical" size={16} color="#374151" />
                    </View>
                  </MenuTrigger>
                  <MenuOptions customStyles={{
                    optionsContainer: {
                      backgroundColor: 'white',
                      borderRadius: 8,
                      padding: 8,
                      width: 120,
                      marginRight: -20,
                      shadowColor: "#000",
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 3,
                    }
                  }}>
                    <MenuOption onSelect={handleUpdate} customStyles={{
                      optionWrapper: {
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 4,
                      }
                    }}>
                      <Ionicons name="create-outline" size={18} color="#000" />
                      <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: 'black' }}>
                        Update
                      </Text>
                    </MenuOption>
                    <MenuOption onSelect={handleDelete} customStyles={{
                      optionWrapper: {
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 4,
                      }
                    }}>
                      <Ionicons name="trash-outline" size={18} color="#dc3545" />
                      <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#dc3545' }}>
                        Delete
                      </Text>
                    </MenuOption>
                  </MenuOptions>
                </Menu>
              )}
            </View>
            
            {task.description && (
              <View className="pt-4 border-t border-gray-100">
                <Text className="text-sm font-medium text-gray-600 mb-2">DESCRIPTION</Text>
                <Text className="text-base text-gray-700 leading-relaxed">
                  {task.description}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Task Details Grid */}
          <View style={{ marginHorizontal: 24, marginBottom: cardSpacing }}>
            <View style={{ 
              backgroundColor: 'white', 
              borderRadius: 16, 
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
              borderWidth: 1,
              borderColor: '#f3f4f6',
              overflow: 'hidden'
            }}>
              {/* Priority Section */}
              <View style={{ 
                padding: isLargeScreen ? 24 : 20, 
                borderBottomWidth: 1, 
                borderBottomColor: '#f3f4f6' 
              }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-lg bg-red-100 items-center justify-center mr-3">
                      <Ionicons name="flag" size={20} color="#EF4444" />
                    </View>
                    <View>
                      <Text className="text-sm font-medium text-gray-600 mb-1">PRIORITY</Text>
                      {task.priority ? (
                        <View className="flex-row items-center">
                          <View 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: priorityOptions.find(p => p.id === task.priority)?.color || '#6b7280' }}
                          />
                          <Text className="text-lg font-semibold text-gray-900">
                            {priorityOptions.find(p => p.id === task.priority)?.label || task.priority}
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-lg font-semibold text-gray-400">Not set</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Assigned To Section */}
              <View style={{ 
                padding: isLargeScreen ? 24 : 20, 
                borderBottomWidth: 1, 
                borderBottomColor: '#f3f4f6' 
              }}>
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-lg bg-green-100 items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-600 mb-1">ASSIGNED TO</Text>
                    <Text className="text-lg font-semibold text-gray-900">
                      {getAssignedToName(task.assigned_to || task.assignedTo)}
                    </Text>
                  </View>
                </View>
              </View>



              {/* Timeline Section */}
              <View style={{ 
                padding: isLargeScreen ? 24 : 20, 
                marginTop: isLargeScreen ? 20 : 16 
              }}>
              
                
                <View className="space-y-4">
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center mr-3">
                        <Ionicons name="play" size={16} color="#3B82F6" />
                      </View>
                      <Text className="text-sm font-medium text-gray-600">Start Date</Text>
                    </View>
                    <Text className="text-sm font-semibold text-gray-900">
                      {formatDateTime(task.startTime)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-lg bg-red-100 items-center justify-center mr-3">
                        <Ionicons name="stop" size={16} color="#EF4444" />
                      </View>
                      <Text className="text-sm font-medium text-gray-600">End Date</Text>
                    </View>
                    <Text className="text-sm font-semibold text-gray-900">
                      {formatDateTime(task.endTime)}
                    </Text>
                  </View>

                  <View className="flex-row justify-end mt-3 ">
                    <View className="flex-row items-center">
                      <Text className="text-sm font-medium text-gray-600 mr-2">Created At:</Text>
                    </View>
                    <Text className="text-sm font-semibold text-gray-900">
                      {formatDateTime(task.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

        {/* Bottom Spacing */}
        <View style={{ height: bottomSpacing }} />
      </View>

      {/* Update Task Button - Only show when in update mode */}
      {isUpdateMode && (
        <View style={{ 
          position: 'absolute', 
          bottom: isLargeScreen ? 100 : 80, 
          left: 24, 
          right: 24, 
          zIndex: 20 
        }}>
          <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
            <View className="flex-row space-x-3">
              <TouchableOpacity 
                onPress={handleCancelUpdate}
                className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
              >
                <Text className="text-base font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleUpdateTask}
                className="flex-1 bg-black rounded-xl py-4 items-center"
              >
                <Text className="text-base font-semibold text-white">Update Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Update Task Modal */}
      <UpdateTaskModal
        visible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        task={task}
        projectId={task?.project?.id}
        onSuccess={handleUpdateSuccess}
      />

      {/* Sidebar */}
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} navigation={navigation} />
      
      {/* Bottom Navigation */}
      <CustomBottomNav navigation={navigation} />
    </View>
  );
}

export default TaskDetailsScreen;
