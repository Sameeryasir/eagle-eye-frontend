import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import { getTaskByProjectId } from "../services/tasks/getTaskByProjectId";

function AdminDetailScreen({ navigation, route }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { projectId } = route.params || {};

  // Mock tasks data for testing
  const mockTasks = [
    {
      id: 1,
      title: "Review Project Documentation",
      description: "Review and update project documentation for the new features",
      assignedTo: { first_name: "John", last_name: "Doe", email: "john@example.com" },
      startTime: "2024-01-15",
      endTime: "2024-01-20",
    },
    {
      id: 2,
      title: "Update User Interface",
      description: "Implement new UI components and improve user experience",
      assignedTo: { first_name: "Jane", last_name: "Smith", email: "jane@example.com" },
      startTime: "2024-01-10",
      endTime: "2024-01-25",
    },
    {
      id: 3,
      title: "Bug Fix in Login Module",
      description: "Fix authentication issues in the login system",
      assignedTo: { first_name: "Mike", last_name: "Johnson", email: "mike@example.com" },
      startTime: "2024-01-20",
      endTime: "2024-01-30",
    },
  ];

  // Mock logs data
  const mockLogs = [
    {
      id: 1,
      action: "User Login",
      user: "admin@example.com",
      timestamp: "2024-01-12T10:30:00Z",
      details: "Successful login from IP 192.168.1.100",
    },
    {
      id: 2,
      action: "Project Created",
      user: "john.doe@example.com",
      timestamp: "2024-01-12T09:15:00Z",
      details: "New project 'Eagle Eye Dashboard' created",
    },
    {
      id: 3,
      action: "Task Updated",
      user: "mike.johnson@example.com",
      timestamp: "2024-01-12T08:15:00Z",
      details: "Updated task 'Bug Fix in Login Module' status to In Progress",
    },
  ];

  useFocusEffect(
    React.useCallback(() => {
      if (projectId) {
        loadData();
      }
    }, [projectId])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading data for projectId:', projectId);
      const response = await getTaskByProjectId(projectId);
      console.log('API Response:', response);
      
      // Handle different response structures
      if (response && response.project) {
        console.log('Setting project from response.project');
        setProject(response.project);
        setTasks(response.tasks || []);
        console.log('Tasks set:', response.tasks || []);
      } else if (response && response.tasks) {
        console.log('Setting project and tasks from response directly');
        setProject(response);
        setTasks(response.tasks || []);
        console.log('Tasks set:', response.tasks || []);
      } else if (response && Array.isArray(response)) {
        console.log('Setting tasks from response array');
        setProject({ name: 'Project' }); // Fallback project name
        setTasks(response);
        console.log('Tasks set from array:', response);
      } else if (response) {
        console.log('Setting project from response directly');
        setProject(response);
        setTasks([]);
      } else {
        console.log('No response, using mock data');
        setProject({ name: 'Project' });
        setTasks(mockTasks);
      }
    } catch (err) {
      console.error('Error loading project data:', err);
      setError('Failed to load project data');
      Alert.alert('Error', 'Failed to load project data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const TaskWidget = () => {
    console.log('TaskWidget render - tasks:', tasks);
    console.log('Tasks length:', tasks.length);
    
    return (
      <View style={styles.taskWidgetContainer}>
        <View style={styles.widgetHeader}>
          <View style={styles.widgetTitleContainer}>
            <Ionicons name="list" size={24} color="black" />
            <Text style={styles.widgetTitle}>Tasks ({tasks.length})</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => {
              console.log('Navigating to ViewAllTasksScreen with projectId:', projectId);
              navigation.navigate('ViewAllTasksScreen', { projectId });
            }}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="black" />
          </TouchableOpacity>
        </View>

                 <View style={styles.taskWidgetContent}>
           {tasks && tasks.length > 0 ? (
             <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
               {tasks.slice(0, 4).map((task) => (
                 <View key={task.id} style={styles.taskItem}>
                   <View style={styles.taskHeader}>
                     <Text style={styles.taskTitle} numberOfLines={1}>
                       {task.title}
                     </Text>
                     <Text style={styles.taskEndDate}>
                       {formatDate(task.endTime)}
                     </Text>
                   </View>
                   <View style={styles.taskAssignedRow}>
                     <Ionicons name="person" size={14} color="#666" />
                     <Text style={styles.assignedLabel}>Assigned:</Text>
                     <Text style={styles.taskAssignedText}>
                       {getAssignedToName(task.assignedTo)}
                     </Text>
                   </View>
                 </View>
               ))}
             </ScrollView>
           ) : (
             <View style={styles.noTasksContainer}>
               <Ionicons name="list-outline" size={48} color="#ccc" />
               <Text style={styles.noTasksText}>No tasks found</Text>
               <Text style={styles.noTasksSubtext}>Tasks will appear here once created</Text>
             </View>
           )}
         </View>
      </View>
    );
  };

  const LogsWidget = () => (
    <View style={styles.logsWidgetContainer}>
      <View style={styles.widgetHeader}>
        <View style={styles.widgetTitleContainer}>
          <Ionicons name="document-text" size={24} color="black" />
          <Text style={styles.widgetTitle}>Activity Logs ({mockLogs.length})</Text>
        </View>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.logsWidgetContent}>
        <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
          {mockLogs.slice(0, 4).map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={styles.logAction}>{log.action}</Text>
                <Text style={styles.logTimestamp}>
                  {formatDateTime(log.timestamp)}
                </Text>
              </View>

              <View style={styles.logDetails}>
                <View style={styles.logDetailRow}>
                  <Text style={styles.logLabel}>User:</Text>
                  <Text style={styles.logValue}>{log.user}</Text>
                </View>
                <View style={styles.logDetailRow}>
                  <Text style={styles.logLabel}>Details:</Text>
                  <Text style={styles.logValue}>{log.details}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={[styles.centerContainer, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.loadingText}>Loading tasks and logs...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.centerContainer, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (project) {
      return (
        <>
          <TaskWidget />
          <LogsWidget />
        </>
      );
    }

    return (
      <View style={[styles.centerContainer, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
            <Ionicons name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {project ? project.name : 'Project Details'}
          </Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
        >
          {renderContent()}
        </ScrollView>
      </SafeAreaView>

      {/* Sidebar */}
      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={() => setSidebarVisible(false)}
      />

      {/* Bottom Navigation */}
      <CustomBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.5,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  // General widget styles
  widgetContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  // Separate styles for task widget
  taskWidgetContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  taskWidgetContent: {
    height: 160,
  },
  // Separate styles for logs widget
  logsWidgetContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  logsWidgetContent: {
    height: 200,
  },
  widgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  widgetTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  widgetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: "black",
    marginRight: 4,
  },
  widgetContent: {
    height: 240,
  },
  taskItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  taskEndDate: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  taskAssignedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskAssignedText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  assignedLabel: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  taskInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  taskInfoItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minWidth: 100,
  },
  taskInfoLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 3,
    textAlign: "center",
  },
  taskInfoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    lineHeight: 18,
    flexWrap: "nowrap",
    numberOfLines: 1,
  },
  logItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logAction: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  logTimestamp: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  logDetails: {
    gap: 8,
  },
  logDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    minWidth: 60,
  },
  logValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 400,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  noTasksContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    minHeight: 120,
  },
  noTasksText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  noTasksSubtext: {
    fontSize: 14,
    color: "#999",
    fontWeight: "400",
    textAlign: "center",
  },
  projectCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginLeft: 8,
  },
  projectDetails: {
    gap: 12,
  },
  projectDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  projectLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    minWidth: 80,
  },
  projectValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
});

export default AdminDetailScreen;
