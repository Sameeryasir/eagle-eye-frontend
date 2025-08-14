import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import UpdateTaskModal from "./components/UpdateTaskModal";
import { deleteTaskById } from "../services/tasks/deleteTaskById";

function TaskDetailsScreen({ navigation, route }) {
  const { task } = route.params || {};
  const [sidebarVisible, setSidebarVisible] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const [isUpdateMode, setIsUpdateMode] = React.useState(false);
  const [showUpdateModal, setShowUpdateModal] = React.useState(false);

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
    setShowMenu(false);
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
    setShowMenu(false);
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

  const handleCloseMenu = () => {
    setShowMenu(false);
  };

  if (!task) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-[16px] text-[#666]">Task not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      
      {/* Header */}


      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Task Title Card */}
        <View className="mx-6 mt-6 mb-4">
          <TouchableWithoutFeedback onPress={handleCloseMenu}>
            <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
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
                <TouchableOpacity 
                  onPress={() => setShowMenu(!showMenu)}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Menu Options */}
              {showMenu && (
                <View className="absolute top-16 right-6 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[120px]">
                  <TouchableOpacity 
                    onPress={handleUpdate}
                    className="flex-row items-center px-4 py-3 border-b border-gray-100"
                  >
                    <Ionicons name="create-outline" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
                    <Text className="text-sm font-medium text-gray-700">Update</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleDelete}
                    className="flex-row items-center px-4 py-3"
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text className="text-sm font-medium text-red-500">Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {task.description && (
                <View className="pt-4 border-t border-gray-100">
                  <Text className="text-sm font-medium text-gray-600 mb-2">DESCRIPTION</Text>
                  <Text className="text-base text-gray-700 leading-relaxed">
                    {task.description}
                  </Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>

        {/* Task Details Grid */}
        <TouchableWithoutFeedback onPress={handleCloseMenu}>
          <View className="mx-6 mb-6">
            <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Priority Section */}
              <View className="p-6 border-b border-gray-100">
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
              <View className="p-6 border-b border-gray-100">
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

              {/* Project Section */}
              {task.project && (
                <View className="p-6 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-lg bg-purple-100 items-center justify-center mr-3">
                      <Ionicons name="folder" size={20} color="#8B5CF6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-600 mb-1">PROJECT</Text>
                      <Text className="text-lg font-semibold text-gray-900">
                        {task.project.name || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Timeline Section */}
              <View className="p-6 mt-5">
              
                
                <View className="space-y-4">
                  <View className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4">
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

                  <View className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4">
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

                  <View className="flex-row justify-end mt-3 mr-2">
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
        </TouchableWithoutFeedback>

        {/* Bottom Spacing */}
        <View className="h-20" />
      </ScrollView>

      {/* Update Task Button - Only show when in update mode */}
      {isUpdateMode && (
        <View className="absolute bottom-20 left-6 right-6 z-20">
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
    </SafeAreaView>
  );
}

export default TaskDetailsScreen;
