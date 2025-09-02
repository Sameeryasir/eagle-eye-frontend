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
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import UpdateTaskModal from "./components/UpdateTaskModal";
import FilterModal from "./components/FilterModal";
import { deleteTaskById } from "../services/tasks/deleteTaskById";
import { getTaskByProjectId } from "../services/tasks/getTaskByProjectId";
import { createTask } from "../services/tasks/createTask";
import { getTasksAssignedToEmployees } from "../services/tasks/getTasksAssignedToEmployees";
import { getEmployeesToAssignTask } from "../services/employees/getEmployeesOfTheCompany";
import { filterTask, applyClientSideFilters } from "../services/tasks/filterTask";
import Loader from "../services/utils/loader";
import { getUserRole } from "../services/utils/userRole";
import DropDownPicker from "react-native-dropdown-picker";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const searchBarClasses = `flex-row items-center rounded-2xl px-4 py-3 bg-[#F8FAFC] border border-[#EAECF0]`;

const SearchBarHeader = React.memo(function SearchBarHeader({
  searchTerm,
  onChange,
  onFilterPress,
}) {
  return (
    <View style={{
      paddingVertical: Math.min(20, screenHeight * 0.025),
      paddingHorizontal: Math.min(20, screenWidth * 0.05),
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View
          className={searchBarClasses}
          style={{
            flex: 1,
            maxWidth: Math.min(600, screenWidth * 0.9),
            paddingHorizontal: Math.min(16, screenWidth * 0.04),
            paddingVertical: Math.min(12, screenHeight * 0.015),
            marginRight: Math.min(12, screenWidth * 0.03),
          }}
        >
          <Ionicons
            name="search"
            size={Math.min(18, screenWidth * 0.045)}
            color="#6B7280"
            style={{ marginRight: Math.min(8, screenWidth * 0.02) }}
          />
          <TextInput
            style={{
              flex: 1,
              fontSize: Math.min(15, screenWidth * 0.038),
              color: "#111827",
            }}
            placeholder="Search tasks"
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={onChange}
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => onChange("")} style={{ marginLeft: Math.min(8, screenWidth * 0.02) }}>
              <Ionicons name="close-circle" size={Math.min(18, screenWidth * 0.045)} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Icon */}
        <TouchableOpacity
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: Math.min(12, screenWidth * 0.03),
            padding: Math.min(12, screenWidth * 0.03),
            borderWidth: 1,
            borderColor: '#EAECF0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onFilterPress}
        >
          <Ionicons
            name="filter"
            size={Math.min(20, screenWidth * 0.05)}
            color="#374151"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

function ViewAllTasksScreen({ navigation, route }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [project, setProject] = useState(null);
  const [draftTasks, setDraftTasks] = useState([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [creatingTaskId, setCreatingTaskId] = useState(null);
  const [pendingTimePicker, setPendingTimePicker] = useState(null); // 'start' or 'end'
  const [updateTaskModalVisible, setUpdateTaskModalVisible] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [isDateConfirmed, setIsDateConfirmed] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [activePriorityDraftId, setActivePriorityDraftId] = useState(null);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [activeEmployeeDraftId, setActiveEmployeeDraftId] = useState(null);
  const [isDropdownInteracting, setIsDropdownInteracting] = useState(false);

  const [priorityOptions] = useState([
    { id: "low", label: "Low", color: "#10B981" },
    { id: "medium", label: "Medium", color: "#F59E0B" },
    { id: "high", label: "High", color: "#EF4444" },
    { id: "critical", label: "Critical", color: "#DC2626" },
  ]);
  const [userRole, setUserRole] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter Modal State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    createdAt: 'created-at',
    assignedTo: 'all',
    upcoming: 'all'
  });

  const { projectId, createDraft } = route.params || {};

  useEffect(() => {
    // Load data on initial mount
    loadProjectData();

    // Only create draft if user is not an Employee and createDraft is true
    if (createDraft && userRole && userRole !== "Employee") {
      handleFabPress();
    }
  }, [projectId, createDraft, userRole]);

  // Removed useFocusEffect to prevent duplicate reloads

  useEffect(() => {
    if (tasks.length > 0) {
      setFilteredTasks(tasks);
    }
  }, [tasks]);

  // Load employees when userRole becomes available and user is not an Employee
  useEffect(() => {
    if (userRole && userRole !== "Employee") {
      loadEmployees();
    }
  }, [userRole]);

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
    // Only allow creating tasks if user is not an Employee
    if (userRole === "Employee") {
      // Employees cannot create tasks, so do nothing (no alert, no response)
      return;
    }

    const now = new Date();
    const newDraftTask = {
      id: Math.floor(Math.random() * 1000000) + 1, // Integer ID
      title: "",
      description: "",
      startTime: now,
      minStartTime: now, // Capture when draft was created for backend validation
      endTime: null, // Let user manually select end time
      assignedTo: null,
      priority: "low",
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

  const loadEmployees = async () => {
    try {
      const response = await getEmployeesToAssignTask();
      if (response && Array.isArray(response)) {
        setEmployees(response);
        setFilteredEmployees(response);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const removeDraftTask = (draftId) => {
    setDraftTasks((prev) => prev.filter((draft) => draft.id !== draftId));
  };

  const [activeDraftId, setActiveDraftId] = useState(null);

  const handleStartDateChange = (event, selectedDate) => {
    // Only proceed if user clicked OK (not cancel)
    if (event.type === 'set' && selectedDate) {
      setShowStartDatePicker(false);

      const currentDraft = draftTasks.find((draft) => draft.id === activeDraftId);
      if (currentDraft) {
        const newDate = new Date(selectedDate);
        // Preserve the current time
        newDate.setHours(currentDraft.startTime.getHours());
        newDate.setMinutes(currentDraft.startTime.getMinutes());
        updateDraftTask(activeDraftId, "startTime", newDate);

        // Open time picker after date selection
        setPendingTimePicker("start");
        setTimeout(() => setShowStartTimePicker(true), 100);
      }
    } else {
      // User cancelled
      setShowStartDatePicker(false);
      setPendingTimePicker(null);
    }
  };

  const handleStartTimeChange = (event, selectedDate) => {
    // Only proceed if user clicked OK (not cancel)
    if (event.type === 'set' && selectedDate) {
      setShowStartTimePicker(false);
      setPendingTimePicker(null);

      if (activeDraftId) {
        const currentDraft = draftTasks.find(
          (draft) => draft.id === activeDraftId
        );
        if (currentDraft) {
          const newDate = new Date(currentDraft.startTime);
          newDate.setHours(selectedDate.getHours());
          newDate.setMinutes(selectedDate.getMinutes());
          updateDraftTask(activeDraftId, "startTime", newDate);
        }
      }
    } else {
      // User cancelled - keep the time picker open
      // Don't close the picker, let user try again
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    // Only proceed if user clicked OK (not cancel)
    if (event.type === 'set' && selectedDate) {
      setShowEndDatePicker(false);

      const currentDraft = draftTasks.find((draft) => draft.id === activeDraftId);
      if (currentDraft) {
        const newDate = new Date(selectedDate);
        // Set default time to 12:00 PM if endTime is null
        if (currentDraft.endTime) {
          newDate.setHours(currentDraft.endTime.getHours());
          newDate.setMinutes(currentDraft.endTime.getMinutes());
        } else {
          newDate.setHours(12, 0, 0, 0); // Default to 12:00 PM
        }
        updateDraftTask(activeDraftId, "endTime", newDate);

        // Open time picker after date selection
        setPendingTimePicker("end");
        setTimeout(() => setShowEndTimePicker(true), 100);
      }
    } else {
      // User cancelled
      setShowEndDatePicker(false);
      setPendingTimePicker(null);
    }
  };

  const handleEndTimeChange = (event, selectedDate) => {
    // Only proceed if user clicked OK (not cancel)
    if (event.type === 'set' && selectedDate) {
      setShowEndTimePicker(false);
      setPendingTimePicker(null);

      if (activeDraftId) {
        const currentDraft = draftTasks.find(
          (draft) => draft.id === activeDraftId
        );
        if (currentDraft) {
          let newDate;
          if (currentDraft.endTime) {
            newDate = new Date(currentDraft.endTime);
          } else {
            // If no end time set yet, use start time as base
            newDate = new Date(currentDraft.startTime);
          }
          newDate.setHours(selectedDate.getHours());
          newDate.setMinutes(selectedDate.getMinutes());
          updateDraftTask(activeDraftId, "endTime", newDate);
        }
      }
    } else {
      // User cancelled
      setShowEndTimePicker(false);
      setPendingTimePicker(null);
    }
  };

  /**
   * CHANGE SUMMARY (MCP Context 7):
   * - What: Updated validation to match backend logic. Validates startTime >= minStartTime (draft creation time)
   *   and endTime > startTime. Includes minStartTime in API payload for backend validation.
   * - Why: Backend expects minStartTime to handle draft-friendly validation allowing past start times.
   * - Dependencies: Backend API expects minStartTime field in the payload.
   */
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

    // End time is optional - no validation needed

    // --- Validation: Dates & Times (MCP Context 7) ---
    // Business Rule: Validate startTime >= minStartTime (when draft was created) and endTime > startTime

    // Ensure start time is not before the minimum start time (when draft was created)
    if (draftTask.minStartTime && draftTask.startTime < draftTask.minStartTime) {
      Alert.alert(
        "Error",
        "Start time cannot be before the draft creation time"
      );
      return;
    }

    // Only validate end time if it's provided (optional field)
    if (draftTask.endTime) {
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
    }

    setCreatingTaskId(draftTask.id);

    try {
      // Prepare the data for API call
      const taskPayload = {
        title: draftTask.title.trim(),
        description: draftTask.description.trim(),
        startTime: draftTask.startTime.toISOString(),
        minStartTime: draftTask.minStartTime.toISOString(), // Include minStartTime for backend validation
        endTime: draftTask.endTime ? draftTask.endTime.toISOString() : null, // Make endTime optional
        projectId: projectId,
        assignedToUserId: draftTask.assignedToUserId || null,
        priority: draftTask.priority || null,
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
      setCreatingTaskId(null);
    }
  };

  const loadProjectData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setInitialLoading(true);
      }
      setError(null);

      // Get user role first
      const role = await getUserRole();
      console.log("ViewAllTasksScreen - User Role:", role);
      setUserRole(role);

      let response;

      if (role === "Employee") {
        // For employees, get tasks assigned to them
        console.log(
          "ViewAllTasksScreen - Calling getTasksAssignedToEmployees for Employee"
        );
        response = await getTasksAssignedToEmployees();
        console.log("ViewAllTasksScreen - Employee tasks response:", response);
        setProject({ name: "My Tasks" });
        setTasks(response || []);
        setFilteredTasks(response || []);
      } else {
        // For other roles, get tasks by project ID
        console.log(
          "ViewAllTasksScreen - Calling getTaskByProjectId for role:",
          role,
          "projectId:",
          projectId
        );

        // Validate projectId before making API call
        if (!projectId) {
          console.error("ViewAllTasksScreen - No projectId provided");
          setError("Project ID is required");
          return;
        }

        response = await getTaskByProjectId(projectId);
        console.log("ViewAllTasksScreen - API response:", response);

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
      }

      setSearchTerm("");
    } catch (err) {
      console.error("ViewAllTasksScreen - Error loading project data:", err);
      console.error("ViewAllTasksScreen - Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        projectId: projectId
      });

      let errorMessage = "Failed to load project data";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      if (!isRefresh) {
        setInitialLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjectData(true);
    setRefreshing(false);
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

  const handleEmployeeSearch = (text) => {
    if (text.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const searchLower = text.toLowerCase().trim();

      const filtered = employees.filter((employee) => {
        const firstName = (employee.first_name || "").toLowerCase();
        const lastName = (employee.last_name || "").toLowerCase();
        const email = (employee.email || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();

        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          fullName.includes(searchLower) ||
          email.includes(searchLower)
        );
      });

      setFilteredEmployees(filtered);
    }
  };

  // Combine regular tasks and draft tasks for display
  const allTasks = [...draftTasks, ...filteredTasks];

  const handleUpdate = (task) => {
    // Only allow updating tasks if user is not an Employee
    if (userRole === "Employee") {
      Alert.alert("Access Denied", "Employees cannot update tasks.");
      return;
    }

    setSelectedTask(task);
    setUpdateTaskModalVisible(true);
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

  const handleUpdateTaskSuccess = () => {
    setUpdateTaskModalVisible(false);
    setSelectedTask(null);
    loadProjectData(); // Refresh the tasks list
  };

  const handleUpdateTaskClose = () => {
    setUpdateTaskModalVisible(false);
    setSelectedTask(null);
  };

  const handleApplyFilters = async (filters, preFilteredTasks = null) => {
    console.log('Applied filters:', filters);
    
    try {
      setInitialLoading(true);
      setError(null);

      // --- Apply Filters Based on User Role (MCP Context 7) ---
      // Business Rule: Different filtering logic for Employees vs other roles
      if (userRole === "Employee") {
        // For employees, get all assigned tasks first, then apply client-side filtering
        const allAssignedTasks = await getTasksAssignedToEmployees();
        const filteredTasks = applyClientSideFilters(allAssignedTasks || [], filters);
        setTasks(filteredTasks);
        setFilteredTasks(filteredTasks);
      } else {
        // Check if FilterModal already provided filtered tasks
        if (preFilteredTasks) {
          // Use pre-filtered tasks from FilterModal
          console.log('Using pre-filtered tasks from FilterModal');
          const fullyFilteredTasks = applyClientSideFilters(preFilteredTasks, filters);
          setTasks(fullyFilteredTasks);
          setFilteredTasks(fullyFilteredTasks);
        } else {
          // Fallback: Call backend filter service directly
          if (!projectId) {
            console.error('ViewAllTasksScreen - No projectId available for filtering');
            setError('Project ID is required for filtering');
            return;
          }

          const backendFilteredTasks = await filterTask(filters, projectId);
          const fullyFilteredTasks = applyClientSideFilters(backendFilteredTasks || [], filters);
          
          setTasks(fullyFilteredTasks);
          setFilteredTasks(fullyFilteredTasks);
        }
      }

      // Clear search term when applying filters
      setSearchTerm("");
      
    } catch (err) {
      console.error('ViewAllTasksScreen - Error applying filters:', err);
      setError('Failed to apply filters. Please try again.');
    } finally {
      setInitialLoading(false);
    }
  };

  const renderTaskCard = React.useCallback((task) => {
    if (task.isDraft) {
      const isActiveDropdown = task.id === activeEmployeeDraftId || task.id === activePriorityDraftId;
      return (
        <View
          className="bg-[#f8f9fa] rounded-[8px] border border-[#e9ecef] shadow-sm"
          style={{
            overflow: "visible",
            zIndex: isActiveDropdown ? 9999 : 1,
            position: 'relative',
            padding: Math.min(16, screenWidth * 0.04),
            marginBottom: Math.min(16, screenHeight * 0.02),
            borderRadius: Math.min(8, screenWidth * 0.02),
          }}
        >
          <View style={{
            overflow: "visible",
            position: 'relative'
          }}>
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: Math.min(16, screenHeight * 0.02)
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: Math.min(4, screenWidth * 0.01),
                  minWidth: Math.max(70, screenWidth * 0.17)
                }}>
                  <Ionicons
                    name="document-text"
                    size={Math.min(14, screenWidth * 0.035)}
                    color="#374151"
                    style={{ marginRight: Math.min(4, screenWidth * 0.01) }}
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
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: "#333",
                    lineHeight: Math.min(24, screenHeight * 0.03),
                    backgroundColor: "transparent",
                    padding: 0,
                    margin: 0,
                  }}
                  placeholder="Enter task title..."
                  placeholderTextColor="#9ca3af"
                  value={task.title}
                  onChangeText={(text) =>
                    updateDraftTask(task.id, "title", text)
                  }
                />
              </View>
              <TouchableOpacity
                style={{
                  marginBottom: Math.min(4, screenHeight * 0.005),
                  borderRadius: Math.min(20, screenWidth * 0.05),
                  backgroundColor: "#fef2f2",
                  marginLeft: Math.min(12, screenWidth * 0.03),
                  padding: Math.min(4, screenWidth * 0.01),
                }}
                onPress={() => removeDraftTask(task.id)}
              >
                <Ionicons name="trash-outline" size={Math.min(16, screenWidth * 0.04)} color="#dc3545" />
              </TouchableOpacity>
            </View>

            <View>
              <View style={{ marginBottom: Math.min(4, screenHeight * 0.005) }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: Math.min(12, screenWidth * 0.03),
                    minWidth: Math.max(85, screenWidth * 0.21)
                  }}>
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={Math.min(14, screenWidth * 0.035)}
                      color="#374151"
                      style={{ marginRight: Math.min(4, screenWidth * 0.01) }}
                    />
                    <Text style={{
                      fontSize: Math.min(15, screenWidth * 0.038),
                      color: "black",
                      fontWeight: "600",
                      letterSpacing: 0.3,
                    }}>
                      Description:
                    </Text>
                  </View>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: Math.min(15, screenWidth * 0.038),
                      color: "#333",
                      lineHeight: Math.min(24, screenHeight * 0.03),
                      minHeight: Math.min(30, screenHeight * 0.0375),
                      backgroundColor: "transparent",
                      textAlignVertical: "top",
                      padding: 0,
                      margin: 0,
                    }}
                    placeholder="Enter task description..."
                    placeholderTextColor="#9ca3af"
                    value={task.description}
                    onChangeText={(text) =>
                      updateDraftTask(task.id, "description", text)
                    }
                    multiline
                  />
                </View>
              </View>
              <View style={{ marginBottom: Math.min(12, screenHeight * 0.015) }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: Math.min(12, screenWidth * 0.03),
                    minWidth: Math.max(70, screenWidth * 0.17)
                  }}>
                    <Ionicons
                      name="flag"
                      size={Math.min(14, screenWidth * 0.035)}
                      color="#374151"
                      style={{ marginRight: Math.min(4, screenWidth * 0.01) }}
                    />
                    <Text style={{
                      fontSize: Math.min(15, screenWidth * 0.038),
                      color: "black",
                      fontWeight: "600",
                      letterSpacing: 0.3,
                    }}>
                      Priority:
                    </Text>
                  </View>
                  <View className="flex-1">
                    <DropDownPicker
                      open={priorityOpen && activePriorityDraftId === task.id}
                      value={task.priority || null}
                      items={priorityOptions.map((priority) => ({
                        label: priority.label,
                        value: priority.id,
                        icon: () => (
                          <View
                            className="w-3 h-3 rounded-full ml-1"
                            style={{ backgroundColor: priority.color }}
                          />
                        ),
                      }))}
                      setOpen={(open) => {
                        if (open) {
                          setActivePriorityDraftId(task.id);
                          // Close employee dropdown if open
                          setEmployeeOpen(false);
                          setActiveEmployeeDraftId(null);
                          setIsDropdownInteracting(true);
                        } else {
                          setActivePriorityDraftId(null);
                          setIsDropdownInteracting(false);
                        }
                        setPriorityOpen(open);
                      }}
                      setValue={(callback) => {
                        const newValue = callback(task.priority || null);
                        updateDraftTask(task.id, "priority", newValue);
                      }}
                      placeholder="Select Priority"
                      placeholderStyle={{
                        color: "#9ca3af",
                        fontSize: Math.min(15, screenWidth * 0.038),
                        fontWeight: "400",
                      }}
                      style={{
                        backgroundColor: "transparent",
                        borderWidth: 0,
                        minHeight: 0,
                        paddingVertical: 0,
                        paddingHorizontal: 0,
                      }}
                      textStyle={{
                        fontSize: Math.min(15, screenWidth * 0.038),
                        color: task.priority ? "#333" : "#9ca3af",
                        fontWeight: "400",
                      }}
                      dropDownContainerStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderWidth: 1.5,
                        borderRadius: Math.min(12, screenWidth * 0.03),
                        shadowColor: "#000",
                        shadowOpacity: 0.12,
                        shadowRadius: Math.min(12, screenWidth * 0.03),
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 999999,
                        maxHeight: Math.min(160, screenHeight * 0.2),
                        width: Math.max(140, screenWidth * 0.35),
                        marginLeft: -Math.min(10, screenWidth * 0.025),
                        marginTop: Math.min(24, screenHeight * 0.03),
                        zIndex: 999999,
                        position: 'absolute',
                        top: 0,
                        paddingVertical: Math.min(4, screenHeight * 0.005),
                      }}
                      listItemContainerStyle={{
                        height: Math.min(44, screenHeight * 0.055),
                        paddingHorizontal: Math.min(14, screenWidth * 0.035),
                        marginHorizontal: Math.min(4, screenWidth * 0.01),
                        marginVertical: Math.min(1, screenHeight * 0.001),
                        borderRadius: Math.min(8, screenWidth * 0.02),
                        backgroundColor: "transparent",
                        borderBottomWidth: 1,
                        borderBottomColor: "#f1f5f9",
                      }}
                      listItemLabelStyle={{
                        fontSize: Math.min(14, screenWidth * 0.035),
                        fontWeight: "500",
                        color: "#374151",
                        lineHeight: Math.min(18, screenHeight * 0.0225),
                      }}
                      arrowIconStyle={{
                        width: Math.min(16, screenWidth * 0.04),
                        height: Math.min(16, screenWidth * 0.04),
                        tintColor: "#6b7280",
                      }}
                      showArrowIcon={true}
                      arrowIconContainerStyle={{
                        marginRight: Math.max(130, screenWidth * 0.325),
                      }}
                    />
                  </View>
                </View>
              </View>


              <TouchableOpacity
                style={{ marginBottom: Math.min(12, screenHeight * 0.015) }}
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveDraftId(task.id);
                  setDatePickerValue(task.startTime);
                  setIsDateConfirmed(false);
                  setShowStartDatePicker(true);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: Math.min(12, screenWidth * 0.03),
                    minWidth: Math.max(85, screenWidth * 0.21)
                  }}>
                    <Ionicons
                      name="time"
                      size={Math.min(14, screenWidth * 0.035)}
                      color="#374151"
                      style={{ marginRight: Math.min(4, screenWidth * 0.01) }}
                    />
                    <Text style={{
                      fontSize: Math.min(15, screenWidth * 0.038),
                      color: "black",
                      fontWeight: "600",
                      letterSpacing: 0.3,
                    }}>
                      Start Date:
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: Math.min(15, screenWidth * 0.038),
                      color: "#333",
                      lineHeight: Math.min(24, screenHeight * 0.03),
                    }}>
                      {task.startTime
                        ? `${task.startTime.toLocaleDateString()} ${task.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`
                        : "Not set"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginBottom: Math.min(12, screenHeight * 0.015) }}
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveDraftId(task.id);
                  setDatePickerValue(task.endTime || task.startTime);
                  setIsDateConfirmed(false);
                  setShowEndDatePicker(true);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: Math.min(12, screenWidth * 0.03),
                    minWidth: Math.max(85, screenWidth * 0.21)
                  }}>
                    <Ionicons
                      name="calendar"
                      size={Math.min(14, screenWidth * 0.035)}
                      color="#374151"
                      style={{ marginRight: Math.min(4, screenWidth * 0.01) }}
                    />
                    <Text style={{
                      fontSize: Math.min(15, screenWidth * 0.038),
                      color: "black",
                      fontWeight: "600",
                      letterSpacing: 0.3,
                    }}>
                      End Date:
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: Math.min(15, screenWidth * 0.038),
                      lineHeight: Math.min(24, screenHeight * 0.03),
                      color: task.endTime ? "#333" : "#9ca3af"
                    }}>
                      {task.endTime
                        ? `${task.endTime.toLocaleDateString()} ${task.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`
                        : "No end date selected"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: Math.min(12, screenHeight * 0.015) }}>
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: "black",
                    paddingVertical: Math.min(8, screenHeight * 0.01),
                    paddingHorizontal: Math.min(24, screenWidth * 0.06),
                    borderRadius: Math.min(8, screenWidth * 0.02),
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                    minWidth: Math.max(120, screenWidth * 0.3),
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: creatingTaskId === task.id ? 0.6 : 1,
                  }}
                  onPress={() => handleCreateTaskFromDraft(task)}
                  disabled={creatingTaskId === task.id}
                  activeOpacity={creatingTaskId === task.id ? 1 : 0.8}
                >
                  {creatingTaskId === task.id ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={{
                      color: "white",
                      fontSize: Math.min(15, screenWidth * 0.038),
                      fontWeight: "600",
                      letterSpacing: 0.3,
                    }}>
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
      <TouchableOpacity
        className="bg-[#f8f9fa] rounded-[8px] p-4 mb-4 border border-[#e9ecef] shadow-sm"
        onPress={() => navigation.navigate("TaskDetails", { task })}
        activeOpacity={0.7}
      >
        <View>
          <View className="flex-row justify-between items-center mb-3">
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
                {task.title}
              </Text>
            </View>
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
                    onSelect={() => handleUpdate(task)}
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
                    onSelect={() => handleDelete(task)}
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

          <View>
            {userRole !== "Employee" && (
              <View className="mb-3">
                <View className="flex-row items-start">
                  <View className="flex-row items-center mr-3 min-w-[85px]">
                    <Ionicons
                      name="person"
                      size={14}
                      color="#374151"
                      style={{ marginRight: 4 }}
                    />
                    <Text className="text-[15px] text-black font-semibold tracking-[0.3px]">
                      Assigned:
                    </Text>
                  </View>
                  <Text className="flex-1 text-[15px] text-[#333] leading-6">
                    {getAssignedToName(task.assignedTo)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [activeEmployeeDraftId, activePriorityDraftId, creatingTaskId, draftTasks, employees, filteredEmployees, priorityOpen, employeeOpen, isDropdownInteracting, userRole, updateDraftTask, removeDraftTask, handleCreateTaskFromDraft, handleEmployeeSearch, navigation]);

  const renderContent = () => (
    <FlatList
      data={allTasks}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEnabled={true}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#3155A1"]}
          tintColor="#3155A1"
        />
      }
      ListHeaderComponent={
        <SearchBarHeader
          searchTerm={searchTerm}
          onChange={handleSearch}
          onFilterPress={() => setFilterModalVisible(true)}
        />
      }
      ListHeaderComponentStyle={{ marginHorizontal: -20 }}
      ListEmptyComponent={() => (
        <View className="flex-1 justify-center items-center p-5 min-h-[300px]">
          {error ? (
            <>
              <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-medium">
                {error}
              </Text>
              <TouchableOpacity
                className="bg-[#007AFF] py-3 px-6 rounded-lg"
                onPress={() => loadProjectData()}
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
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

      {/* Content */}
      {initialLoading ? (
        <View className="flex-1 justify-center items-center p-5 min-h-[300px]">
          <Loader size="large" color="#000000" text="Loading tasks..." />
        </View>
      ) : (
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            if (priorityOpen) {
              setPriorityOpen(false);
              setActivePriorityDraftId(null);
            }
            if (employeeOpen) {
              setEmployeeOpen(false);
              setActiveEmployeeDraftId(null);
            }
          }}
        >
          <View className="flex-1 bg-white" style={{ position: "relative" }}>
            {renderContent()}


          </View>
        </TouchableWithoutFeedback>
      )}

      <CustomBottomNav onAddPress={handleFabPress} />

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={() => setSidebarVisible(false)}
      />

      {/* Date and Time Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={datePickerValue}
          mode="date"
          onChange={handleStartDateChange}
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
          value={datePickerValue}
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

      {/* Update Task Modal - Only show for non-employees */}
      {userRole !== "Employee" && (
        <UpdateTaskModal
          visible={updateTaskModalVisible}
          task={selectedTask}
          projectId={projectId}
          onClose={handleUpdateTaskClose}
          onSuccess={handleUpdateTaskSuccess}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        onApplyFilters={handleApplyFilters}
        userRole={userRole}
        projectId={projectId}
      />
    </View>
  );
}

export default ViewAllTasksScreen;
