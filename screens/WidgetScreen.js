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
} from "react-native";
import Toast from 'react-native-toast-message';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// More comprehensive screen size detection for better responsive design
const isVerySmallScreen = screenWidth < 380 || screenHeight < 650; // Very small devices (more aggressive)
const isSmallScreen = screenWidth < 400 || screenHeight < 700; // Small devices
const isMediumScreen = screenWidth < 450; // Medium devices
const isLargeScreen = screenWidth >= 450; // Large devices

import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import { getTaskByProjectId } from "../services/tasks/getTaskByProjectId";
import { getProjectById } from "../services/projects/getProject";
import { getTasksAssignedToEmployees } from "../services/tasks/getTasksAssignedToEmployees";
import getTasksByloginId from "../services/tasks/getTasksByloginId";
import { deleteTaskById } from "../services/tasks/deleteTaskById";
import { getMyProjects } from "../services/projects/getProjectsByLoginUserId";
import { getLogs } from "../services/log/getLogs";
import { getLogsForOwnerRecent } from "../services/log/getLogsForOwnerRecent";
import Loader from "../services/utils/loader";
import { getUserRole } from "../services/utils/userRole";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

function WidgetScreen({ navigation, route }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [managerProjectId, setManagerProjectId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const isFirstMount = useRef(true);

  const { projectId, projectName } = route.params || {};

  // Load logs function
  const loadLogs = async (projectId) => {
    try {
      setLogsLoading(true);
      console.log("WidgetScreen - Starting to load logs with projectId:", projectId);

      const logsResponse = await getLogs(projectId);
      console.log("WidgetScreen - Logs response:", logsResponse);
      console.log("WidgetScreen - Logs response type:", typeof logsResponse);
      console.log("WidgetScreen - Is logs response array?", Array.isArray(logsResponse));

      // Check if response has logs array or if it's directly an array
      let logsArray = [];
      if (logsResponse?.logs && Array.isArray(logsResponse.logs)) {
        logsArray = logsResponse.logs;
      } else if (Array.isArray(logsResponse)) {
        logsArray = logsResponse;
      } else {
        console.log("WidgetScreen - No logs found in response:", logsResponse);
        setLogs([]);
        return;
      }

      console.log("WidgetScreen - Processing logs array:", logsArray);

      // Transform logs data to match the expected format
      const transformedLogs = logsArray.map(log => {
        return {
          id: log.id,
          createdBy: log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'Unknown User',
          date: log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A',
          createdAt: log.createdAt, // Preserve original createdAt for filtering
          description: log.note || 'No description',
          images: log.images || [], // Keep all images for the log
          image: log.images && log.images.length > 0 ? { uri: log.images[0].imageUrl } : null,
        };
      });

      // Sort logs by date (newest first)
      const sortedLogs = transformedLogs.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      console.log("WidgetScreen - Transformed and sorted logs:", sortedLogs);
      console.log("WidgetScreen - Setting logs state with length:", sortedLogs.length);
      setLogs(sortedLogs);
    } catch (error) {
      console.error("WidgetScreen - Error loading logs:", error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const role = await getUserRole();
      setUserRole(role);

      let response;

      if (role === "Employee") {
        // --- Load logs for Employee role using getLogs service ---
        await loadLogs(projectId);
        
        // Check if projectId is provided in route params
        if (projectId) {
          // Use getProjectById when projectId is provided
          console.log("WidgetScreen - Employee: Using getProjectById with projectId:", projectId);
          response = await getProjectById(projectId);
          console.log("WidgetScreen - Employee: getProjectById response:", response);

          if (response) {
            // Map the project data, use projectName from HomeScreen if available
            setProject({
              id: response.id,
              name: projectName || response.name || "Project",
              description: response.description,
              startDate: response.startDate,
              endDate: response.endDate
            });

            // Map the tasks from the response
            const projectTasks = response.tasks || [];
            console.log("WidgetScreen - Employee: Project tasks:", projectTasks);
            setTasks(projectTasks);
          } else {
            setProject({ name: "Project" });
            setTasks([]);
          }
        } else {
          // Fallback to getTasksByloginId when no projectId is provided
          console.log("WidgetScreen - Employee: Using getTasksByloginId (no projectId provided)");
          const employeeTasks = await getTasksByloginId();
          setProject({ name: "My Tasks" });
          if (employeeTasks && Array.isArray(employeeTasks)) {
            setTasks(employeeTasks);
          } else if (employeeTasks && employeeTasks.tasks && Array.isArray(employeeTasks.tasks)) {
            setTasks(employeeTasks.tasks);
          } else {
            setTasks([]);
          }
        }
      } else if (role === "Manager") {
        // --- Load logs for Manager role using getLogs service ---
        await loadLogs(projectId);

        // Check if projectId is provided from HomeScreen (when Manager taps on project card)
        if (projectId) {
          // Use the projectId passed from HomeScreen
          console.log("WidgetScreen - Manager: Using projectId from HomeScreen:", projectId);
          setManagerProjectId(projectId);
          response = await getProjectById(projectId);
          console.log("WidgetScreen - Manager: getProjectById response:", response);

          if (response && response.project) {
            setProject({
              ...response.project,
              name: projectName || response.project.name
            });
            setTasks(response.tasks || []);
          } else if (response && response.tasks) {
            setProject({
              ...response,
              name: projectName || response.name
            });
            setTasks(response.tasks || []);
          } else if (response && Array.isArray(response)) {
            setProject({ name: projectName || "Project" });
            setTasks(response);
          } else if (response) {
            setProject({
              ...response,
              name: projectName || response.name
            });
            setTasks([]);
          } else {
            setProject({ name: projectName || "Project" });
            setTasks([]);
          }
        } else {
          // Fallback: Get manager's projects if no projectId provided
          const projectsResponse = await getMyProjects();

          if (projectsResponse && projectsResponse.length > 0) {
            // Use the first project's ID to get tasks
            const firstProjectId = projectsResponse[0].id;
            setManagerProjectId(firstProjectId);
            response = await getProjectById(firstProjectId);

            if (response && response.project) {
              setProject(response.project);
              setTasks(response.tasks || []);
            } else if (response && response.tasks) {
              setProject(response);
              setTasks(response.tasks || []);
            } else if (response && Array.isArray(response)) {
              setProject({ name: "Project" });
              setTasks(response);
            } else if (response) {
              setProject(response);
              setTasks([]);
            } else {
              setProject({ name: "Project" });
              setTasks([]);
            }
          } else {
            setProject({ name: "No Projects" });
            setTasks([]);
          }
        }
      } else if (role === "Admin") {
        // Load logs for Admin role
        await loadLogs(projectId);

        console.log("WidgetScreen - Calling getTaskByProjectId for role:", role, "with projectId:", projectId);
        response = await getTaskByProjectId(projectId);
        console.log("WidgetScreen - getTaskByProjectId response:", response);

        if (response && response.project) {
          console.log("WidgetScreen - Response has project property");
          setProject(response.project);
          setTasks(response.tasks || []);
        } else if (response && response.tasks) {
          console.log("WidgetScreen - Response has tasks property");
          setProject(response);
          setTasks(response.tasks || []);
        } else if (response && Array.isArray(response)) {
          console.log("WidgetScreen - Response is an array of tasks, length:", response.length);
          console.log("WidgetScreen - First task in array:", response[0]);
          setProject({ name: "Project" });
          setTasks(response);
        } else if (response) {
          console.log("WidgetScreen - Response exists but no expected structure");
          setProject(response);
          setTasks([]);
        } else {
          console.log("WidgetScreen - No response received");
          setProject({ name: "Project" });
          setTasks([]);
        }
      } else if (role === "Owner") {
        // --- Load recent logs for Owner role using getLogsForOwnerRecent service ---
        console.log("WidgetScreen - Owner: Loading recent logs using getLogsForOwnerRecent service with projectId:", projectId);
        const ownerLogsResponse = await getLogsForOwnerRecent(projectId);
        console.log("WidgetScreen - Owner: getLogsForOwnerRecent response:", ownerLogsResponse);

        // Map the owner logs response to the expected format
        if (ownerLogsResponse && Array.isArray(ownerLogsResponse)) {
          const mappedLogs = ownerLogsResponse.map(log => {
            return {
              id: log.id,
              createdBy: log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'Unknown User',
              date: log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A',
              createdAt: log.createdAt,
              description: log.note || 'No description',
              images: log.images || [],
              image: log.images && log.images.length > 0 ? { uri: log.images[0].imageUrl } : null,
            };
          });

          // Sort logs by date (newest first)
          const sortedLogs = mappedLogs.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB - dateA;
          });

          console.log("WidgetScreen - Owner: Mapped and sorted logs:", sortedLogs);
          setLogs(sortedLogs);
        } else {
          console.log("WidgetScreen - Owner: No logs found in response");
          setLogs([]);
        }

        // --- Load tasks for Owner role using getTaskByProjectId ---
        console.log("WidgetScreen - Owner: Calling getTaskByProjectId for tasks with projectId:", projectId);
        response = await getTaskByProjectId(projectId);
        console.log("WidgetScreen - Owner: getTaskByProjectId response:", response);

        if (response && response.tasks) {
          console.log("WidgetScreen - Owner: Response has tasks property, tasks count:", response.tasks.length);
          setProject(response);
          setTasks(response.tasks || []);
        } else if (response && Array.isArray(response)) {
          console.log("WidgetScreen - Owner: Response is an array of tasks, length:", response.length);
          setProject({ name: "Project" });
          setTasks(response);
        } else if (response) {
          console.log("WidgetScreen - Owner: Response exists but no expected structure");
          setProject(response);
          setTasks([]);
        } else {
          console.log("WidgetScreen - Owner: No response received");
          setProject({ name: "Project" });
          setTasks([]);
        }
      }
    } catch (err) {
      setError("Failed to load project data");
      Alert.alert("Error", "Failed to load project data. Please try again.");
    } finally {
      setLoading(false);
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
              // Import and use deleteTaskById here
              const {
                deleteTaskById,
              } = require("../services/tasks/deleteTaskById");
              await deleteTaskById(taskId);

              // Refresh the data
              await loadData(true);

              // --- Show Success Toast Message ---
              Toast.show({
                type: 'success',
                text1: 'Task Deleted Successfully!',
                text2: `"${taskTitle}" has been permanently deleted`,
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 80,
              });
            } catch (error) {
              let errorMessage = "Failed to delete task. Please try again.";
              if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = error.message;
              }

              // --- Show Error Toast Message ---
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: errorMessage,
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
              showUpcomingTasks: true, // --- Flag to indicate upcoming tasks view (MCP Context 7) ---
            };
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
        {console.log("WidgetScreen - LogsWidget render: logs state:", logs, "logs.length:", logs ? logs.length : 0)}
        {logs && logs.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {console.log("WidgetScreen - Rendering logs:", logs.slice(0, 4))}
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
    if (loading) {
      return (
        <View className="flex-1 justify-center items-center p-5 min-h-[700px]">
          <Loader
            size="large"
            color="#000000"
            text="Loading tasks and logs..."
          />
        </View>
      );
    }

    if (error) {
      return (
        <View className="flex-1 justify-center items-center p-5 min-h-[400px]">
          <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-medium">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-[#007AFF] py-3 px-6 rounded-lg"
            onPress={loadData}
          >
            <Text className="text-white text-[16px] font-semibold">Retry</Text>
          </TouchableOpacity>
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
