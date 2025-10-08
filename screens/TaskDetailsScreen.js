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
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Keyboard,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from 'react-native-toast-message';
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import UpdateTaskModal from "./components/UpdateTaskModal";
import { deleteTaskById } from "../services/tasks/deleteTaskById";
import { getUserRole } from "../services/utils/userRole";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { getTaskById } from "../services/tasks/getTaskById";
import { getEmployeesToAssignTask } from "../services/employees/getEmployeesOfTheCompany";
import { updateTask } from "../services/tasks/updateTaskById";
import { assignTaskToUser } from "../services/tasks/assignTask";

// --- Redux Integration (MCP Context 7) ---
import { useDispatch, useSelector } from 'react-redux';
import {
  assignTaskToUserAction,
  selectTaskAssigning,
  selectTaskAssignError,
} from '../store/slices/taskSlice';

function TaskDetailsScreen({ navigation, route }) {
  const { taskId, projectId, task: routeTask } = route.params || {};
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // --- Redux State (MCP Context 7) ---
  const dispatch = useDispatch();
  const assigning = useSelector(selectTaskAssigning);
  const assignError = useSelector(selectTaskAssignError);

  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [currentTask, setCurrentTask] = useState(routeTask || null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(Boolean(taskId) && !routeTask);
  const [error, setError] = useState(null);

  // --- Assignment Modal State ---
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

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



  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId || routeTask) return;
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Fetching task with ID:', taskId);
        const data = await getTaskById(taskId);
        console.log('✅ Task loaded successfully:', data?.title);
        setCurrentTask(data);
      } catch (err) {
        console.error('❌ TaskDetailsScreen - Error fetching task by id:', err);
        // --- Enhanced error handling with more specific messages ---
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load task';
        setError(`Unable to load task: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [taskId, routeTask]);

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
    // Close modal only; user will swipe down to refresh manually
    setShowUpdateModal(false);
  };

  const onRefresh = async () => {
    // --- Enhanced Refresh Logic with Better Error Handling ---
    // Business Rule: Allow refresh for all users to get latest task data
    console.log('🔄 Refresh triggered - currentTask:', currentTask?.id);
    console.log('🔄 TaskId from route:', taskId);
    
    const taskIdToRefresh = currentTask?.id || taskId;
    
    if (!taskIdToRefresh) {
      console.log('❌ No task ID available for refresh');
      // --- Show user-friendly error message for missing task ID ---
      Alert.alert(
        "Refresh Failed",
        "Unable to refresh task data. Task ID not found.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setRefreshing(true);
    try {
      console.log('🔄 Fetching updated task data for ID:', taskIdToRefresh);
      const updated = await getTaskById(taskIdToRefresh);
      console.log('✅ Refresh successful - updated task:', updated?.title);
      setCurrentTask(updated);
    } catch (err) {
      console.error('❌ TaskDetailsScreen - Refresh failed:', err);
      // --- Show user-friendly error message with more specific details ---
      const errorMessage = err?.response?.data?.message || err?.message || 'Unknown error occurred';
      Alert.alert(
        "Refresh Failed",
        `Unable to refresh task data: ${errorMessage}`,
        [{ text: "OK" }]
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = () => {
    // Show beautiful custom dialog instead of Alert
    setTaskToDelete(currentTask);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    const taskId = taskToDelete.id;
    const taskTitle = taskToDelete.title;

    // Close dialog immediately when delete button is tapped
    setDeleteDialogVisible(false);
    setTaskToDelete(null);

    try {
      await deleteTaskById(taskId);
      
      // --- Show Success Toast Message ---
      Toast.show({
        type: 'success',
        text1: 'Task Deleted Successfully!',
        text2: `"${taskTitle}" has been permanently deleted`,
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });

      // Navigate back after a short delay to allow toast to be visible
      setTimeout(() => {
        // Get projectId from current task or route param
        const projId = taskToDelete?.project?.id || taskToDelete?.projectId || projectId;

        if (projId) {
          // Navigate back to ViewAllTasksScreen with projectId
          navigation.navigate('ViewAllTasksScreen', { projectId: projId });
        } else {
          // Fallback: go back to previous screen
          navigation.goBack();
        }
      }, 1000);
    } catch (error) {
      console.error('Error deleting task:', error);
      
      // --- Show Error Toast Message ---
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Failed to delete task. Please try again.',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    setTaskToDelete(null);
  };

  // --- Assignment Modal Functions ---
  const handleAssignmentPress = async () => {
    // Only show modal if task is not assigned and user has permission
    if (getAssignedToName(currentTask.assigned_to || currentTask.assignedTo) === "Unassigned" && userRole !== 'Employee') {
      // Fetch employees if not already loaded
      if (employees.length === 0 && !loadingEmployees) {
        fetchEmployees();
      }
      setShowAssignmentModal(true);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const data = await getEmployeesToAssignTask();
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      // --- Show Error Toast Message ---
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load employees. Please try again.',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  // --- Search and Filter Functions ---
  const filteredEmployees = employees.filter(employee => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const firstName = employee.first_name?.toLowerCase() || '';
    const lastName = employee.last_name?.toLowerCase() || '';
    const email = employee.email?.toLowerCase() || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return firstName.includes(query) ||
      lastName.includes(query) ||
      fullName.includes(query) ||
      email.includes(query);
  });

  const handleEmployeeSelect = (employee) => {
    // Select the employee and close modal
    setSelectedEmployee(employee);
    setShowAssignmentModal(false);
  };

  const handleAssignTask = async () => {
    // --- Debug Task ID Issue ---
    console.log('=== TASK ASSIGNMENT DEBUG ===');
    console.log('selectedEmployee:', selectedEmployee);
    console.log('currentTask:', currentTask);
    console.log('currentTask?.id:', currentTask?.id);
    console.log('taskId from route:', taskId);
    console.log('route params:', route.params);
    console.log('==============================');

    if (!selectedEmployee) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select an employee first.',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    // --- Check for Task ID ---
    const taskIdToUse = currentTask?.id || taskId;
    
    // --- Enhanced Task Object Analysis ---
    console.log('🔍 DETAILED TASK ANALYSIS:');
    console.log('- currentTask exists:', !!currentTask);
    console.log('- currentTask.id:', currentTask?.id, typeof currentTask?.id);
    console.log('- taskId from route:', taskId, typeof taskId);
    console.log('- taskIdToUse:', taskIdToUse, typeof taskIdToUse);
    console.log('- Full currentTask keys:', currentTask ? Object.keys(currentTask) : 'no currentTask');
    console.log('- Full currentTask object:', JSON.stringify(currentTask, null, 2));
    
    if (!taskIdToUse) {
      console.error('❌ TASK ID NOT FOUND');
      
      Toast.show({
        type: 'error',
        text1: 'Task ID Not Found',
        text2: 'Unable to find task ID. Please try refreshing the screen.',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    try {
      console.log('🚀 Making assignment API call via Redux:');
      console.log('- Task ID:', taskIdToUse);
      console.log('- Employee ID:', selectedEmployee.id);
      console.log('- Employee Name:', `${selectedEmployee.first_name} ${selectedEmployee.last_name}`);

      // --- FIXED: Use Redux action instead of direct service call (MCP Context 7) ---
      // Business Rule: Use Redux to update global state so all components see the change
      console.log('🚀 Proceeding with Redux task assignment...');
      
      const result = await dispatch(assignTaskToUserAction({
        taskId: taskIdToUse,
        userId: selectedEmployee.id
      }));

      if (assignTaskToUserAction.fulfilled.match(result)) {
        // Success - Redux state is updated automatically
        console.log('✅ Redux assignment successful:', result.payload);

        // Update local state to reflect the change (fallback for immediate UI update)
        setCurrentTask({
          ...currentTask,
          assignedTo: selectedEmployee,
          assignedToUserId: selectedEmployee.id
        });

        // Reset states
        setShowAssignmentModal(false);
        setSelectedEmployee(null);
        setSearchQuery('');

        // --- Show Success Toast Message ---
        Toast.show({
          type: 'success',
          text1: 'Task Assigned Successfully!',
          text2: `Task assigned to ${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });
      } else {
        // Error handling
        const errorMessage = result.payload || 'Failed to assign task. Please try again.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error assigning task:', error);
      console.error('- Error message:', error.message);
      console.error('- Error response:', error.response?.data);
      
      // --- Show Error Toast Message ---
      Toast.show({
        type: 'error',
        text1: 'Assignment Failed',
        text2: error.message || 'Failed to assign task. Please try again.',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };



  // --- Only show loading screen if we have no task data at all ---
  // Business Rule: Show task details immediately if available, even during API calls
  if (loading && !currentTask) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-[16px] text-[#666]">Loading Task details...</Text>
        </View>
        {/* Show CustomBottomNav during loading */}
        <CustomBottomNav navigation={navigation} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
        <Text className="text-[16px] text-[#dc3545] mb-4">{error}</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: "#007AFF", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
        >
          <Text className="text-white text-[16px] font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentTask) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-[16px] text-[#666]">Task not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

      <ScrollView 
        className="flex-1" 
        style={{ paddingTop: 20 }}
        contentContainerStyle={{ paddingBottom: bottomSpacing }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3155A1", "#007AFF"]}
            tintColor="#3155A1"
            progressBackgroundColor="#ffffff"
            size="default"
            title="Pull to refresh"
            titleColor="#666666"
          />
        }
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
                    {currentTask.title || "Untitled Task"}
                  </Text>
                </View>
                {userRole !== 'Employee' && (
                  <Menu rendererProps={{
                    placement: 'bottom-end',
                    anchorStyle: { marginRight: 0 },
                    triggerStyle: { marginRight: 0 }
                  }}>
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
                        marginRight: -40,
                        marginTop: 15,
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

              {currentTask.description && (
                <View className="pt-4 border-t border-gray-100">
                  <Text className="text-sm font-medium text-gray-600 mb-2">DESCRIPTION</Text>
                  <Text className="text-base text-gray-700 leading-relaxed">
                    {currentTask.description}
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
                      {currentTask.priority ? (
                        <View className="flex-row items-center">
                          <View
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: priorityOptions.find(p => p.id === currentTask.priority)?.color || '#6b7280' }}
                          />
                          <Text className="text-lg font-semibold text-gray-900">
                            {priorityOptions.find(p => p.id === currentTask.priority)?.label || currentTask.priority}
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
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-lg bg-green-100 items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-600 mb-1">ASSIGNED TO</Text>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Text 
                          className="text-lg font-semibold text-gray-900"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{ flex: 1, marginRight: 8 }}
                        >
                          {assigning ? "Assigning..." :
                            selectedEmployee ?
                              `${selectedEmployee.first_name} ${selectedEmployee.last_name}`.trim() || selectedEmployee.email :
                              getAssignedToName(currentTask.assigned_to || currentTask.assignedTo)
                          }
                        </Text>
                        {getAssignedToName(currentTask.assigned_to || currentTask.assignedTo) === "Unassigned" && userRole !== 'Employee' && (
                          <TouchableOpacity
                            onPress={handleAssignmentPress}
                            style={{ marginLeft: 8 }}
                          >
                            <Ionicons 
                              name="chevron-down" 
                              size={16} 
                              color="#6B7280" 
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      {selectedEmployee && (
                        <TouchableOpacity
                          onPress={handleAssignTask}
                          disabled={assigning}
                          style={{
                            backgroundColor: assigning ? '#6B7280' : '#000000',
                            paddingVertical: 4,
                            paddingHorizontal: 16,
                            borderRadius: 6,
                            marginLeft: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 70,
                          }}
                        >
                          {assigning ? (
                            <ActivityIndicator
                              size="small"
                              color="white"
                            />
                          ) : (
                            <Text style={{
                              color: 'white',
                              fontSize: 13,
                              fontWeight: '600'
                            }}>
                              Assign
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
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
                      {formatDateTime(currentTask.startTime)}
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
                      {currentTask.endTime ? formatDateTime(currentTask.endTime) : "Not selected"}
                    </Text>
                  </View>

                  <View className="flex-row justify-end mt-3 ">
                    <View className="flex-row items-center">
                      <Text className="text-sm font-medium text-gray-600 mr-2">Created At:</Text>
                    </View>
                    <Text className="text-sm font-semibold text-gray-900">
                      {formatDateTime(currentTask.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>



          {/* Bottom Spacing */}
          <View style={{ height: bottomSpacing }} />
        </ScrollView>



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
          task={currentTask}
          projectId={currentTask?.project?.id}
          onSuccess={handleUpdateSuccess}
        />

        {/* Beautiful Delete Confirmation Dialog */}
        <Modal
          visible={deleteDialogVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelDelete}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxWidth: 320,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 8,
            }}>
              {/* Warning Icon */}
              <View style={{
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#FEF2F2',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <Ionicons name="warning" size={24} color="#EF4444" />
                </View>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#1F2937',
                  textAlign: 'center',
                  marginBottom: 4,
                }}>
                  Delete Task
                </Text>
              </View>

              {/* Message */}
              <Text style={{
                fontSize: 15,
                color: '#6B7280',
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 16,
              }}>
                Are you sure you want to delete{' '}
                <Text style={{ fontWeight: '600', color: '#1F2937' }}>
                  "{taskToDelete?.title}"
                </Text>
                {' '}permanently?
              </Text>
              
              <Text style={{
                fontSize: 13,
                color: '#EF4444',
                textAlign: 'center',
                fontWeight: '500',
                marginBottom: 20,
              }}>
                This action cannot be undone.
              </Text>

              {/* Action Buttons */}
              <View style={{
                flexDirection: 'row',
                gap: 10,
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#F3F4F6',
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                  onPress={cancelDelete}
                  activeOpacity={0.8}
                >
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#374151',
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#EF4444',
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                  onPress={confirmDelete}
                  activeOpacity={0.8}
                >
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: 'white',
                  }}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* --- Simple Employee Assignment Modal (MCP Context 7) --- */}
        {/* Business Rule: Clean, simple modal for employee assignment */}
        <Modal
          visible={showAssignmentModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowAssignmentModal(false);
            setSelectedEmployee(null);
            setSearchQuery('');
          }}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}>
            {/* Modal Container */}
            <View style={{
              backgroundColor: 'white',
              borderRadius: 16,
              width: '100%',
              maxWidth: 400,
              maxHeight: '70%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            }}>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#111827',
                }}>
                  Assign Employee
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowAssignmentModal(false);
                    setSelectedEmployee(null);
                    setSearchQuery('');
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 16,
                backgroundColor: 'white',
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}>
                  <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: '#111827',
                    }}
                    placeholderTextColor="#9CA3AF"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Employee List */}
              <ScrollView 
                style={{ maxHeight: 300 }} 
                showsVerticalScrollIndicator={true}
              >
                {loadingEmployees ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#000000" />
                    <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 14 }}>
                      Loading employees...
                    </Text>
                  </View>
                ) : filteredEmployees.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 20 }}>
                    <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                    <Text style={{ color: '#6B7280', fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
                      {searchQuery ? 'No employees found' : 'No employees available'}
                    </Text>
                  </View>
                ) : (
                  filteredEmployees.map((employee, index) => (
                    <TouchableOpacity
                      key={employee.id || index}
                      onPress={() => handleEmployeeSelect(employee)}
                      style={{
                        marginHorizontal: 16,
                        marginBottom: 10,
                        padding: 12,
                        backgroundColor: selectedEmployee?.id === employee.id ? '#F3F4F6' : '#FFFFFF',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selectedEmployee?.id === employee.id ? '#000000' : '#E5E7EB',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      {/* Avatar */}
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: selectedEmployee?.id === employee.id ? '#000000' : '#E5E7EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: selectedEmployee?.id === employee.id ? '#FFFFFF' : '#6B7280'
                        }}>
                          {employee.first_name?.charAt(0)?.toUpperCase() || employee.email?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                      
                      {/* Employee Info */}
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: '#111827',
                        }}>
                          {employee.first_name && employee.last_name
                            ? `${employee.first_name} ${employee.last_name}`
                            : employee.email || 'Unknown Employee'
                          }
                        </Text>
                        {employee.email && employee.first_name && (
                          <Text style={{
                            fontSize: 13,
                            color: '#6B7280',
                            marginTop: 2,
                          }}>
                            {employee.email}
                          </Text>
                        )}
                      </View>
                      
                      {/* Checkmark */}
                      {selectedEmployee?.id === employee.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#000000" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Sidebar */}
        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} navigation={navigation} />

        {/* Bottom Navigation */}
        <CustomBottomNav navigation={navigation} />
      </View>
  );
}

export default TaskDetailsScreen;
