import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Keyboard,
  Alert,
  FlatList,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  Image,
} from "react-native";
import Toast from 'react-native-toast-message'; 76

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import Sidebar from "../components/Sidebar";
import CustomBottomNav from "../components/CustomBottomNav";
import getTodaysTask from "../services/tasks/getTodayTask";
import { getProjectById } from "../services/projects/getProject";
import { getTaskByProjectId } from "../services/tasks/getTaskByProjectId";
import getTasksByloginId from "../services/tasks/getTasksByloginId";
import { getTaskAssignedToManager } from "../services/projects/getTaskAssingedToManager";

import { createLog } from "../services/log/createLog";
import Loader from "../services/utils/loader";
import { getUserRole } from "../services/utils/userRole";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

import { uploadImage } from "../services/images/uploadImage";
import * as ImagePicker from "expo-image-picker";

function CreatLogScreen({ navigation, route }) {
  // Extract Employee projectId and Manager projectId from route params
  const employeeProjectId = route.params?.["Employee projectId"] || null;
  const managerProjectId = route.params?.["Manager projectId"] || route.params?.id || null;
  const regularProjectId = route.params?.projectId || null;

  console.log("=== CreateLogScreen - Parameter Debug ===");
  console.log("🔍 NAVIGATION SOURCE: ViewAllLogScreen or WidgetScreen");
  console.log("CreatLogScreen - All route params:", route.params);
  console.log("CreatLogScreen - route.params type:", typeof route.params);
  console.log("CreatLogScreen - route.params keys:", route.params ? Object.keys(route.params) : 'no params');
  
  // Check if this is coming from an unexpected source
  if (!route.params || Object.keys(route.params || {}).length === 0) {
    console.log("🚨 WARNING: CreatLogScreen received NO PARAMETERS!");
    console.log("🚨 This suggests navigation from a source that doesn't pass project ID");
    console.log("🚨 Check: HomeScreen, direct navigation, or other unexpected sources");
  } else {
    console.log("✅ CreatLogScreen received parameters - checking project ID availability...");
  }
  console.log("CreatLogScreen - route.params?.projectId:", route.params?.projectId);
  console.log("CreatLogScreen - PROJECT ID FOR MANAGER:", route.params?.projectId);
  console.log("CreatLogScreen - Received Employee projectId:", employeeProjectId);
  console.log("CreatLogScreen - Received Manager projectId:", managerProjectId);
  console.log("CreatLogScreen - Received regular projectId:", regularProjectId);
  console.log("CreatLogScreen - route.params?.id:", route.params?.id);
  console.log("🧩 PARAMETER EXTRACTION BREAKDOWN:");
  console.log("- employeeProjectId = route.params?.['Employee projectId']:", route.params?.["Employee projectId"]);
  console.log("- managerProjectId = route.params?.['Manager projectId'] || route.params?.id:", route.params?.["Manager projectId"], "||", route.params?.id);
  console.log("- regularProjectId = route.params?.projectId:", route.params?.projectId);
  console.log("========================================");

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [checkedTasks, setCheckedTasks] = useState(new Set());
  const [createLogModalVisible, setCreateLogModalVisible] = useState(false);
  const [selectedTaskForLog, setSelectedTaskForLog] = useState(null);
  const [logNote, setLogNote] = useState("");
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [serviceError, setServiceError] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      console.log("CreatLogScreen - useFocusEffect triggered");
      loadLogData();
    }, [])
  );

  useEffect(() => {
    if (logs.length > 0) {
      setFilteredLogs(logs);
    }
  }, [logs]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const loadLogData = async () => {
    try {
      setInitialLoading(true);
      setError(null);

      // Re-extract parameters inside the function to ensure we have the latest values
      const currentProjectId = route.params?.projectId || null;
      console.log("CreatLogScreen - loadLogData - Current route params:", route.params);
      console.log("CreatLogScreen - loadLogData - Extracted projectId:", currentProjectId);
      console.log("🎯 MANAGER PROJECT ID IN CREATELOGSCREEN:", currentProjectId);

      // Get user role first
      const role = await getUserRole();
      console.log("CreatLogScreen - User Role:", role);
      setUserRole(role);

      // Get data based on user role
      let response;
      if (role === "Manager") {
        // Console log the project ID from params
        console.log("CreatLogScreen - Manager Role - Project ID from params:", currentProjectId);
        
        // For managers, use getTaskAssignedToManager service with the projectId
        if (currentProjectId) {
          console.log("CreatLogScreen - Calling getTaskAssignedToManager for Manager with projectId:", currentProjectId);
          console.log("🚀 MAKING API CALL: getTaskAssignedToManager(" + currentProjectId + ")");
          response = await getTaskAssignedToManager(currentProjectId);
          console.log("CreatLogScreen - Manager getTaskAssignedToManager response:", response);
          console.log("📊 MANAGER RESPONSE DETAILS:");
          console.log("- Response Type:", typeof response);
          console.log("- Response Keys:", response ? Object.keys(response) : 'No response');
          console.log("- Response JSON:", JSON.stringify(response, null, 2));
          if (response?.tasks) {
            console.log("- Tasks Count:", response.tasks.length);
            console.log("- First Task:", response.tasks[0]);
          }
          console.log("✅ API CALL COMPLETED for projectId:", currentProjectId);
        } else {
          console.log("❌ NO PROJECT ID FOUND - Manager cannot load tasks");
        }
      } else if (role === "Employee") {
        // For employees, use getTaskAssignedToManager with projectId
        console.log("🔍 EMPLOYEE PROJECT ID DEBUG:");
        console.log("- employeeProjectId:", employeeProjectId);
        console.log("- currentProjectId:", currentProjectId);
        console.log("- regularProjectId:", regularProjectId);
        console.log("- route.params?.id:", route.params?.id);
        console.log("- All possible IDs:", {
          employeeProjectId,
          currentProjectId,
          regularProjectId,
          routeParamsId: route.params?.id,
          managerProjectId
        });
        
        const employeeProjectIdToUse = employeeProjectId || currentProjectId || regularProjectId || route.params?.id;
        console.log("- Final employeeProjectIdToUse:", employeeProjectIdToUse);
        
        if (employeeProjectIdToUse) {
          console.log("CreatLogScreen - Calling getTaskAssignedToManager for Employee with projectId:", employeeProjectIdToUse);
          console.log("🚀 MAKING API CALL: getTaskAssignedToManager(" + employeeProjectIdToUse + ") for Employee");
          response = await getTaskAssignedToManager(employeeProjectIdToUse);
          console.log("CreatLogScreen - Employee getTaskAssignedToManager response:", response);
          console.log("📊 EMPLOYEE RESPONSE DETAILS:");
          console.log("- Response Type:", typeof response);
          console.log("- Response Keys:", response ? Object.keys(response) : 'No response');
          console.log("- Response JSON:", JSON.stringify(response, null, 2));
          if (response?.tasks) {
            console.log("- Tasks Count:", response.tasks.length);
            console.log("- First Task:", response.tasks[0]);
          }
          console.log("✅ API CALL COMPLETED for Employee with projectId:", employeeProjectIdToUse);
        } else {
          console.log("❌ NO PROJECT ID FOUND - Employee cannot load tasks");
          console.log("❌ All projectId sources are null/undefined");
        }
      }

      // Convert data to logs format for display
      let logsData = [];

      console.log("🔍 DEBUGGING RESPONSE PROCESSING:");
      console.log("- Response exists:", !!response);
      console.log("- Response type:", typeof response);
      console.log("- Response.tasks exists:", !!response?.tasks);
      console.log("- Response.tasks type:", typeof response?.tasks);
      console.log("- Response.tasks length:", response?.tasks?.length);
      console.log("- Full response structure:", response);

      if (response) {
        // Handle different response structures for Manager role
        let tasksArray = null;
        let projectInfo = null;
        
        if ((role === "Manager" && currentProjectId) || (role === "Employee" && (employeeProjectId || currentProjectId))) {
          // Both Manager and Employee use getTaskAssignedToManager service
          // Check multiple possible response structures
          if (response.tasks && Array.isArray(response.tasks)) {
            tasksArray = response.tasks;
            projectInfo = response.project || response;
            console.log("✅ Found tasks in response.tasks for", role);
          } else if (Array.isArray(response)) {
            tasksArray = response;
            console.log("✅ Response is directly an array of tasks for", role);
          } else {
            console.log("❌ Unexpected response structure for", role);
          }
        }
        
        if (tasksArray && tasksArray.length > 0) {
          console.log("✅ PROCESSING TASKS - Role:", role, "Tasks count:", tasksArray.length);
          console.log("📋 TASKS TO PROCESS:", tasksArray);
          logsData = tasksArray.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            startTime: task.startTime,
            endTime: task.endTime,
            assignedTo: task.assignedTo,
            priority: task.priority,
            status: task.status,
            projectName: projectInfo?.name || "Project Tasks",
            createdBy: task.assignedTo ? `${task.assignedTo.first_name || ""} ${task.assignedTo.last_name || ""}`.trim() : "Unassigned",
            date: task.startTime ? new Date(task.startTime).toLocaleDateString() : "N/A",
            hasLog: task.log !== null,
            logId: task.log?.id || null,
            logNote: task.log?.note || null,
            logCreatedAt: task.log?.createdAt || null
          }));
        } else if (tasksArray && tasksArray.length === 0) {
          console.log("⚠️ TASKS ARRAY IS EMPTY - No tasks found for this project");
        } else {
          console.log("❌ NO TASKS FOUND - Unable to extract tasks from response");
          console.log("- Role:", role);
          console.log("- TasksArray:", tasksArray);
          console.log("- Response structure doesn't match expected format");
        }

        console.log("CreatLogScreen - Processed tasks for", role + ":", logsData.length);
      } else {
        console.log("❌ NO RESPONSE OR NO TASKS FOUND");
        console.log("- Role:", role);
        console.log("- Response exists:", !!response);
        console.log("- Response.tasks exists:", !!response?.tasks);
        console.log("- CurrentProjectId:", currentProjectId);
        console.log("- EmployeeProjectId:", employeeProjectId);
      }

      console.log("🎯 FINAL LOGS DATA:");
      console.log("- LogsData length:", logsData.length);
      console.log("- LogsData content:", logsData);

      setLogs(logsData);
      setFilteredLogs(logsData);
      
      console.log("📊 STATE UPDATED - Logs set to:", logsData.length, "items");
    } catch (err) {
      console.error("CreatLogScreen - Error loading log data:", err);
      console.error("CreatLogScreen - Error response:", err.response);
      console.error("CreatLogScreen - Error response data:", err.response?.data);
      
      if (err.statusCode === 400 || err.response?.status === 400) {
        const errorMessage = err.message || err.response?.data?.message || "You can create one log per project in one day.";
        console.error("CreatLogScreen - Setting 400 error message:", errorMessage);
        setError(errorMessage);
      } else {
        // Use the actual error message from the backend for other errors
        const errorMessage = err.response?.data?.message || err.message || "Failed to load log data";
        console.error("CreatLogScreen - Setting error message:", errorMessage);
        setError(errorMessage);
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCheckboxToggle = (taskId) => {
    const task = logs.find(log => log.id === taskId);
    if (task && task.hasLog) {
      // Display error message using custom toast config when trying to select task with existing log
      Toast.show({
        type: 'error',
        text1: 'Log Already Created',
        text2: 'This task already has a log created. You cannot select it again.',
        visibilityTime: 4000, // 4 seconds for error messages
        autoHide: true,
        topOffset: 80, // Positioning from top
      });
      return;
    }

    setCheckedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const pickImages = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Required',
          text2: 'Please grant camera roll permissions to select images',
          visibilityTime: 4000,
          autoHide: true,
          topOffset: 80,
        });  
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        // Add new images to existing ones
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          id: Date.now() + Math.random(), // Unique ID for each image
          name: asset.fileName || `image_${Date.now()}.jpg`,
        }));
        setSelectedImages(prev => [...prev, ...newImages]);
        
        Toast.show({
          type: 'success',
          text1: 'Images Selected',
          text2: `${newImages.length} image(s) added successfully`,
          visibilityTime: 2000,
          autoHide: true,
          topOffset: 80,
        });
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Toast.show({
        type: 'error',
        text1: 'Image Selection Failed',
        text2: 'Failed to pick images. Please try again.',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  const removeImage = (imageId) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
    
    Toast.show({
      type: 'info',
      text1: 'Image Removed',
      text2: 'Image has been removed from selection',
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 80,
    });
  };

  const handleCreateLog = (task) => {
    setSelectedTaskForLog(task);
    setLogNote("");
    setSelectedImages([]); // Reset images when opening modal
    setServiceError(null); // Clear any previous service errors
    setCreateLogModalVisible(true);
    
    Toast.show({
      type: 'info',
      text1: 'Create Log',
      text2: 'Fill in the details to create your log',
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 80,
    });
  };

  const handleSubmitLog = async () => {

    if (checkedTasks.size === 0) {
      // Display error message when no tasks are selected
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select at least one task to create a log.',
        visibilityTime: 4000, // 4 seconds for error messages
        autoHide: true,
        topOffset: 80, // Positioning from top
      });
      return;
    }

    try {
      setIsSubmittingLog(true);

      // Extract project ID from route params to send to service
      const projectIdForLog = route.params?.projectId || employeeProjectId || managerProjectId || regularProjectId || route.params?.id;
      console.log("🔗 SENDING PROJECT ID TO CREATE LOG SERVICE:", projectIdForLog);
      
      const response = await createLog({
        task_id: Array.from(checkedTasks),
        note: logNote,
        project_id: projectIdForLog,
      });

      if (selectedImages.length > 0 && response?.log?.id) {
        await uploadImages(response.log.id);
      }

      setServiceError(null); // Clear any previous errors
      
      Toast.show({
        type: 'success',
        text1: 'Log Created Successfully!',
        text2: 'Your log has been saved and is now available',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      
      // Set error state to show "Log Creation Limit" message
      setError("You can create one log per project in one day. A log already exists for this project.");
      setLogs([]);
      setFilteredLogs([]);

    } catch (err) {
      console.error("CreatLogScreen - Error creating log:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to create log. Please try again.";
      setServiceError(errorMessage);
    } finally {
      setIsSubmittingLog(false);
      setCreateLogModalVisible(false);
      setSelectedTaskForLog(null);
      setLogNote("");
      setSelectedImages([]);
      setCheckedTasks(new Set());
    }
  };

  const uploadImages = async (logId) => {
    setIsUploadingImages(true);

    try {
      const formData = new FormData();

      // Add all images at once to the 'images' field
      selectedImages.forEach(image => {
        formData.append('images', {
          uri: image.uri,
          type: 'image/jpeg',
          name: image.name,
        });
      });

      formData.append('logId', logId);

      console.log(`CreatLogScreen - Uploading ${selectedImages.length} images at once`);

      const uploadResponse = await uploadImage(formData);

      // Handle response from backend
      if (uploadResponse.images?.length > 0) {
        const successful = uploadResponse.images.filter(img => !img.error);
        const failed = uploadResponse.images.filter(img => img.error);

        console.log(`CreatLogScreen - Upload result: ${successful.length} successful, ${failed.length} failed`);

        if (failed.length > 0) {
          Toast.show({
            type: 'warning',
            text1: 'Partial Upload Success',
            text2: `Uploaded ${successful.length} image(s), ${failed.length} failed.`,
            visibilityTime: 4000,
            autoHide: true,
            topOffset: 80,
          });
        }
      }

    } catch (error) {
      console.error("CreatLogScreen - Image upload error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Log created but image upload failed.";
      setServiceError(errorMessage);
      
      Toast.show({
        type: 'error',
        text1: 'Image Upload Failed',
        text2: 'Log created but images could not be uploaded',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

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

  const handleUpdate = (log) => {
    // Only allow updating logs if user is not an Employee
    if (userRole === "Employee") {
      Toast.show({
        type: 'error',
        text1: 'Access Denied',
        text2: 'Employees cannot update logs',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    // TODO: Implement log update functionality
    Toast.show({
      type: 'info',
      text1: 'Coming Soon',
      text2: 'Log update functionality will be implemented soon',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 80,
    });
  };

  const handleDelete = (log) => {
    // Only allow deleting logs if user is not an Employee
    if (userRole === "Employee") {
      Toast.show({
        type: 'error',
        text1: 'Access Denied',
        text2: 'Employees cannot delete logs',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    const logId = log?.id;
    const logTitle = log?.title;

    if (!logId) {
      return;
    }

    Alert.alert(
      "Delete Log",
      `Are you sure you want to delete "${logTitle}" permanently? This action is not reversible.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // TODO: Implement log deletion API call
              // await deleteLogById(logId);

              const updatedLogs = logs.filter((log) => log.id !== logId);
              const updatedFilteredLogs = filteredLogs.filter(
                (log) => log.id !== logId
              );

              setLogs(updatedLogs);
              setFilteredLogs(updatedFilteredLogs);

              Toast.show({
                type: 'success',
                text1: 'Log Deleted Successfully!',
                text2: 'The log has been permanently removed',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 80,
              });
            } catch (error) {
              let errorMessage = "Failed to delete log. Please try again.";
              if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = error.message;
              }

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

  const renderLogCard = React.useCallback((log, index) => {
    const isChecked = checkedTasks.has(log.id);
    const hasLog = log.hasLog;

    return (
      <View>
        {/* Task Card */}
        <View
          className="rounded-[8px] border shadow-sm"
          style={{
            backgroundColor: hasLog ? '#e5e7eb' : (isChecked ? '#e5e7eb' : '#f8f9fa'),
            borderColor: '#e9ecef',
            borderWidth: 1,
            padding: 16,
            borderRadius: 8,
            opacity: hasLog ? 0.6 : 1,
          }}
        >
          <View>
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center flex-1">
                <View className="flex-row items-center mr-2" style={{ minWidth: 70 }}>
                  <View style={{
                    backgroundColor: '#000000',
                    borderRadius: 16,
                    width: 20,
                    height: 20,
                    marginRight: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: "white",
                      fontWeight: "700",
                    }}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 15,
                    color: "black",
                    fontWeight: "600",
                    letterSpacing: 0.3,
                  }}>
                    Title:
                  </Text>
                </View>
                <Text style={{
                  flex: 1,
                  fontSize: 15,
                  color: "#333",
                  lineHeight: 24,
                }}>
                  {log.title}
                </Text>
              </View>

              {/* Checkbox or Log Status at the end */}
              {hasLog ? (
                <Text
                  className="ml-3 text-center"
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    fontWeight: '500',
                    minWidth: 60,
                  }}
                >
                  Log Created
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={() => handleCheckboxToggle(log.id)}
                  className="ml-3 border-2 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: isChecked ? '#000000' : 'white',
                    borderColor: isChecked ? '#000000' : '#6B7280',
                    borderWidth: 2,
                    minWidth: 20,
                    minHeight: 20,
                    width: 20,
                    height: 20,
                  }}
                >
                  {isChecked && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color="white"
                      style={{ fontWeight: 'bold' }}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }, [checkedTasks]);

  const renderItem = React.useCallback(({ item, index }) => (
    <View style={{ 
      marginBottom: 16,
    }}>
      {renderLogCard(item, index)}
    </View>
  ), [renderLogCard]);

  const keyExtractor = React.useCallback((item) => String(item.id), []);

  const renderContent = () => {
    console.log("🖥️ RENDERING CONTENT:");
    console.log("- filteredLogs length:", filteredLogs.length);
    console.log("- logs length:", logs.length);
    console.log("- filteredLogs data:", filteredLogs);
    
    return (
            <View style={{ flex: 1 }}>

        {filteredLogs.length > 0 ? (
          <>
            <FlatList
              data={filteredLogs}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={{ 
                paddingHorizontal: 20, 
                paddingBottom: 140 
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={true}
              bounces={true}
              scrollEventThrottle={16}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
              windowSize={10}
              getItemLayout={(data, index) => ({
                length: 100, // Approximate height of each item
                offset: 100 * index,
                index,
              })}
              ListHeaderComponent={() => (
                /* --- Select Tasks Header --- */
                <View style={{
                  marginBottom: 24,
                  paddingBottom: 16,
                  paddingTop: 20,
                }}>
                  <Text style={{
                    fontSize: 24,
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: 8,
                    textAlign: 'center',
                  }}>
                    Select Tasks ({filteredLogs.length})
                  </Text>
                </View>
              )}
              ListFooterComponent={() => (
                /* --- Create Log Button Section --- */
                <View style={{
                  paddingVertical: 16,
                  marginTop: 16,
                  marginBottom: 20,
                }}>
                  <TouchableOpacity
                    style={{
                      minWidth: 200,
                      backgroundColor: checkedTasks.size > 0 ? 'black' : '#E5E7EB',
                      borderRadius: 12,
                      paddingVertical: 16,
                      paddingHorizontal: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      alignSelf: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: checkedTasks.size > 0 ? 0.1 : 0.05,
                      shadowRadius: 4,
                      elevation: checkedTasks.size > 0 ? 3 : 1,
                    }}
                    onPress={() => {
                      if (checkedTasks.size > 0) {
                        const selectedTaskId = Array.from(checkedTasks)[0];
                        const selectedTask = logs.find(log => log.id === selectedTaskId);
                        if (selectedTask) {
                          handleCreateLog(selectedTask);
                        }
                      }
                    }}
                    disabled={checkedTasks.size === 0}
                    activeOpacity={checkedTasks.size > 0 ? 0.8 : 1}
                  >
                    <Text style={{
                      color: checkedTasks.size > 0 ? 'white' : '#9CA3AF',
                      fontSize: 16,
                      fontWeight: '600',
                    }}>
                      Create Log {checkedTasks.size > 1 ? `(${checkedTasks.size} selected)` : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </>
        ) : (
          /* --- Empty State Section - Show when task length is 0 --- */
          <View style={{
            flex: 1,
            justifyContent: "flex-start",
            alignItems: "center",
            padding: Math.min(20, screenWidth * 0.05),
            paddingTop: Math.min(200, screenHeight * 0.26),
          }}>
            <Ionicons
              name="document-text-outline"
              size={Math.min(64, screenWidth * 0.16)}
              color="#ccc"
              style={{ marginBottom: Math.min(16, screenHeight * 0.02) }}
            />
            <Text style={{
              fontSize: Math.min(18, screenWidth * 0.045),
              color: "#666",
              textAlign: "center",
              fontWeight: "600",
              marginBottom: Math.min(8, screenHeight * 0.01),
            }}>
              {error ? "Log Creation Limit" : "No tasks for today"}
            </Text>
            <Text style={{
              fontSize: Math.min(14, screenWidth * 0.035),
              color: "#999",
              textAlign: "center",
              fontWeight: "400",
            }}>
              {error || "Tasks will appear here once assigned"}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

      {/* Content */}
      {initialLoading ? (
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: Math.min(20, screenWidth * 0.05),
          minHeight: Math.min(300, screenHeight * 0.375),
        }}>
          <Loader size="large" color="#000000" text="Loading tasks..." />
        </View>
      ) : (
        <View className="flex-1 bg-white" style={{ position: "relative" }}>
          {renderContent()}
        </View>
      )}

      <CustomBottomNav />

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={() => setSidebarVisible(false)}
      />

      {/* Create Log Modal */}
      <Modal
        visible={createLogModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateLogModalVisible(false)}
      >
        <View className="flex-1 bg-white">
          {/* Black Navbar/Header */}
          <View className="bg-black px-4 py-3 flex-row items-center justify-between">
            <Text className="text-black text-[18px] font-semibold">Create Log</Text>
            <TouchableOpacity
              onPress={() => {
                setCreateLogModalVisible(false);
                setServiceError(null); // Clear service errors when closing modal
              }}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View className="p-6">
            <View className="mb-6">
              <Text className="text-[16px] font-semibold text-[#333] mb-2">Note</Text>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                placeholder="Enter note "
                value={logNote}
                onChangeText={setLogNote}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            <View className="mb-6">
              <Text className="text-[16px] font-semibold text-[#333] mb-2">Images</Text>

              {/* Image Picker Button */}
              <TouchableOpacity
                className="border-2 border-dashed border-[#e1e8ed] rounded-lg p-4 items-center justify-center mb-3"
                onPress={pickImages}
                style={{ backgroundColor: '#f8f9fa' }}
              >
                <Ionicons name="camera-outline" size={24} color="#666" style={{ marginBottom: 8 }} />
                <Text className="text-[14px] text-[#666] text-center">
                  {selectedImages.length > 0
                    ? `Add More Images (${selectedImages.length} selected)`
                    : 'Select Images'
                  }
                </Text>
              </TouchableOpacity>

              {/* Selected Images Preview */}
              {selectedImages.length > 0 && (
                <View className="mb-3 mt-6">
                  <Text className="text-[14px] text-[#666] mb-2">Selected Images:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row"
                    scrollEventThrottle={16}
                    bounces={false}
                    decelerationRate="fast"
                  >
                    {selectedImages.map((image, index) => (
                      <View key={image.id} className="mr-3 relative">
                        <View className="w-20 h-20 rounded-lg bg-gray-200 items-center justify-center overflow-hidden">
                          <Image
                            source={{ uri: image.uri }}
                            className="w-full h-full"
                            style={{ resizeMode: 'cover' }}
                            onError={() => console.log(`Failed to load image: ${image.name}`)}
                          />
                          {/* Individual Cross Button */}
                          <TouchableOpacity
                            onPress={() => removeImage(image.id)}
                            className="absolute top-1 right-1 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                            style={{
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.25,
                              shadowRadius: 3.84,
                              elevation: 5,
                            }}
                          >
                            <Ionicons name="close" size={12} color="white" />
                          </TouchableOpacity>
                        </View>
                        <Text className="text-[10px] text-[#666] text-center mt-1">
                          Image {index + 1}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {serviceError && (
              <View className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <View className="flex-row items-center">
                  <Ionicons name="alert-circle" size={20} color="#dc2626" style={{ marginRight: 8 }} />
                  <Text className="text-red-700 text-[14px] font-medium flex-1">
                    {serviceError}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setServiceError(null)}
                  className="mt-2 self-end"
                >
                  <Text className="text-red-600 text-[12px] font-medium">Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>

          {/* Fixed Action Button - Always positioned at bottom */}
          <View className="absolute bottom-0 left-0 right-0 px-6 pt-5 pb-5 bg-white items-center">
            <TouchableOpacity
              className="w-[280px] rounded-xl py-4 items-center justify-center"
              onPress={handleSubmitLog}
              disabled={isSubmittingLog || isUploadingImages || (!logNote.trim() && selectedImages.length === 0)}
              style={{ 
                backgroundColor: (isSubmittingLog || isUploadingImages || (!logNote.trim() && selectedImages.length === 0)) ? '#D1D5DB' : '#000000',
                opacity: (isSubmittingLog || isUploadingImages || (!logNote.trim() && selectedImages.length === 0)) ? 0.6 : 1 
              }}
            >
              {(isSubmittingLog || isUploadingImages) ? (
                <Text className="text-white text-[16px] font-semibold">Saving</Text>
              ) : (
                <Text className="text-white text-[16px] font-semibold">Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default CreatLogScreen;

