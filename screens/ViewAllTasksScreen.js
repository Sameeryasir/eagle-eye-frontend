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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import UpdateTaskModal from "./components/UpdateTaskModal";
import { deleteTaskById } from "../services/tasks/deleteTaskById";
import { getTaskByProjectId } from "../services/tasks/getTaskByProjectId";
import { createTask } from "../services/tasks/createTask";
import Loader from "../services/utils/loader";

const searchBarClasses = `flex-row items-center rounded-2xl px-4 py-3 bg-[#F8FAFC] border border-[#EAECF0]`;

const SearchBarHeader = React.memo(function SearchBarHeader({
  searchTerm,
  onChange,
}) {
  return (
    <View className="py-5 px-5">
      <View
        className={searchBarClasses}
        style={{ width: "100%", maxWidth: 600 }}
      >
        <Ionicons
          name="search"
          size={18}
          color="#6B7280"
          style={{ marginRight: 8 }}
        />
        <TextInput
          className="flex-1 text-[15px] text-[#111827]"
          placeholder="Search tasks"
          placeholderTextColor="#9CA3AF"
          value={searchTerm}
          onChangeText={onChange}
          returnKeyType="search"
          blurOnSubmit={false}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => onChange("")} className="ml-2">
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

function ViewAllTasksScreen({ navigation, route }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [project, setProject] = useState(null);
  const [draftTasks, setDraftTasks] = useState([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [pendingTimePicker, setPendingTimePicker] = useState(null); // 'start' or 'end'
  const [updateTaskModalVisible, setUpdateTaskModalVisible] = useState(false);

  const { projectId } = route.params || {};

  useFocusEffect(
    React.useCallback(() => {
      if (projectId) {
        loadProjectData();
      }
    }, [projectId])
  );

  useEffect(() => {
    if (tasks.length > 0) {
      setFilteredTasks(tasks);
    }
  }, [tasks]);

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

  const handleFabPress = () => {
    const now = new Date();
    const newDraftTask = {
      id: Math.floor(Math.random() * 1000000) + 1, // Integer ID
      title: "",
      description: "",
      startTime: now,
      endTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour later
      assignedTo: null,
      isDraft: true,
    };

    setDraftTasks((prev) => [newDraftTask, ...prev]);
  };

  const updateDraftTask = (draftId, field, value) => {
    setDraftTasks((prev) =>
      prev.map((draft) =>
        draft.id === draftId ? { ...draft, [field]: value } : draft
      )
    );
  };

  const removeDraftTask = (draftId) => {
    setDraftTasks((prev) => prev.filter((draft) => draft.id !== draftId));
  };

  const [activeDraftId, setActiveDraftId] = useState(null);

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate && activeDraftId) {
      const newDate = new Date(selectedDate);
      const currentDraft = draftTasks.find(
        (draft) => draft.id === activeDraftId
      );
      if (currentDraft) {
        // Preserve the current time
        newDate.setHours(currentDraft.startTime.getHours());
        newDate.setMinutes(currentDraft.startTime.getMinutes());
        updateDraftTask(activeDraftId, "startTime", newDate);

        // Ensure end date is not before start date
        if (newDate > currentDraft.endTime) {
          updateDraftTask(activeDraftId, "endTime", newDate);
        }
      }
      // Automatically open time picker after date selection
      setPendingTimePicker("start");
      setTimeout(() => setShowStartTimePicker(true), 100);
    }
  };

  const handleStartTimeChange = (event, selectedDate) => {
    setShowStartTimePicker(false);
    setPendingTimePicker(null);
    if (selectedDate && activeDraftId) {
      const currentDraft = draftTasks.find(
        (draft) => draft.id === activeDraftId
      );
      if (currentDraft) {
        const newDate = new Date(currentDraft.startTime);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        updateDraftTask(activeDraftId, "startTime", newDate);

        // Ensure end date is not before start date
        if (newDate > currentDraft.endTime) {
          updateDraftTask(activeDraftId, "endTime", newDate);
        }
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate && activeDraftId) {
      const currentDraft = draftTasks.find(
        (draft) => draft.id === activeDraftId
      );
      if (currentDraft) {
        const newDate = new Date(selectedDate);
        newDate.setHours(currentDraft.endTime.getHours());
        newDate.setMinutes(currentDraft.endTime.getMinutes());
        updateDraftTask(activeDraftId, "endTime", newDate);
      }
      // Automatically open time picker after date selection
      setPendingTimePicker("end");
      setTimeout(() => setShowEndTimePicker(true), 100);
    }
  };

  const handleEndTimeChange = (event, selectedDate) => {
    setShowEndTimePicker(false);
    setPendingTimePicker(null);
    if (selectedDate && activeDraftId) {
      const currentDraft = draftTasks.find(
        (draft) => draft.id === activeDraftId
      );
      if (currentDraft) {
        const newDate = new Date(currentDraft.endTime);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        updateDraftTask(activeDraftId, "endTime", newDate);
      }
    }
  };

  const handleCreateTaskFromDraft = async (draftTask) => {
    // Validate required fields
    if (!draftTask.title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }

    if (!draftTask.description.trim()) {
      Alert.alert("Error", "Task description is required");
      return;
    }

    // Validate that projectId is available
    if (!projectId) {
      Alert.alert("Error", "Project ID is required to create a task");
      return;
    }

    // Validate and format dates
    const now = new Date();

    // Ensure start time is not in the past
    if (draftTask.startTime <= now) {
      Alert.alert("Error", "Start date and time must be in the future");
      return;
    }

    // Ensure end time is after start time
    if (draftTask.endTime <= draftTask.startTime) {
      Alert.alert(
        "Error",
        "End date and time must be after start date and time"
      );
      return;
    }

    // Additional validation for reasonable time ranges
    const timeDifference =
      draftTask.endTime.getTime() - draftTask.startTime.getTime();
    const minDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

    if (timeDifference < minDuration) {
      Alert.alert("Error", "Task duration must be at least 15 minutes");
      return;
    }

    if (timeDifference > maxDuration) {
      Alert.alert("Error", "Task duration cannot exceed 1 year");
      return;
    }

    setIsCreatingTask(true);

    try {
      // Prepare the data for API call
      const taskPayload = {
        title: draftTask.title.trim(),
        description: draftTask.description.trim(),
        startTime: draftTask.startTime.toISOString(),
        endTime: draftTask.endTime.toISOString(),
        projectId: projectId,
      };

      const response = await createTask(taskPayload);

      // Remove the draft task after successful creation
      removeDraftTask(draftTask.id);

      // Reload the tasks to show the newly created task
      await loadProjectData();

      Alert.alert("Success", "Task created successfully!", [{ text: "OK" }]);
    } catch (error) {
      console.error("Error creating task:", error);

      let errorMessage = "Failed to create task. Please try again.";

      // Handle different types of error responses
      if (error.response?.data?.message) {
        // If message is an array, join it, otherwise use as string
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(", ");
        } else {
          errorMessage = String(error.response.data.message);
        }
      } else if (error.message) {
        errorMessage = String(error.message);
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getTaskByProjectId(projectId);

      if (response && response.project) {
        setProject(response.project);
      } else if (response) {
        setProject(response);
      }

      if (response && response.tasks) {
        setTasks(response.tasks);
        setFilteredTasks(response.tasks);
      } else if (response && Array.isArray(response)) {
        setTasks(response);
        setFilteredTasks(response);
      } else {
        setTasks([]);
        setFilteredTasks([]);
      }

      setSearchTerm("");
    } catch (err) {
      setError("Failed to load project data");
    } finally {
      setLoading(false);
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

  const handleSearch = (text) => {
    setSearchTerm(text);

    if (text.trim() === "") {
      setFilteredTasks(tasks);
    } else {
      const searchLower = text.toLowerCase().trim();

      const filtered = tasks.filter((task) => {
        try {
          const titleMatch =
            task.title && task.title.toLowerCase().includes(searchLower);
          return titleMatch;
        } catch (error) {
          return false;
        }
      });

      setFilteredTasks(filtered);
    }
  };

  // Combine regular tasks and draft tasks for display
  const allTasks = [...draftTasks, ...filteredTasks];

  const handleMenuPress = (task, event) => {
    event.target.measure((x, y, width, height, pageX, pageY) => {
      setMenuPosition({
        x: pageX + width - 120,
        y: pageY + height + 5,
      });
    });

    setSelectedTask(task);
    setMenuVisible(true);
  };

  const handleUpdate = () => {
    setMenuVisible(false);
    setUpdateTaskModalVisible(true);
  };

  const handleDelete = () => {
    const taskId = selectedTask?.id;
    const taskTitle = selectedTask?.title;

    if (!taskId) {
      return;
    }

    setMenuVisible(false);
    setSelectedTask(null);

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
              await deleteTaskById(taskId);

              const updatedTasks = tasks.filter((task) => task.id !== taskId);
              const updatedFilteredTasks = filteredTasks.filter(
                (task) => task.id !== taskId
              );

              setTasks(updatedTasks);
              setFilteredTasks(updatedFilteredTasks);

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

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedTask(null);
  };

  const handleUpdateTaskSuccess = () => {
    setUpdateTaskModalVisible(false);
    setSelectedTask(null);
    loadProjectData(); // Refresh the tasks list
  };

  const handleUpdateTaskClose = () => {
    setUpdateTaskModalVisible(false);
    setSelectedTask(null);
  };

  const renderTaskCard = (task) => {
    if (task.isDraft) {
      return (
        <View className="bg-[#f8f9fa] rounded-[16px] p-4 mb-3 border border-[#e9ecef]">
          <View className="gap-4">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 mr-3">
                <TextInput
                  className="text-[18px] font-bold text-[#333] leading-6"
                  placeholder="Enter task title..."
                  placeholderTextColor="#999"
                  value={task.title}
                  onChangeText={(text) =>
                    updateDraftTask(task.id, "title", text)
                  }
                />
              </View>
              <TouchableOpacity
                className="p-1 rounded"
                onPress={() => removeDraftTask(task.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View className="gap-4">
              <View className="mb-2">
                <Text className="text-[14px] text-[#666] font-semibold mb-1.5 uppercase tracking-[0.5px]">
                  Description
                </Text>
                <TextInput
                  className="text-[15px] text-[#555] leading-5 italic min-h-[40px]"
                  placeholder="Enter task description..."
                  placeholderTextColor="#999"
                  value={task.description}
                  onChangeText={(text) =>
                    updateDraftTask(task.id, "description", text)
                  }
                  multiline
                  style={{ textAlignVertical: "top" }}
                />
              </View>

              <View className="flex-row justify-between gap-3">
                <View className="flex-1 items-center py-2 px-1.5 bg-white rounded-[8px] border border-[#e0e0e0]">
                  <Ionicons name="person" size={16} color="#666" />
                  <Text className="text-[11px] text-[#666] font-medium mt-1 mb-0.5 text-center">
                    Assigned
                  </Text>
                  <Text className="text-[13px] font-semibold text-[#333] text-center leading-4">
                    Unassigned
                  </Text>
                </View>

                <TouchableOpacity
                  className="flex-1 items-center py-2 px-1.5 bg-white rounded-[8px] border border-[#e0e0e0]"
                  onPress={() => {
                    setActiveDraftId(task.id);
                    setShowStartDatePicker(true);
                  }}
                >
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text className="text-[11px] text-[#666] font-medium mt-1 mb-0.5 text-center">
                    Start Date
                  </Text>
                  <Text className="text-[13px] font-semibold text-[#333] text-center leading-4">
                    {task.startTime
                      ? `${task.startTime.toLocaleDateString()} ${task.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "Not set"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 items-center py-2 px-1.5 bg-white rounded-[8px] border border-[#e0e0e0]"
                  onPress={() => {
                    setActiveDraftId(task.id);
                    setShowEndDatePicker(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text className="text-[11px] text-[#666] font-medium mt-1 mb-0.5 text-center">
                    End Date
                  </Text>
                  <Text className="text-[13px] font-semibold text-[#333] text-center leading-4">
                    {task.endTime
                      ? `${task.endTime.toLocaleDateString()} ${task.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "Not set"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="pt-3">
              <View className="items-center">
                <TouchableOpacity
                  className={`bg-black py-2 px-6 rounded-lg ${isCreatingTask ? "opacity-60" : ""}`}
                  onPress={() => handleCreateTaskFromDraft(task)}
                  disabled={isCreatingTask}
                >
                  {isCreatingTask ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white text-[14px] font-semibold">
                      Create Task
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View className="bg-[#f8f9fa] rounded-[16px] p-4 mb-3 border border-[#e9ecef]">
        <View className="gap-4">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-[18px] font-bold text-[#333] leading-6">
                {task.title}
              </Text>
            </View>
            <TouchableOpacity
              className="p-1 rounded"
              onPress={(event) => handleMenuPress(task, event)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View className="gap-4">
            <View className="mb-2">
              <Text className="text-[14px] text-[#666] font-semibold mb-1.5 uppercase tracking-[0.5px]">
                Description
              </Text>
              <Text
                className="text-[15px] text-[#555] leading-5 italic"
                numberOfLines={2}
              >
                {task.description || "No description"}
              </Text>
            </View>

            <View className="flex-row justify-between gap-3">
              <View className="flex-1 items-center py-2 px-1.5 bg-white rounded-[8px] border border-[#e0e0e0]">
                <Ionicons name="person" size={16} color="#666" />
                <Text className="text-[11px] text-[#666] font-medium mt-1 mb-0.5 text-center">
                  Assigned
                </Text>
                <Text className="text-[13px] font-semibold text-[#333] text-center leading-4">
                  {getAssignedToName(task.assignedTo)}
                </Text>
              </View>

              <View className="flex-1 items-center py-2 px-1.5 bg-white rounded-[8px] border border-[#e0e0e0]">
                <Ionicons name="calendar" size={16} color="#666" />
                <Text className="text-[11px] text-[#666] font-medium mt-1 mb-0.5 text-center">
                  Start Date
                </Text>
                <Text className="text-[13px] font-semibold text-[#333] text-center leading-4">
                  {formatDateTime(task.startTime)}
                </Text>
              </View>

              <View className="flex-1 items-center py-2 px-1.5 bg-white rounded-[8px] border border-[#e0e0e0]">
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text className="text-[11px] text-[#666] font-medium mt-1 mb-0.5 text-center">
                  End Date
                </Text>
                <Text className="text-[13px] font-semibold text-[#333] text-center leading-4">
                  {formatDateTime(task.endTime)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => (
    <FlatList
      data={allTasks}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        <SearchBarHeader searchTerm={searchTerm} onChange={handleSearch} />
      }
      ListHeaderComponentStyle={{ marginHorizontal: -20 }}
      ListEmptyComponent={() => (
        <View className="flex-1 justify-center items-center p-5 min-h-[300px]">
          {loading ? (
            <Loader size="large" color="#000000" text="Loading tasks..." />
          ) : error ? (
            <>
              <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-medium">
                {error}
              </Text>
              <TouchableOpacity
                className="bg-[#007AFF] py-3 px-6 rounded-lg"
                onPress={loadProjectData}
              >
                <Text className="text-white text-[16px] font-semibold">
                  Retry
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text className="text-[16px] text-[#666] text-center font-medium">
              {searchTerm.trim() !== ""
                ? "No tasks match your search"
                : "No tasks found"}
            </Text>
          )}
        </View>
      )}
      renderItem={({ item }) => renderTaskCard(item)}
    />
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-5 py-[15px] bg-white border-b border-[#f0f0f0]">
          <TouchableOpacity
            className="p-2 rounded-lg bg-[#f8f9fa]"
            onPress={() => setSidebarVisible(!sidebarVisible)}
          >
            <Ionicons name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-[#333] tracking-[0.5px]">
            Tasks
          </Text>
          <TouchableOpacity className="p-2 rounded-lg bg-[#f8f9fa]">
            <Ionicons name="notifications" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-white">{renderContent()}</View>
        </TouchableWithoutFeedback>

        {!keyboardVisible && <CustomBottomNav onAddPress={handleFabPress} />}
      </SafeAreaView>

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={() => setSidebarVisible(false)}
      />

      {/* Date and Time Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={
            activeDraftId
              ? draftTasks.find((draft) => draft.id === activeDraftId)
                  ?.startTime || new Date()
              : new Date()
          }
          mode="date"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={
            activeDraftId
              ? draftTasks.find((draft) => draft.id === activeDraftId)
                  ?.startTime || new Date()
              : new Date()
          }
          mode="time"
          onChange={handleStartTimeChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={
            activeDraftId
              ? draftTasks.find((draft) => draft.id === activeDraftId)
                  ?.endTime || new Date()
              : new Date()
          }
          mode="date"
          onChange={handleEndDateChange}
          minimumDate={
            activeDraftId
              ? draftTasks.find((draft) => draft.id === activeDraftId)
                  ?.startTime || new Date()
              : new Date()
          }
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={
            activeDraftId
              ? draftTasks.find((draft) => draft.id === activeDraftId)
                  ?.endTime || new Date()
              : new Date()
          }
          mode="time"
          onChange={handleEndTimeChange}
        />
      )}

      {menuVisible && (
        <TouchableOpacity
          className="absolute top-0 left-0 right-0 bottom-0"
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View
            className="bg-white rounded-lg p-2"
            style={{
              position: "absolute",
              top: menuPosition.y,
              left: menuPosition.x,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <TouchableOpacity
              className="flex-row items-center py-2.5 px-4 rounded"
              onPress={handleUpdate}
            >
              <Ionicons name="create-outline" size={18} color="black" />
              <Text className="ml-2.5 text-[14px] font-semibold text-black">
                Update
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center py-2.5 px-4 rounded"
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              <Text
                className="ml-2.5 text-[14px] font-semibold"
                style={{ color: "#FF3B30" }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Update Task Modal */}
      <UpdateTaskModal
        visible={updateTaskModalVisible}
        task={selectedTask}
        projectId={projectId}
        onClose={handleUpdateTaskClose}
        onSuccess={handleUpdateTaskSuccess}
      />
    </View>
  );
}

export default ViewAllTasksScreen;
