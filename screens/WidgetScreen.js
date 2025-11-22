import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Toast from 'react-native-toast-message';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

// --- Redux Integration (MCP Context 7) ---
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTasksByProjectId,
  fetchTasks,
  fetchTodaysTasks,
  deleteExistingTask,
  setCurrentProjectId,
  clearError,
  selectTasks,
  selectTaskLoading,
  selectTaskError,
  selectTaskDeleting,
  selectTaskDeleteError,
} from '../store/slices/taskSlice';
import {
  fetchLogsByProjectId,
  clearError as clearLogError,
  selectLogs,
  selectLogLoading,
  selectLogError,
} from '../store/slices/logSlice';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// More comprehensive screen size detection for better responsive design
const isVerySmallScreen = screenWidth < 380 || screenHeight < 650; // Very small devices (more aggressive)
const isSmallScreen = screenWidth < 400 || screenHeight < 700; // Small devices
const isMediumScreen = screenWidth < 450; // Medium devices
const isLargeScreen = screenWidth >= 450; // Large devices

import Sidebar from "../components/Sidebar";
import CustomBottomNav from "../components/CustomBottomNav";
import { getUserRole } from "../services/utils/userRole";

// === Change Summary (2025-11-07) ===
// What: Added a projectId validation guard to render a clear "No project selected" message.
// Why: Ensures users understand when navigation does not provide a project context, preventing blank states.
// Dependencies: Relies on existing WidgetScreen state only; no new imports.
// MCP Context: Implemented following MCP context 7 best practices for clarity and maintainability.


