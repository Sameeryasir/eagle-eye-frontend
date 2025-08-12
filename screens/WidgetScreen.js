import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import { getTaskByProjectId } from "../services/tasks/getTaskByProjectId";
import { getTaskAssignedToEmployee } from "../services/tasks/getTaskAssignedToEmployee";
import Loader from "../services/utils/loader";
import { getUserRole } from "../services/utils/userRole";

function WidgetScreen({ navigation, route }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const { projectId } = route.params || {};



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
      loadData();
    }, [projectId])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const role = await getUserRole();
      setUserRole(role);
      
      let response;
      
      if (role === 'Employee') {
        response = await getTaskAssignedToEmployee();
        setProject({ name: 'My Tasks' });
        setTasks(response || []);
      } else {
        response = await getTaskByProjectId(projectId);
        
        if (response && response.project) {
          setProject(response.project);
          setTasks(response.tasks || []);
        } else if (response && response.tasks) {
          setProject(response);
          setTasks(response.tasks || []);
        } else if (response && Array.isArray(response)) {
          setProject({ name: 'Project' });
          setTasks(response);
        } else if (response) {
          setProject(response);
          setTasks([]);
        } else {
          setProject({ name: 'Project' });
          setTasks([]);
        }
      }
      
    } catch (err) {
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

  const TaskWidget = () => (
    <View
      className="bg-white rounded-[20px] p-[25px] mb-4 mt-4"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <Ionicons name="list" size={24} color="black" />
          <Text className="text-[20px] font-extrabold text-[#1a1a1a] ml-2.5 tracking-[0.5px]">
            Tasks ({tasks.length})
          </Text>
        </View>
        <TouchableOpacity
          className={`flex-row items-center ${tasks.length === 0 ? 'opacity-70' : ''}`}
          onPress={() => {
            const navigationParams = userRole === 'Employee' ? {} : { projectId };
            navigation.navigate('ViewAllTasksScreen', navigationParams);
          }}
          disabled={tasks.length === 0}
        >
          <Text className={`text-[14px] font-bold mr-1 ${tasks.length === 0 ? 'text-[#ccc]' : 'text-black'}`}>
            View All
          </Text>
          <Ionicons name="chevron-forward" size={16} color={tasks.length === 0 ? '#ccc' : 'black'} />
        </TouchableOpacity>
      </View>

      <View className="h-[160px]">
        {tasks && tasks.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
            {tasks.slice(0, 4).map((task) => (
              <View
                key={task.id}
                className="bg-[#f8f9fa] rounded-[12px] p-3 mb-2 border border-[#e9ecef]"
              >
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-[16px] font-bold text-[#333] flex-1 mr-2" numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text className="text-[12px] text-[#666] font-medium">
                    {formatDate(task.endTime)}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="person" size={14} color="#666" />
                  <Text className="text-[13px] text-[#666] font-medium ml-1">Assigned:</Text>
                  <Text className="text-[13px] text-[#666] font-medium ml-1">
                    {getAssignedToName(task.assignedTo)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className="flex-1 justify-center items-center py-10 min-h-[120px]">
            <Ionicons name="list-outline" size={48} color="#ccc" />
            <Text className="text-[16px] text-[#666] font-semibold mt-3 mb-1">No tasks found</Text>
            <Text className="text-[14px] text-[#999] font-normal text-center">Tasks will appear here once created</Text>
          </View>
        )}
      </View>
    </View>
  );

  const LogsWidget = () => (
    <View
      className="bg-white rounded-[20px] p-5 mb-4"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <Ionicons name="document-text" size={24} color="black" />
          <Text className="text-[20px] font-extrabold text-[#1a1a1a] ml-2.5 tracking-[0.5px]">
            Activity Logs ({mockLogs.length})
          </Text>
        </View>
        <TouchableOpacity className="flex-row items-center">
          <Text className="text-[14px] font-bold text-black mr-1">View All</Text>
          <Ionicons name="chevron-forward" size={16} color="black" />
        </TouchableOpacity>
      </View>

      <View className="h-[200px]">
        <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
          {mockLogs.slice(0, 4).map((log) => (
            <View key={log.id} className="bg-[#f8f9fa] rounded-2xl p-4 mb-3 border border-[#e9ecef]">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-[16px] font-semibold text-[#333]">{log.action}</Text>
                <Text className="text-[12px] text-[#666] font-medium">{formatDateTime(log.timestamp)}</Text>
              </View>

              <View className="gap-2">
                <View className="flex-row justify-between items-start">
                  <Text className="text-[14px] text-[#666] font-medium min-w-[60px]">User:</Text>
                  <Text className="text-[14px] font-semibold text-[#333] flex-1 text-right">{log.user}</Text>
                </View>
                <View className="flex-row justify-between items-start">
                  <Text className="text-[14px] text-[#666] font-medium min-w-[60px]">Details:</Text>
                  <Text className="text-[14px] font-semibold text-[#333] flex-1 text-right">{log.details}</Text>
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
        <View className="flex-1 justify-center items-center p-5 min-h-[400px]">
          <Loader size="large" color="#000000" text="Loading tasks and logs..." />
        </View>
      );
    }

    if (error) {
      return (
        <View className="flex-1 justify-center items-center p-5 min-h-[400px]">
          <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-medium">{error}</Text>
          <TouchableOpacity className="bg-[#007AFF] py-3 px-6 rounded-lg" onPress={loadData}>
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
        <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-medium">Project not found</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-5 py-5 pt-2.5 bg-white border-b border-[#f0f0f0]">
          <TouchableOpacity className="p-2 rounded-lg bg-[#f8f9fa]" onPress={() => setSidebarVisible(true)}>
            <Ionicons name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-[#333] tracking-[0.5px]">
            {project ? project.name : ''}
          </Text>
          <TouchableOpacity className="p-2 rounded-lg bg-[#f8f9fa]">
            <Ionicons name="notifications" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 py-5 pb-[100px]">
          {renderContent()}
        </ScrollView>
      </SafeAreaView>

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={() => setSidebarVisible(false)}
      />

      <CustomBottomNav task={tasks.length === 0} />
    </View>
  );
}




export default WidgetScreen;
