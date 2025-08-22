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
} from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import { getTasksAssignedToEmployees } from "../services/tasks/getTasksAssignedToEmployees";
import Loader from "../services/utils/loader";
import { getUserRole } from "../services/utils/userRole";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

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

      // For employees, get tasks assigned to them (using the same API as ViewAllTasksScreen)
      console.log("CreatLogScreen - Calling getTasksAssignedToEmployees for Employee");
      const response = await getTasksAssignedToEmployees();
      console.log("CreatLogScreen - Employee tasks response:", response);
      
      // Convert tasks to logs format for display
      const logsData = response ? response.map(task => ({
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
      })) : [];

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

  const handleCreateLog = (task) => {
    setSelectedTaskForLog(task);
    setLogNote("");
    setCreateLogModalVisible(true);
  };

  const handleSubmitLog = () => {
    if (!logNote.trim()) {
      Alert.alert("Error", "Please enter a note for the log");
      return;
    }
    
    // TODO: Implement log creation API call
    console.log('Creating log for task:', selectedTaskForLog.id, 'Note:', logNote);
    Alert.alert('Success', 'Log created successfully!');
    
    setCreateLogModalVisible(false);
    setSelectedTaskForLog(null);
    setLogNote("");
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
            <View className="mb-6">
              <Text className="text-[16px] font-semibold text-[#333] mb-2">Note *</Text>
              <TextInput
                className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                placeholder="Enter note..."
                value={logNote}
                onChangeText={setLogNote}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            <View className="mb-8">
              <Text className="text-[16px] font-semibold text-[#333] mb-2">Image</Text>
              <TouchableOpacity
                className="border-2 border-dashed border-[#e1e8ed] rounded-lg p-6 items-center justify-center bg-[#f8f9fa]"
                onPress={() => {
                  // TODO: Implement image picker
                  Alert.alert('Image Picker', 'Image picker functionality will be implemented soon.');
                }}
              >
                <Ionicons name="camera" size={32} color="#666" />
                <Text className="text-[14px] text-[#666] mt-2">Tap to add image</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Fixed Action Button - Always positioned at bottom */}
          <View className="absolute bottom-0 left-0 right-0 px-6 pt-5 pb-5 bg-white items-center">
            <TouchableOpacity
              className="w-[280px] bg-black rounded-xl py-4 items-center justify-center"
              onPress={handleSubmitLog}
            >
              <Text className="text-white text-[16px] font-semibold">Save Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default CreatLogScreen;