function WidgetScreen({ navigation, route }) {
  // --- Redux State (MCP Context 7) ---
  const dispatch = useDispatch();
  const tasks = useSelector(selectTasks);
  const loading = useSelector(selectTaskLoading);
  const error = useSelector(selectTaskError);
  const deleting = useSelector(selectTaskDeleting);
  const deleteError = useSelector(selectTaskDeleteError);
  
  // --- Log Redux State (MCP Context 7) ---
  const logs = useSelector(selectLogs);
  const logsLoading = useSelector(selectLogLoading);
  const logsError = useSelector(selectLogError);

  // --- Local State ---
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [project, setProject] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [managerProjectId, setManagerProjectId] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isFirstMount = useRef(true);

  const { projectId, projectName } = route.params || {};
  const isProjectIdMissing = !projectId; // Explains: Track whether navigation failed to pass a project ID so we can show a clear message.

  // Load logs function using Redux (MCP Context 7)
  const loadLogs = async (projectId) => {
    try {
      console.log("WidgetScreen - Starting to load logs with projectId:", projectId);
      
      // Clear any previous log errors
      dispatch(clearLogError());
      
      // Use Redux action to fetch logs
      await dispatch(fetchLogsByProjectId(projectId));
      
      console.log("WidgetScreen - Logs loaded via Redux");
    } catch (error) {
      console.error("WidgetScreen - Error loading logs:", error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async (isRefresh = false) => {
    try {
      console.log("WidgetScreen - loadData started:", { isRefresh, projectId });
      
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsInitialLoad(true);
      }
      
      if (isProjectIdMissing) {
        // --- Project Validation Guard (MCP Context 7) ---
        // This guard prevents unnecessary network calls and surfaces a clear message when projectId is missing.
        setIsInitialLoad(false); // Explains: Immediately stop the loading state so the user message can show.
        setRefreshing(false); // Explains: Ensure pull-to-refresh animations stop if triggered without a project.
        return;
      }

      // Clear any previous errors
      dispatch(clearError());
      dispatch(clearLogError());

      const role = await getUserRole();
      setUserRole(role);
      console.log("WidgetScreen - User role:", role);

      // Set current project ID in Redux state
      if (projectId) {
        dispatch(setCurrentProjectId(projectId));
      }

      // --- Load logs (keep existing logic) ---
      await loadLogs(projectId);

      // --- Load tasks using Redux (MCP Context 7) ---
      if (role === "Employee") {
        if (projectId) {
          // Use fetchTasksByProjectId for specific project
          console.log("WidgetScreen - Employee: Fetching tasks by project ID:", projectId);
          await dispatch(fetchTasksByProjectId(projectId));
          
          // Set project info
          setProject({
            id: projectId,
            name: projectName || "Project",
          });
        } else {
          // Use fetchTasks for user's own tasks
          console.log("WidgetScreen - Employee: Fetching user's tasks");
          await dispatch(fetchTasks());
          setProject({ name: "My Tasks" });
        }
      } else if (role === "Manager") {
        if (projectId) {
          console.log("WidgetScreen - Manager: Fetching tasks by project ID:", projectId);
          setManagerProjectId(projectId);
          await dispatch(fetchTasksByProjectId(projectId));
          
          setProject({
            id: projectId,
            name: projectName || "Project",
          });
        } else {
          // Fallback: Get manager's projects if no projectId provided
          // This would need to be implemented with project slice
          setProject({ name: "No Projects" });
        }
      } else if (role === "Admin" || role === "Owner") {
        if (projectId) {
          console.log("WidgetScreen - Admin/Owner: Fetching tasks by project ID:", projectId);
          await dispatch(fetchTasksByProjectId(projectId));
          
          setProject({
            id: projectId,
            name: projectName || "Project",
          });
        } else {
          setProject({ name: "Project" });
        }
      }
    } catch (err) {
      console.error("WidgetScreen - Error in loadData:", err);
      Alert.alert("Error", "Failed to load project data. Please try again.");
    } finally {
      console.log("WidgetScreen - loadData completed, setting isInitialLoad to false");
      setIsInitialLoad(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    loadData(true);
  }, [userRole]); // Add userRole dependency to ensure logs reload when role changes

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const getAssignedToName = (assignedTo) => {
    if (!assignedTo) return "Unassigned";
    const firstName = assignedTo.first_name || "";
    const lastName = assignedTo.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || assignedTo.email || "Unassigned";
  };

  const handleUpdate = (task) => {
    // Only allow updating tasks if user is not an Employee
    if (userRole === "Employee") {
      Alert.alert("Access Denied", "Employees cannot update tasks.");
      return;
    }

    // Navigate to task details or update screen
    navigation.navigate("TaskDetails", { task });
  };

  const handleDelete = (task) => {
    // Only allow deleting tasks if user is not an Employee
    if (userRole === "Employee") {
      // --- Show Access Denied Toast Message ---
      Toast.show({
        type: 'error',
        text1: 'Access Denied',
        text2: 'Employees cannot delete tasks',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    const taskId = task?.id;
    const taskTitle = task?.title;

    if (!taskId) {
      return;
    }

    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${taskTitle}" permanently? This action is not reversible.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Use Redux action to delete task (MCP Context 7)
              const result = await dispatch(deleteExistingTask(taskId));
              
              if (deleteExistingTask.fulfilled.match(result)) {
                // Success - task deleted from Redux state automatically
                Toast.show({
                  type: 'success',
                  text1: 'Task Deleted Successfully!',
                  text2: `"${taskTitle}" has been permanently deleted`,
                  visibilityTime: 3000,
                  autoHide: true,
                  topOffset: 80,
                });
              } else {
                // Error handling
                const errorMessage = result.payload || "Failed to delete task. Please try again.";
                Toast.show({
                  type: 'error',
                  text1: 'Delete Failed',
                  text2: errorMessage,
                  visibilityTime: 4000,
                  autoHide: true,
                  topOffset: 80,
                });
              }
            } catch (error) {
              console.error("WidgetScreen - Error deleting task:", error);
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: "An unexpected error occurred",
                visibilityTime: 4000,
                autoHide: true,
                topOffset: 80,
              });
            }
          },
        },
      ]
    );
  };

  const TaskWidget = () => (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: isVerySmallScreen ? 12 : Math.min(20, screenWidth * 0.05),
        padding: isVerySmallScreen ? 12 : Math.min(25, screenWidth * 0.06),
        marginBottom: isVerySmallScreen ? 12 : 16,
        marginTop: isVerySmallScreen ? 6 : 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: isVerySmallScreen ? 4 : 6 },
        shadowOpacity: 0.12,
        shadowRadius: isVerySmallScreen ? 8 : 12,
        elevation: isVerySmallScreen ? 6 : 8,
      }}
    >
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: isVerySmallScreen ? 12 : 16,
        flexWrap: "wrap"
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Ionicons 
            name="list" 
            size={isVerySmallScreen ? 18 : Math.min(24, screenWidth * 0.06)} 
            color="black" 
          />
          <Text style={{
            fontSize: isVerySmallScreen ? 16 : Math.min(20, screenWidth * 0.05),
            fontWeight: "800",
            color: "#1a1a1a",
            marginLeft: isVerySmallScreen ? 6 : Math.min(10, screenWidth * 0.025),
            letterSpacing: 0.5,
          }}>
            Tasks ({tasks.length})
          </Text>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: isVerySmallScreen ? 8 : 0,
          }}
          onPress={() => {
            const navigationParams = {
              projectId: userRole === "Manager" ? managerProjectId : projectId,
              projectName: projectName || project?.name || 'Unknown Project', // Pass project name
              showUpcomingTasks: true, // --- Flag to indicate upcoming tasks view (MCP Context 7) ---
            };
            
            console.log('🔍 NAVIGATION DEBUG - WidgetScreen to ViewAllTasksScreen:');
            console.log('📱 Project ID:', navigationParams.projectId);
            console.log('📝 Project Name:', navigationParams.projectName);
            console.log('🚀 Navigating to ViewAllTasksScreen with params:', navigationParams);
            
            navigation.navigate("ViewAllTasksScreen", navigationParams);
          }}
        >
          <Text
            style={{
              fontSize: isVerySmallScreen ? 12 : Math.min(14, screenWidth * 0.035),
              fontWeight: "bold",
              marginRight: 4,
              color: "black",
            }}
          >
            View All
          </Text>
          <Ionicons
            name="chevron-forward"
            size={isVerySmallScreen ? 14 : Math.min(16, screenWidth * 0.04)}
            color="black"
          />
        </TouchableOpacity>
      </View>

      <View style={{ height: isVerySmallScreen ? Math.min(140, screenHeight * 0.18) : Math.min(160, screenHeight * 0.2) }}>
        {tasks && tasks.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {tasks.slice(0, 4).map((task) => (
              <View
                key={task.id}
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: isVerySmallScreen ? 8 : Math.min(12, screenWidth * 0.03),
                  padding: isVerySmallScreen ? 8 : Math.min(12, screenWidth * 0.03),
                  marginBottom: isVerySmallScreen ? 6 : 8,
                  borderWidth: 1,
                  borderColor: "#e9ecef",
                }}
              >
                <View style={{ 
                  flexDirection: "row", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: isVerySmallScreen ? 4 : 6 
                }}>
                  <Text
                    style={{
                      fontSize: isVerySmallScreen ? 14 : Math.min(16, screenWidth * 0.04),
                      fontWeight: "bold",
                      color: "#333",
                      flex: 1,
                      marginRight: isVerySmallScreen ? 6 : 8,
                    }}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{
                      fontSize: isVerySmallScreen ? 10 : Math.min(12, screenWidth * 0.03),
                      color: "#666",
                      fontWeight: "500",
                    }}>
                      {task.endTime ? formatDate(task.endTime) : "No End Date"}
                    </Text>
                  </View>
                </View>
                {userRole !== "Employee" && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons 
                      name="person" 
                      size={isVerySmallScreen ? 12 : Math.min(14, screenWidth * 0.035)} 
                      color="#666" 
                    />
                    <Text style={{
                      fontSize: isVerySmallScreen ? 11 : Math.min(13, screenWidth * 0.032),
                      color: "#666",
                      fontWeight: "500",
                      marginLeft: 4,
                    }}>
                      Assigned:
                    </Text>
                    <Text style={{
                      fontSize: isVerySmallScreen ? 11 : Math.min(13, screenWidth * 0.032),
                      color: "#666",
                      fontWeight: "500",
                      marginLeft: 4,
                    }}>
                      {getAssignedToName(task.assignedTo)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ 
            flex: 1, 
            justifyContent: "center", 
            alignItems: "center", 
            paddingVertical: isVerySmallScreen ? Math.min(30, screenHeight * 0.04) : Math.min(40, screenHeight * 0.05), 
            minHeight: isVerySmallScreen ? Math.min(100, screenHeight * 0.12) : Math.min(120, screenHeight * 0.15) 
          }}>
            <Ionicons 
              name="list-outline" 
              size={isVerySmallScreen ? Math.min(36, screenWidth * 0.09) : Math.min(48, screenWidth * 0.12)} 
              color="#ccc" 
            />
            <Text style={{
              fontSize: isVerySmallScreen ? 14 : Math.min(16, screenWidth * 0.04),
              color: "#666",
              fontWeight: "600",
              marginTop: isVerySmallScreen ? 8 : 12,
              marginBottom: 4,
            }}>
              No tasks found
            </Text>
            <Text style={{
              fontSize: isVerySmallScreen ? 12 : Math.min(14, screenWidth * 0.035),
              color: "#999",
              fontWeight: "400",
              textAlign: "center",
            }}>
              Tasks will appear here once created
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const LogsWidget = () => (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: isVerySmallScreen ? 12 : Math.min(20, screenWidth * 0.05),
        padding: isVerySmallScreen ? 12 : Math.min(20, screenWidth * 0.05),
        marginBottom: isVerySmallScreen ? 12 : 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: isVerySmallScreen ? 4 : 6 },
        shadowOpacity: 0.12,
        shadowRadius: isVerySmallScreen ? 8 : 12,
        elevation: isVerySmallScreen ? 6 : 8,
      }}
    >
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: isVerySmallScreen ? 12 : 16,
        flexWrap: "wrap"
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Ionicons 
            name="document-text" 
            size={isVerySmallScreen ? 18 : Math.min(24, screenWidth * 0.06)} 
            color="black" 
          />
          <Text style={{
            fontSize: isVerySmallScreen ? 16 : Math.min(20, screenWidth * 0.05),
            fontWeight: "800",
            color: "#1a1a1a",
            marginLeft: isVerySmallScreen ? 6 : Math.min(10, screenWidth * 0.025),
            letterSpacing: 0.5,
          }}>
            Activity Logs ({logs.length})
          </Text>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            opacity: logs.length === 0 ? 0.5 : 1,
            marginTop: isVerySmallScreen ? 8 : 0,
          }}
          onPress={() => {
            if (logs.length > 0) {
              console.log("WidgetScreen - Navigating to ViewAllLogScreen with logs:", logs);
              
              // Pass project ID and project name for all user roles
              const navigationParams = { 
                logs: logs,
                managerProjectId: userRole === "Manager" ? (managerProjectId || projectId) : null,
                projectId: projectId,  // Pass projectId for Employee and other roles
                projectName: projectName || project?.name || 'Unknown Project',  // Pass project name from HomeScreen/WidgetScreen
              };
              navigation.navigate("ViewAllLogScreen", navigationParams);
            }
          }}
          disabled={logs.length === 0}
        >
          <Text style={{
            fontSize: isVerySmallScreen ? 12 : Math.min(14, screenWidth * 0.035),
            fontWeight: "bold",
            color: logs.length === 0 ? "#999" : "black",
            marginRight: 4,
          }}>
            View All
          </Text>
          <Ionicons
            name="chevron-forward"
            size={isVerySmallScreen ? 14 : Math.min(16, screenWidth * 0.04)}
            color={logs.length === 0 ? "#999" : "black"}
          />
        </TouchableOpacity>
      </View>

      <View style={{ height: isVerySmallScreen ? Math.min(160, screenHeight * 0.2) : Math.min(200, screenHeight * 0.25) }}>
        {logs && logs.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {logs.slice(0, 4).map((log) => (
              <View
                key={log.id}
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: isVerySmallScreen ? 8 : Math.min(12, screenWidth * 0.03),
                  padding: isVerySmallScreen ? 8 : Math.min(12, screenWidth * 0.03),
                  marginBottom: isVerySmallScreen ? 6 : 8,
                  borderWidth: 1,
                  borderColor: "#e9ecef",
                }}
              >
                <View style={{ 
                  flexDirection: "row", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: isVerySmallScreen ? 4 : 6 
                }}>
                  <Text
                    style={{
                      fontSize: isVerySmallScreen ? 14 : Math.min(16, screenWidth * 0.04),
                      fontWeight: "bold",
                      color: "#333",
                      flex: 1,
                      marginRight: isVerySmallScreen ? 6 : 8,
                    }}
                    numberOfLines={1}
                  >
                    {userRole === "Employee" ? `Project: ${projectName || project?.name || 'Unknown Project'}` : `Project: ${projectName || project?.name || 'Unknown Project'}`}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{
                      fontSize: isVerySmallScreen ? 10 : Math.min(12, screenWidth * 0.03),
                      color: "#666",
                      fontWeight: "500",
                    }}>
                      {log.date}
                    </Text>
                  </View>
                </View>

                {userRole !== "Employee" && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons 
                      name="person" 
                      size={isVerySmallScreen ? 12 : Math.min(14, screenWidth * 0.035)} 
                      color="#666" 
                    />
                    <Text style={{
                      fontSize: isVerySmallScreen ? 11 : Math.min(13, screenWidth * 0.032),
                      color: "#666",
                      fontWeight: "500",
                      marginLeft: 4,
                    }}>
                      Created by:
                    </Text>
                    <Text style={{
                      fontSize: isVerySmallScreen ? 11 : Math.min(13, screenWidth * 0.032),
                      color: "#666",
                      fontWeight: "500",
                      marginLeft: 4,
                    }}>
                      {log.createdBy}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ 
            flex: 1, 
            justifyContent: "center", 
            alignItems: "center", 
            paddingVertical: isVerySmallScreen ? Math.min(30, screenHeight * 0.04) : Math.min(40, screenHeight * 0.05), 
            minHeight: isVerySmallScreen ? Math.min(100, screenHeight * 0.12) : Math.min(120, screenHeight * 0.15) 
          }}>
            <Ionicons 
              name="document-text-outline" 
              size={isVerySmallScreen ? Math.min(36, screenWidth * 0.09) : Math.min(48, screenWidth * 0.12)} 
              color="#ccc" 
            />
            <Text style={{
              fontSize: isVerySmallScreen ? 14 : Math.min(16, screenWidth * 0.04),
              color: "#666",
              fontWeight: "600",
              marginTop: isVerySmallScreen ? 8 : 12,
              marginBottom: 4,
            }}>
              No logs found
            </Text>
            <Text style={{
              fontSize: isVerySmallScreen ? 12 : Math.min(14, screenWidth * 0.035),
              color: "#999",
              fontWeight: "400",
              textAlign: "center",
            }}>
              Logs will appear here once created
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderContent = () => {
    // Debug logging
    console.log("WidgetScreen - renderContent:", {
      loading,
      logsLoading,
      isInitialLoad,
      error,
      logsError,
      tasksLength: tasks.length,
      logsLength: logs.length,
      project: !!project
    });

    // Don't render content during loading OR during initial load
    if (loading || logsLoading || isInitialLoad) {
      return null;
    }

    if (error || logsError) {
      return (
        <View className="flex-1 justify-center items-center p-5 min-h-[400px]">
          <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-medium">
            {error || logsError}
          </Text>
          <TouchableOpacity
            className="bg-[#007AFF] py-3 px-6 rounded-lg"
            onPress={() => loadData()}
          >
            <Text className="text-white text-[16px] font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isProjectIdMissing) {
      // --- Missing Project ID Notice (MCP Context 7) ---
      // Display a simple explanation so users know the project context is unavailable.
      return (
        <View className="flex-1 justify-center items-center p-5 min-h-[400px]">
          <Text className="text-[16px] text-[#3155A1] text-center mb-4 font-medium">
            No project selected. Please choose a project to continue.
          </Text>
        </View>
      );
    }

    if (project) {
      return (
        <>
          <TaskWidget />
          <View className="mb-6" />
          <LogsWidget />
        </>
      );
    }

    return (
      <View className="flex-1 justify-center items-center p-5 min-h-[400px]">
        <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-medium">
          Project not found
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#3155A1" barStyle="light-content" />
      
      {/* Show loading spinner if loading OR during initial load */}
      {(() => {
        const shouldShowLoader = loading || logsLoading || isInitialLoad;
        console.log("WidgetScreen - Main render condition:", {
          loading,
          logsLoading,
          isInitialLoad,
          shouldShowLoader,
          error,
          logsError,
          tasksLength: tasks.length,
          logsLength: logs.length
        });
        return shouldShowLoader;
      })() ? (
        // --- Simple Custom Loader (MCP Context 7) ---
        // Why: Simple inline loader centered on screen, no external dependencies
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-4 text-base text-gray-500">Loading tasks and logs...</Text>
        </View>
      ) : (
        <ScrollView
          style={{
            flex: 1,
            paddingHorizontal: isVerySmallScreen ? Math.min(12, screenWidth * 0.03) : Math.min(20, screenWidth * 0.05),
            paddingVertical: isVerySmallScreen ? Math.min(12, screenHeight * 0.015) : Math.min(20, screenHeight * 0.025),
            paddingBottom: isVerySmallScreen ? 80 : 100,
            paddingTop: isVerySmallScreen ? 12 : 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3155A1"]}
              tintColor="#3155A1"
            />
          }
        >
          {renderContent()}
        </ScrollView>
      )}

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={() => setSidebarVisible(false)}
      />

      <CustomBottomNav
        currentScreen="chats" // ✅ ADD: Tell bottom nav we're on chats/widget screen
        onAddPress={() => {
          // --- FAB Navigation Logic Based on User Role and Widget States ---
          console.log("WidgetScreen - FAB pressed, userRole:", userRole, "projectId:", projectId, "tasks.length:", tasks.length, "logs.length:", logs.length);
          
          // For Manager role: If tasks widget is empty, navigate to CreateTaskScreen
          if (userRole === "Manager" && tasks.length === 0) {
            const navigationParams = { projectId: projectId }; // Use projectId from route params
            console.log("WidgetScreen - Manager navigating to CreateTask with projectId:", projectId);
            navigation.navigate("CreateTask", navigationParams);
            return;
          }
          
          // For Employee role: Always allow navigation to CreateLogScreen (MCP Context 7)
          // Business Rule: Employees should be able to create logs regardless of existing logs
          if (userRole === "Employee") {
            const navigationParams = { projectId: projectId }; // Use projectId from route params
            console.log("WidgetScreen - Employee FAB pressed, navigating to CreatLog with projectId:", projectId);
            navigation.navigate("CreatLog", navigationParams);
            return;
          }

          // For Manager role: If logs widget is empty (and tasks exist), navigate to CreateLogScreen
          if (userRole === "Manager" && logs.length === 0) {
            const navigationParams = { projectId: projectId }; // Use projectId from route params (not managerProjectId)
            navigation.navigate("CreatLog", navigationParams);
            return;
          }

          // For other roles (Admin/Owner), check if there are no tasks and navigate to CreateTaskScreen
          if (userRole !== "Employee" && userRole !== "Manager" && tasks.length === 0) {
            const navigationParams = { projectId: projectId };
            navigation.navigate("CreateTask", navigationParams);
            return;
          }

          // If widgets exist or user doesn't have permission, do nothing
        }}
      />
    </View>
  );
}

export default WidgetScreen;
