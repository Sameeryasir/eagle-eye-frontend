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
} from "react-native";
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
          className="bg-[#f8f9fa] rounded-[8px] p-4 border border-[#e9ecef] shadow-sm"
        >
          <View>
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center flex-1">
                <View className="flex-row items-center mr-2 min-w-[70px]">
                  <Ionicons
                    name="document-text"
                    size={14}
                    color="#374151"
                    style={{ marginRight: 4 }}
                  />
                  <Text className="text-[15px] text-black font-semibold tracking-[0.3px]">
                    Title:
                  </Text>
                </View>
                <Text className="flex-1 text-[15px] text-[#333] leading-6">
                  {log.title}
                </Text>
              </View>
              
              {/* Checkbox at the end */}
              <TouchableOpacity
                onPress={() => handleCheckboxToggle(log.id)}
                className="ml-3 w-5 h-5 border-2 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: isChecked ? '#000000' : 'white',
                  borderColor: isChecked ? '#000000' : '#6B7280',
                  borderWidth: 2,
                  minWidth: 20,
                  minHeight: 20
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
              {userRole !== "Employee" && (
                <Menu
                  rendererProps={{
                    placement: "bottom-end",
                    anchorStyle: { marginRight: 0 },
                    triggerStyle: { marginRight: 0 },
                  }}
                >
                  <MenuTrigger>
                    <View style={{ activeOpacity: 1 }}>
                      <Ionicons
                        name="ellipsis-vertical"
                        size={16}
                        color="#6b7280"
                      />
                    </View>
                  </MenuTrigger>
                  <MenuOptions
                    customStyles={{
                      optionsContainer: {
                        backgroundColor: "white",
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
                      },
                    }}
                  >
                    <MenuOption
                      onSelect={() => handleUpdate(log)}
                      customStyles={{
                        optionWrapper: {
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 4,
                        },
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#000" />
                      <Text
                        style={{
                          marginLeft: 10,
                          fontSize: 14,
                          fontWeight: "600",
                          color: "black",
                        }}
                      >
                        Update
                      </Text>
                    </MenuOption>
                    <MenuOption
                      onSelect={() => handleDelete(log)}
                      customStyles={{
                        optionWrapper: {
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 4,
                        },
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#dc3545" />
                      <Text
                        style={{
                          marginLeft: 10,
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#dc3545",
                        }}
                      >
                        Delete
                      </Text>
                    </MenuOption>
                  </MenuOptions>
                </Menu>
              )}
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
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEnabled={true}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={5}
      ListHeaderComponent={
        <View className="px-5 pb-3 pt-5">
          <TouchableOpacity
            onPress={() => {
              if (filteredLogs.length > 0) {
                const firstLogId = filteredLogs[0].id;
                handleCheckboxToggle(firstLogId);
                console.log('Toggling first log:', firstLogId);
              }
            }}
            className="bg-blue-500 py-2 px-4 rounded-lg self-start"
          >
            <Text className="text-white font-semibold">Test Checkbox</Text>
          </TouchableOpacity>
        </View>
      }
      ListHeaderComponentStyle={{ marginHorizontal: -20 }}
      ListFooterComponent={() => (
        checkedTasks.size > 0 ? (
          <View className="px-5 py-4">
            <TouchableOpacity
              className="w-[300px] bg-black rounded-lg py-3 px-6 items-center justify-center self-center"
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
              <Text className="text-white text-[16px] font-semibold">
                Create Log {checkedTasks.size > 1 ? `(${checkedTasks.size} selected)` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null
      )}
      ListEmptyComponent={() => (
        <View className="flex-1 justify-center items-center p-5 min-h-[300px]">
          {error ? (
            <>
              <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-medium">
                {error}
              </Text>
              <TouchableOpacity
                className="bg-[#007AFF] py-3 px-6 rounded-lg"
                onPress={loadLogData}
              >
                <Text className="text-white text-[16px] font-semibold">
                  Retry
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text className="text-[16px] text-[#666] text-center font-medium">
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
        <View className="flex-1 justify-center items-center p-5 min-h-[300px]">
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
                placeholder="Enter your log note..."
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

