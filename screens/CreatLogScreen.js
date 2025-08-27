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
} from "react-native";76


const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import { getTasksAssignedToEmployees } from "../services/tasks/getTasksAssignedToEmployees";
import { getMyProjects } from "../services/projects/getProjectsByLoginUserId";
import { getTaskByProjectId } from "../services/tasks/getTaskByProjectId";
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
  // --- Image Upload State ---
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);


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

      // Get user role first
      const role = await getUserRole();
      console.log("CreatLogScreen - User Role:", role);
      setUserRole(role);

      // Get data based on user role
      let response;
      if (role === "Manager") {
        // First get projects to get projectId (same logic as WidgetScreen)
        console.log("CreatLogScreen - Calling getMyProjects for Manager");
        const projectsResponse = await getMyProjects();
        console.log("CreatLogScreen - Manager projects response:", projectsResponse);
        
        // Get the first project's ID (same as WidgetScreen logic)
        const managerProjectId = projectsResponse && projectsResponse.length > 0 ? projectsResponse[0].id : null;
        console.log("CreatLogScreen - Manager project ID:", managerProjectId);
        
        if (managerProjectId) {
          // Now call getTaskByProjectId with the project ID
          console.log("CreatLogScreen - Calling getTaskByProjectId with projectId:", managerProjectId);
          response = await getTaskByProjectId(managerProjectId);
          console.log("CreatLogScreen - Manager project tasks response:", response);
        } else {
          console.log("CreatLogScreen - No project ID found, using empty response");
          response = null;
        }
      } else {
        // For employees, get tasks assigned to them (using the same API as ViewAllTasksScreen)
        console.log("CreatLogScreen - Calling getTasksAssignedToEmployees for Employee");
        response = await getTasksAssignedToEmployees();
        console.log("CreatLogScreen - Employee tasks response:", response);
      }
      
      // Convert data to logs format for display
      let logsData = [];
      
      if (response) {
        if (role === "Manager") {
          // Handle getTaskByProjectId response structure
          console.log("CreatLogScreen - Processing Manager project tasks response");
          console.log("CreatLogScreen - Response structure:", response);
          
          let tasks = [];
          if (response && response.tasks) {
            tasks = response.tasks;
            console.log("CreatLogScreen - Found tasks in response.tasks:", tasks.length);
          } else if (response && Array.isArray(response)) {
            tasks = response;
            console.log("CreatLogScreen - Found tasks in response array:", tasks.length);
          } else {
            console.log("CreatLogScreen - No tasks found in response");
            tasks = [];
          }
          
          logsData = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            startTime: task.startTime,
            endTime: task.endTime,
            assignedTo: task.assignedTo,
            priority: task.priority,
            status: task.status,
            projectName: response.project?.name || "Project Tasks",
            createdBy: task.assignedTo ? `${task.assignedTo.first_name || ""} ${task.assignedTo.last_name || ""}`.trim() : "Unassigned",
            date: task.startTime ? new Date(task.startTime).toLocaleDateString() : "N/A"
          }));
          
          console.log("CreatLogScreen - Processed logsData for Manager:", logsData.length);
        } else {
          // Handle getTasksAssignedToEmployees response structure (direct tasks array)
          console.log("CreatLogScreen - Processing Employee tasks response");
          logsData = response.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            startTime: task.startTime,
            endTime: task.endTime,
            assignedTo: task.assignedTo,
            priority: task.priority,
            status: task.status,
            projectName: task.project?.name || "My Tasks",
            createdBy: task.assignedTo ? `${task.assignedTo.first_name || ""} ${task.assignedTo.last_name || ""}`.trim() : "Unassigned",
            date: task.startTime ? new Date(task.startTime).toLocaleDateString() : "N/A"
          }));
        }
      }

      setLogs(logsData);
      setFilteredLogs(logsData);
    } catch (err) {
      console.error("CreatLogScreen - Error loading log data:", err);
      setError("Failed to load log data");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCheckboxToggle = (taskId) => {
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

  // --- Image Picker Function ---
  const pickImages = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to select images.');
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
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  // --- Remove Image Function ---
  const removeImage = (imageId) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleCreateLog = (task) => {
    setSelectedTaskForLog(task);
    setLogNote("");
    setSelectedImages([]); // Reset images when opening modal
    setCreateLogModalVisible(true);
  };





    const handleSubmitLog = async () => {
    // --- Validation ---
    if (!logNote.trim()) {
      Alert.alert("Error", "Please enter a note for the log");
      return;
    }
    
    if (checkedTasks.size === 0) {
      Alert.alert("Error", "Please select at least one task to create a log.");
      return;
    }

    try {
      setIsSubmittingLog(true);
      
      // --- Step 1: Create Log ---
      const response = await createLog({
        task_id: Array.from(checkedTasks),
        note: logNote,
      });
      
      // --- Step 2: Upload Images (if any) ---
      if (selectedImages.length > 0 && response?.log?.id) {
        await uploadImages(response.log.id);
      }
      
      Alert.alert('Success', 'Log created successfully!');
      loadLogData();

    } catch (err) {
      console.error("CreatLogScreen - Error creating log:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to create log. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmittingLog(false);
      setCreateLogModalVisible(false);
      setSelectedTaskForLog(null);
      setLogNote("");
      setSelectedImages([]);
      setCheckedTasks(new Set());
    }
  };

  // --- Helper Function for Image Upload ---
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
          Alert.alert("Partial Success", `Uploaded ${successful.length} image(s), ${failed.length} failed.`);
        }
      }
      
    } catch (error) {
      console.error("CreatLogScreen - Image upload error:", error);
      Alert.alert("Warning", "Log created but image upload failed.");
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
      Alert.alert("Access Denied", "Employees cannot update logs.");
      return;
    }

    // TODO: Implement log update functionality
    Alert.alert("Update Log", "Log update functionality will be implemented soon.");
  };

  const handleDelete = (log) => {
    // Only allow deleting logs if user is not an Employee
    if (userRole === "Employee") {
      Alert.alert("Access Denied", "Employees cannot delete logs.");
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

              Alert.alert("Success", "Log deleted successfully!", [
                { text: "OK" },
              ]);
            } catch (error) {
              let errorMessage = "Failed to delete log. Please try again.";
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

  const renderLogCard = React.useCallback((log) => {
    const isChecked = checkedTasks.has(log.id);
    console.log('Rendering log card:', log.id, 'isChecked:', isChecked);
    
    return (
      <View className="mb-4">
        {/* Task Card */}
        <View
          className="rounded-[8px] border shadow-sm"
          style={{
            backgroundColor: isChecked ? '#e5e7eb' : '#f8f9fa',
            borderColor: '#e9ecef',
            borderWidth: 1,
            padding: Math.min(16, screenWidth * 0.04),
            borderRadius: Math.min(8, screenWidth * 0.02),
          }}
        >
          <View>
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center flex-1">
                <View className="flex-row items-center mr-2" style={{ minWidth: Math.max(70, screenWidth * 0.17) }}>
                  <Ionicons
                    name="document-text"
                    size={Math.min(14, screenWidth * 0.035)}
                    color="#374151"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: "black",
                    fontWeight: "600",
                    letterSpacing: 0.3,
                  }}>
                    Title:
                  </Text>
                </View>
                <Text style={{
                  flex: 1,
                  fontSize: Math.min(15, screenWidth * 0.038),
                  color: "#333",
                  lineHeight: Math.min(24, screenHeight * 0.03),
                }}>
                  {log.title}
                </Text>
              </View>
              
              {/* Checkbox at the end */}
              <TouchableOpacity
                onPress={() => handleCheckboxToggle(log.id)}
                className="ml-3 border-2 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: isChecked ? '#000000' : 'white',
                  borderColor: isChecked ? '#000000' : '#6B7280',
                  borderWidth: 2,
                  minWidth: Math.max(20, screenWidth * 0.05),
                  minHeight: Math.max(20, screenWidth * 0.05),
                  width: Math.max(20, screenWidth * 0.05),
                  height: Math.max(20, screenWidth * 0.05),
                }}
              >
                {isChecked && (
                  <Ionicons
                    name="checkmark"
                    size={Math.min(16, screenWidth * 0.04)}
                    color="white"
                    style={{ fontWeight: 'bold' }}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }, [userRole, navigation, checkedTasks]);

  const renderContent = () => (
    <FlatList
      data={filteredLogs}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ 
        paddingHorizontal: Math.min(20, screenWidth * 0.05), 
        paddingTop: Math.min(20, screenHeight * 0.025), 
        paddingBottom: Math.min(100, screenHeight * 0.125) 
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEnabled={true}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={5}
 

      ListFooterComponent={() => (
        checkedTasks.size > 0 ? (
          <View style={{ 
            paddingHorizontal: Math.min(20, screenWidth * 0.05), 
            paddingVertical: Math.min(16, screenHeight * 0.02) 
          }}>
            <TouchableOpacity
              style={{
                minWidth: Math.max(200, screenWidth * 0.5),
                backgroundColor: 'black',
                borderRadius: Math.min(12, screenWidth * 0.03),
                paddingVertical: Math.min(12, screenHeight * 0.015),
                paddingHorizontal: Math.min(24, screenWidth * 0.06),
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
              }}
              onPress={() => {
                // Get the first selected task to open the modal
                const selectedTaskId = Array.from(checkedTasks)[0];
                const selectedTask = logs.find(log => log.id === selectedTaskId);
                if (selectedTask) {
                  handleCreateLog(selectedTask);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={{
                color: 'white',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}>
                Create Log {checkedTasks.size > 1 ? `(${checkedTasks.size} selected)` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null
      )}
      ListEmptyComponent={() => (
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: Math.min(20, screenWidth * 0.05),
          minHeight: Math.min(300, screenHeight * 0.375),
        }}>
          {error ? (
            <>
              <Text style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                color: "#dc3545",
                textAlign: "center",
                marginBottom: Math.min(16, screenHeight * 0.02),
                fontWeight: "500",
              }}>
                {error}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#007AFF",
                  paddingVertical: Math.min(12, screenHeight * 0.015),
                  paddingHorizontal: Math.min(24, screenWidth * 0.06),
                  borderRadius: Math.min(12, screenWidth * 0.03),
                }}
                onPress={loadLogData}
              >
                <Text style={{
                  color: "white",
                  fontSize: Math.min(16, screenWidth * 0.04),
                  fontWeight: "600",
                }}>
                  Retry
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={{
              fontSize: Math.min(16, screenWidth * 0.04),
              color: "#666",
              textAlign: "center",
              fontWeight: "500",
            }}>
              No logs found
            </Text>
          )}
        </View>
      )}
      renderItem={({ item }) => renderLogCard(item)}
    />
  );

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
          <Loader size="large" color="#000000" text="Loading logs..." />
        </View>
      ) : (
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
          }}
        >
          <View className="flex-1 bg-white" style={{ position: "relative" }}>
            {renderContent()}
          </View>
        </TouchableWithoutFeedback>
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
              onPress={() => setCreateLogModalVisible(false)}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

                    <View className="p-6">
            {/* --- Note Section (First) --- */}
            <View className="mb-6">
              <Text className="text-[16px] font-semibold text-[#333] mb-2">Note</Text>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                placeholder="Enter note for the selected tasks..."
                value={logNote}
                onChangeText={setLogNote}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* --- Image Selection Section (Second) --- */}
            <View className="mb-6">
              <Text className="text-[16px] font-semibold text-[#333] mb-2">Images *</Text>
              
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




          </View>

          {/* Fixed Action Button - Always positioned at bottom */}
          <View className="absolute bottom-0 left-0 right-0 px-6 pt-5 pb-5 bg-white items-center">
            <TouchableOpacity
              className="w-[280px] bg-black rounded-xl py-4 items-center justify-center"
              onPress={handleSubmitLog}
              disabled={isSubmittingLog || isUploadingImages}
              style={{ opacity: (isSubmittingLog || isUploadingImages) ? 0.6 : 1 }}
            >
              {(isSubmittingLog || isUploadingImages) ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white text-[16px] font-semibold">Saving Log...</Text>
                </View>
              ) : (
                <Text className="text-white text-[16px] font-semibold">Save Log</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default CreatLogScreen;

