import React, { useState, useRef,useEffect } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import { getTaskByProjectId } from "../services/tasks/getTaskByProjectId";
import { getTasksAssignedToEmployees } from "../services/tasks/getTasksAssignedToEmployees";
import getTasksByloginId from "../services/tasks/getTasksByloginId";
import { deleteTaskById } from "../services/tasks/deleteTaskById";
import { getMyProjects } from "../services/projects/getProjectsByLoginUserId";
import { getLogs } from "../services/log/getLogs";
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

  const { projectId } = route.params || {};

  // Load logs function
  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      console.log("WidgetScreen - Starting to load logs...");
      
      const logsResponse = await getLogs();
      console.log("WidgetScreen - Logs response:", logsResponse);
      
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
      const transformedLogs = logsArray.map(log => ({
        id: log.id,
        createdBy: log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'Unknown User',
        date: log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A',
        description: log.note || 'No description',
        images: log.images || [], // Keep all images for the log
        image: log.images && log.images.length > 0 ? { uri: log.images[0].imageUrl } : require("../assets/robot.png"),
      }));
      
      console.log("WidgetScreen - Transformed logs:", transformedLogs);
      setLogs(transformedLogs);
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

      // Load logs in parallel with other data
      loadLogs();

      let response;

      if (role === "Employee") {
        response = await getTasksAssignedToEmployees();
        setProject({ name: "My Tasks" });
        setTasks(response || []);
      } else if (role === "Manager") {
        // First get the manager's projects
        const projectsResponse = await getMyProjects();

        if (projectsResponse && projectsResponse.length > 0) {
          // Use the first project's ID to get tasks
          const firstProjectId = projectsResponse[0].id;
          setManagerProjectId(firstProjectId);
          response = await getTaskByProjectId(firstProjectId);

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
      } else if (role === "Admin" || role === "Owner") {
        response = await getTaskByProjectId(projectId);

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
  }, []);

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
      Alert.alert("Access Denied", "Employees cannot delete tasks.");
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

              Alert.alert("Success", "Task deleted successfully!", [
                { text: "OK" },
              ]);
            } catch (error) {
              let errorMessage = "Failed to delete task. Please try again.";
              if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = error.message;
              }

              Alert.alert("Error", errorMessage, [{ text: "OK" }]);
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
        borderRadius: Math.min(20, screenWidth * 0.05),
        padding: Math.min(25, screenWidth * 0.06),
        marginBottom: 16,
        marginTop: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="list" size={Math.min(24, screenWidth * 0.06)} color="black" />
          <Text style={{
            fontSize: Math.min(20, screenWidth * 0.05),
            fontWeight: "800",
            color: "#1a1a1a",
            marginLeft: Math.min(10, screenWidth * 0.025),
            letterSpacing: 0.5,
          }}>
            Tasks ({tasks.length})
          </Text>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            opacity: tasks.length === 0 ? 0.7 : 1,
          }}
          onPress={() => {
            const navigationParams =
              userRole === "Employee"
                ? {}
                : {
                    projectId:
                      userRole === "Manager" ? managerProjectId : projectId,
                  };
            navigation.navigate("ViewAllTasksScreen", navigationParams);
          }}
          disabled={tasks.length === 0}
        >
          <Text
            style={{
              fontSize: Math.min(14, screenWidth * 0.035),
              fontWeight: "bold",
              marginRight: 4,
              color: tasks.length === 0 ? "#ccc" : "black",
            }}
          >
            View All
          </Text>
          <Ionicons
            name="chevron-forward"
            size={Math.min(16, screenWidth * 0.04)}
            color={tasks.length === 0 ? "#ccc" : "black"}
          />
        </TouchableOpacity>
      </View>

      <View style={{ height: Math.min(160, screenHeight * 0.2) }}>
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
                  borderRadius: Math.min(12, screenWidth * 0.03),
                  padding: Math.min(12, screenWidth * 0.03),
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#e9ecef",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text
                    style={{
                      fontSize: Math.min(16, screenWidth * 0.04),
                      fontWeight: "bold",
                      color: "#333",
                      flex: 1,
                      marginRight: 8,
                    }}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{
                      fontSize: Math.min(12, screenWidth * 0.03),
                      color: "#666",
                      fontWeight: "500",
                    }}>
                      {formatDate(task.endTime)}
                    </Text>
                  </View>
                </View>
                {userRole !== "Employee" && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="person" size={Math.min(14, screenWidth * 0.035)} color="#666" />
                    <Text style={{
                      fontSize: Math.min(13, screenWidth * 0.032),
                      color: "#666",
                      fontWeight: "500",
                      marginLeft: 4,
                    }}>
                      Assigned:
                    </Text>
                    <Text style={{
                      fontSize: Math.min(13, screenWidth * 0.032),
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
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: Math.min(40, screenHeight * 0.05), minHeight: Math.min(120, screenHeight * 0.15) }}>
            <Ionicons name="list-outline" size={Math.min(48, screenWidth * 0.12)} color="#ccc" />
            <Text style={{
              fontSize: Math.min(16, screenWidth * 0.04),
              color: "#666",
              fontWeight: "600",
              marginTop: 12,
              marginBottom: 4,
            }}>
              No tasks found
            </Text>
            <Text style={{
              fontSize: Math.min(14, screenWidth * 0.035),
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
        borderRadius: Math.min(20, screenWidth * 0.05),
        padding: Math.min(20, screenWidth * 0.05),
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="document-text" size={Math.min(24, screenWidth * 0.06)} color="black" />
          <Text style={{
            fontSize: Math.min(20, screenWidth * 0.05),
            fontWeight: "800",
            color: "#1a1a1a",
            marginLeft: Math.min(10, screenWidth * 0.025),
            letterSpacing: 0.5,
          }}>
                            Activity Logs ({logs.length})
          </Text>
        </View>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() =>
                          navigation.navigate("ViewAllLogScreen", { logs: logs })
          }
        >
          <Text style={{
            fontSize: Math.min(14, screenWidth * 0.035),
            fontWeight: "bold",
            color: "black",
            marginRight: 4,
          }}>
            View All
          </Text>
          <Ionicons name="chevron-forward" size={Math.min(16, screenWidth * 0.04)} color="black" />
        </TouchableOpacity>
      </View>

      <View style={{ height: Math.min(200, screenHeight * 0.25) }}>
        {logs.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
              No logs found
            </Text>
          </View>
        ) : (
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
                borderRadius: Math.min(12, screenWidth * 0.03),
                padding: Math.min(12, screenWidth * 0.03),
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "#e9ecef",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text
                  style={{
                    fontSize: Math.min(16, screenWidth * 0.04),
                    fontWeight: "bold",
                    color: "#333",
                    flex: 1,
                    marginRight: 8,
                  }}
                  numberOfLines={1}
                >
                  {log.description && log.description.length > 20
                    ? log.description.substring(0, 20) + "..."
                    : log.description}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{
                    fontSize: Math.min(12, screenWidth * 0.03),
                    color: "#666",
                    fontWeight: "500",
                  }}>
                    {log.date}
                  </Text>
                </View>
              </View>
              {userRole !== "Employee" && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="person" size={Math.min(14, screenWidth * 0.035)} color="#666" />
                  <Text style={{
                    fontSize: Math.min(13, screenWidth * 0.032),
                    color: "#666",
                    fontWeight: "500",
                    marginLeft: 4,
                  }}>
                    Created by:
                  </Text>
                  <Text style={{
                    fontSize: Math.min(13, screenWidth * 0.032),
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
          paddingHorizontal: Math.min(20, screenWidth * 0.05),
          paddingVertical: Math.min(20, screenHeight * 0.025),
          paddingBottom: 100,
          paddingTop: 20,
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
        onAddPress={() => {
          if (userRole === "Employee") {
            // Do nothing - no alert, no action
            return;
          }

          if (tasks.length === 0) {
            // Only navigate to create task screen if no tasks found
            const navigationParams =
              userRole === "Employee"
                ? {}
                : {
                    projectId:
                      userRole === "Manager" ? managerProjectId : projectId,
                  };
            navigation.navigate("CreateTask", navigationParams);
          }
          // If tasks exist, do nothing (don't navigate anywhere)
        }}
      />
    </View>
  );
}

export default WidgetScreen;
