// @ts-nocheck
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
  Modal,
  StyleSheet,
} from "react-native";
import Toast from 'react-native-toast-message';
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import {
  useProjectTasks,
  useProjectLogs,
  useMyTasks,
  useDeleteTaskMutation,
} from '../hooks/queries';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const isVerySmallScreen = screenWidth < 380 || screenHeight < 650;
const isSmallScreen = screenWidth < 400 || screenHeight < 700;
const isMediumScreen = screenWidth < 450;
const isLargeScreen = screenWidth >= 450;

import Sidebar from "../components/Sidebar";
import CreateTask from "../components/CreateTask";
import { Brand } from "../constants/brandColors";
import { getUserRole } from "../services/utils/userRole";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckSquare } from "lucide-react-native";

function WidgetScreen({ navigation, route }) {
  const { projectId, projectName } = route.params || {};
  const isProjectIdMissing = !projectId;

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [project, setProject] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [managerProjectId, setManagerProjectId] = useState(null);
  const [createTaskVisible, setCreateTaskVisible] = useState(false);
  const isFirstMount = useRef(true);

  const {
    data: projectTasksData,
    isLoading: projectTasksLoading,
    isRefetching: projectTasksRefetching,
    error: projectTasksError,
    refetch: refetchProjectTasks,
  } = useProjectTasks(projectId);

  const {
    data: myTasksData,
    isLoading: myTasksLoading,
    isRefetching: myTasksRefetching,
    error: myTasksError,
    refetch: refetchMyTasks,
  } = useMyTasks(isProjectIdMissing && userRole === "Employee");

  const {
    data: logsData,
    isLoading: logsLoading,
    isRefetching: logsRefetching,
    error: logsQueryError,
    refetch: refetchLogs,
  } = useProjectLogs(projectId);

  const deleteMutation = useDeleteTaskMutation();
  const deleting = deleteMutation.isPending;
  const deleteError = deleteMutation.error
    ? (deleteMutation.error?.response?.data?.message || deleteMutation.error?.message || null)
    : null;

  const tasks = Array.isArray(projectId ? projectTasksData : myTasksData)
    ? (projectId ? projectTasksData : myTasksData)
    : [];
  const logs = Array.isArray(logsData) ? logsData : [];
  const loading = projectId ? projectTasksLoading : myTasksLoading;
  const error = projectId
    ? (projectTasksError?.response?.data?.message || projectTasksError?.message || null)
    : (myTasksError?.response?.data?.message || myTasksError?.message || null);
  const logsError = logsQueryError
    ? (logsQueryError?.response?.data?.message || logsQueryError?.message || null)
    : null;
  const isInitialLoad = (loading || logsLoading) && tasks.length === 0 && logs.length === 0;

  useEffect(() => {
    const loadRole = async () => {
      try {
        const role = await getUserRole();
        setUserRole(role);
      } catch {
        setUserRole(null);
      }
    };
    loadRole();
  }, []);

  useEffect(() => {
    if (projectId) {
      if (userRole === "Manager") setManagerProjectId(projectId);
      setProject({
        id: projectId,
        name: projectName || "Project",
      });
    } else if (userRole === "Employee") {
      setProject({ name: "My Tasks" });
    } else if (userRole === "Manager") {
      setProject({ name: "No Projects" });
    } else {
      setProject({ name: "Project" });
    }
  }, [projectId, projectName, userRole]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const jobs = [];
      if (projectId) {
        jobs.push(refetchProjectTasks());
        jobs.push(refetchLogs());
      } else if (userRole === "Employee") {
        jobs.push(refetchMyTasks());
      }
      await Promise.all(jobs);
    } finally {
      setRefreshing(false);
    }
  }, [projectId, userRole, refetchProjectTasks, refetchLogs, refetchMyTasks]);

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
    if (userRole === "Employee") {
      Alert.alert("Access Denied", "Employees cannot update tasks.");
      return;
    }

    navigation.navigate("TaskDetails", { task });
  };

  const handleDelete = (task) => {
    if (userRole === "Employee") {
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
              await deleteMutation.mutateAsync(taskId);
              Toast.show({
                type: 'success',
                text1: 'Task Deleted Successfully!',
                text2: `"${taskTitle}" has been permanently deleted`,
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 80,
              });
            } catch (error) {
              console.error("WidgetScreen - Error deleting task:", error);
              const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                "An unexpected error occurred";
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: Array.isArray(errorMessage) ? errorMessage.join(', ') : String(errorMessage),
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
              projectName: projectName || project?.name || 'Unknown Project',
              showUpcomingTasks: true,
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
              
              const navigationParams = { 
                logs: logs,
                managerProjectId: userRole === "Manager" ? (managerProjectId || projectId) : null,
                projectId: projectId,
                projectName: projectName || project?.name || 'Unknown Project',
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
      
      
      {(() => {
        const shouldShowLoader = loading || logsLoading || isInitialLoad;
        return shouldShowLoader;
      })() ? (
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

      <Modal
        visible={createTaskVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setCreateTaskVisible(false)}
      >
        {createTaskVisible ? (
          <View style={{ flex: 1, backgroundColor: Brand.paper }}>
            <SafeAreaView
              style={{ backgroundColor: Brand.paper }}
              edges={["top"]}
            >
              <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
              <View style={styles.createTaskHeader}>
                <CheckSquare size={20} color={Brand.ink} strokeWidth={2} />
                <Text style={styles.createTaskHeaderTitle}>Create Task</Text>
              </View>
            </SafeAreaView>
            <CreateTask
              hideHeader
              projectId={projectId}
              projectName={projectName || project?.name}
              navigation={{
                goBack: () => setCreateTaskVisible(false),
              }}
              onCancel={() => setCreateTaskVisible(false)}
              onSuccess={() => {
                setCreateTaskVisible(false);
              }}
            />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  createTaskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
    backgroundColor: Brand.paper,
  },
  createTaskHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Brand.ink,
    letterSpacing: -0.2,
  },
});

export default WidgetScreen;
