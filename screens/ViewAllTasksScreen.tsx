// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Keyboard,
  FlatList,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
  StyleSheet,
} from "react-native";
import Toast from 'react-native-toast-message';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Sidebar from "../components/Sidebar";
import HomeBottomNav from "../components/HomeBottomNav";
import UpdateTaskModal from "../components/UpdateTaskModal";
import FilterModal from "../components/FilterModal";
import ErrorDialog from "../components/ErrorDialog";
import TaskListCard from "../components/TaskListCard";
import PriorityDropdown from "../components/PriorityDropdown";
import { filterTask } from "../services/tasks/filterTask";
import { useAuth } from "../context/AuthContext";

import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTasksByProjectId,
  fetchTasks,
  createNewTask,
  deleteExistingTask,
  fetchEmployeesForTaskAssignment,
  setCurrentProjectId,
  clearError,
  selectTasks,
  selectTaskLoading,
  selectTaskError,
  selectTaskCreating,
  selectTaskDeleting,
  selectTaskCreateError,
  selectTaskDeleteError,
  selectEmployeesForAssignment,
} from '../store/slices/taskSlice';
import { Brand } from "../constants/brandColors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const searchBarClasses = `flex-row items-center rounded-2xl px-4 py-3 bg-[#F8FAFC] border border-[#EAECF0]`;

const SearchBarHeader = React.memo(function SearchBarHeader({
  searchTerm,
  onChange,
  onFilterPress,
  filtersActive = false,
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
            name="search-outline"
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

        <TouchableOpacity
          style={{
            backgroundColor: filtersActive ? Brand.ink : "#F8FAFC",
            borderRadius: Math.min(12, screenWidth * 0.03),
            padding: Math.min(12, screenWidth * 0.03),
            borderWidth: 1,
            borderColor: filtersActive ? Brand.ink : "#EAECF0",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <Ionicons
            name={filtersActive ? "funnel" : "funnel-outline"}
            size={Math.min(20, screenWidth * 0.05)}
            color={filtersActive ? Brand.onInk : Brand.ink}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

function ViewAllTasksScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const tasks = useSelector(selectTasks);
  const loading = useSelector(selectTaskLoading);
  const error = useSelector(selectTaskError);
  const creating = useSelector(selectTaskCreating);
  const deleting = useSelector(selectTaskDeleting);
  const createError = useSelector(selectTaskCreateError);
  const deleteError = useSelector(selectTaskDeleteError);
  const employees = useSelector(selectEmployeesForAssignment);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [project, setProject] = useState(null);
  const [draftTasks, setDraftTasks] = useState([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [creatingTaskId, setCreatingTaskId] = useState(null);
  const [pendingTimePicker, setPendingTimePicker] = useState(null); 
  const [updateTaskModalVisible, setUpdateTaskModalVisible] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [isDateConfirmed, setIsDateConfirmed] = useState(false);

  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [priorityDraftId, setPriorityDraftId] = useState(null);
  const MAX_DRAFT_CARDS = 5;
  const draftIdSeq = useRef(0);
  const createDraftOpened = useRef(false);

  const priorityOptions = [
    { id: "low", label: "Low", color: "#10B981" },
    { id: "medium", label: "Medium", color: "#F59E0B" },
    { id: "high", label: "High", color: "#EF4444" },
    { id: "critical", label: "Critical", color: "#DC2626" },
  ];
  
  const { userRole } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [pastTimeDialogVisible, setPastTimeDialogVisible] = useState(false);

  const [errorDialog, setErrorDialog] = useState({
    visible: false,
    title: '',
    message: ''
  });

  
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    createdAt: null, 
    assignedTo: null, 
    upcoming: null, 
    status: null 
  });
  const [filtersApplied, setFiltersApplied] = useState(false); 

  const { projectId, projectName, createDraft, showUpcomingTasks } = route.params || {};

  const showErrorDialog = (title, message) => {
    setErrorDialog({
      visible: true,
      title: title,
      message: message
    });
  };

  const closeErrorDialog = () => {
    setErrorDialog({
      visible: false,
      title: '',
      message: ''
    });
  };

  
  useEffect(() => {
    loadProjectData(false);
  }, [projectId]);

  
  useEffect(() => {
    if (
      createDraft &&
      userRole &&
      userRole !== "Employee" &&
      !createDraftOpened.current
    ) {
      createDraftOpened.current = true;
      handleFabPress();
    }
  }, [createDraft, userRole]);

  useEffect(() => {
    if (!filtersApplied) {
      setFilteredTasks(tasks);
    }
  }, [tasks, filtersApplied]);

  
  useEffect(() => {
    if (userRole && userRole !== "Employee") {
      dispatch(fetchEmployeesForTaskAssignment());
    }
  }, [userRole, dispatch]);

  
  useEffect(() => {
    if (employees && Array.isArray(employees)) {
      setFilteredEmployees(employees);
    }
  }, [employees]);

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
    if (userRole === "Employee") return;

    if (draftTasks.length >= MAX_DRAFT_CARDS) {
      Toast.show({
        type: "info",
        text1: "Draft limit reached",
        text2: `Finish or discard a draft first (max ${MAX_DRAFT_CARDS}).`,
        visibilityTime: 2500,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    const now = new Date();
    now.setSeconds(0, 0);
    draftIdSeq.current += 1;
    const draftId = `draft-${Date.now()}-${draftIdSeq.current}`;

    setPriorityDraftId(null);
    setDraftTasks((prev) => {
      if (prev.length >= MAX_DRAFT_CARDS) return prev;
      return [
        {
          id: draftId,
          title: "",
          description: "",
          startTime: now,
          endTime: null,
          assignedTo: null,
          priority: "low",
          isDraft: true,
        },
        ...prev,
      ];
    });
  };

  const updateDraftTask = (draftId, field, value) => {
    setDraftTasks((prev) =>
      prev.map((draft) =>
        draft.id === draftId ? { ...draft, [field]: value } : draft
      )
    );
  };

  const removeDraftTask = (draftId) => {
    setPriorityDraftId((openId) => (openId === draftId ? null : openId));
    setDraftTasks((prev) => prev.filter((draft) => draft.id !== draftId));
  };

  const [activeDraftId, setActiveDraftId] = useState(null);

  const handleStartDateChange = (event, selectedDate) => {
    
    if (event.type === 'set' && selectedDate) {
      setShowStartDatePicker(false);

      const currentDraft = draftTasks.find((draft) => draft.id === activeDraftId);
      if (currentDraft) {
        const newDate = new Date(selectedDate);
        
        newDate.setHours(currentDraft.startTime.getHours());
        newDate.setMinutes(currentDraft.startTime.getMinutes());
        updateDraftTask(activeDraftId, "startTime", newDate);

        
        setPendingTimePicker("start");
        setTimeout(() => setShowStartTimePicker(true), 100);
      }
    } else {
      
      setShowStartDatePicker(false);
      setPendingTimePicker(null);
    }
  };

  const handleStartTimeChange = (event, selectedDate) => {
    
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
          
          
          const now = new Date();
          const isToday = newDate.toDateString() === now.toDateString();
          
          if (isToday && newDate < now) {
            showErrorDialog(
              'Invalid Time',
              'You cannot select a time in the past for today. Please choose a future time.'
            );
            return;
          }
          
          updateDraftTask(activeDraftId, "startTime", newDate);
        }
      }
    } else {
      
      
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    
    if (event.type === 'set' && selectedDate) {
      setShowEndDatePicker(false);

      const currentDraft = draftTasks.find((draft) => draft.id === activeDraftId);
      if (currentDraft) {
        const newDate = new Date(selectedDate);
        
        if (currentDraft.endTime) {
          newDate.setHours(currentDraft.endTime.getHours());
          newDate.setMinutes(currentDraft.endTime.getMinutes());
        } else {
          newDate.setHours(12, 0, 0, 0); 
        }
        updateDraftTask(activeDraftId, "endTime", newDate);

        
        setPendingTimePicker("end");
        setTimeout(() => setShowEndTimePicker(true), 100);
      }
    } else {
      
      setShowEndDatePicker(false);
      setPendingTimePicker(null);
    }
  };

  const handleEndTimeChange = (event, selectedDate) => {
    
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
            
            newDate = new Date(currentDraft.startTime);
          }
          newDate.setHours(selectedDate.getHours());
          newDate.setMinutes(selectedDate.getMinutes());
          
          
          const now = new Date();
          const isToday = newDate.toDateString() === now.toDateString();
          
          if (isToday && newDate < now) {
            showErrorDialog(
              'Invalid Time',
              'You cannot select a time in the past for today. Please choose a future time.'
            );
            return;
          }
          
          
          if (newDate <= currentDraft.startTime) {
            showErrorDialog(
              'Invalid End Time',
              'End time must be after start time. Please choose a later time.'
            );
            return;
          }
          
          updateDraftTask(activeDraftId, "endTime", newDate);
        }
      }
    } else {
      
      setShowEndTimePicker(false);
      setPendingTimePicker(null);
    }
  };

  const handleCreateTaskFromDraft = async (draftTask) => {
    if (creatingTaskId != null) return;
    if (!draftTask?.isDraft || !draftTask.id) return;

    if (!draftTask.title.trim()) {
      showErrorDialog("Error", "Task title is required");
      return;
    }

    

    
    if (!projectId) {
      showErrorDialog("Error", "Project ID is required to create a task");
      return;
    }

    

    
    if (draftTask.endTime) {
      
      if (draftTask.endTime <= draftTask.startTime) {
        showErrorDialog(
          "Error",
          "End date and time must be after start date and time"
        );
        return;
      }

      
      const timeDifference =
        draftTask.endTime.getTime() - draftTask.startTime.getTime();
      const minDuration = 15 * 60 * 1000; 
      const maxDuration = 365 * 24 * 60 * 60 * 1000; 

      
      if (timeDifference < minDuration) {
        showErrorDialog("Error", "Task duration must be at least 15 minutes");
        return;
      }

      if (timeDifference > maxDuration) {
        showErrorDialog("Error", "Task duration cannot exceed 1 year");
        return;
      }
    }

    setCreatingTaskId(draftTask.id);

    try {
      
      
      
      const localStartDate = new Date(draftTask.startTime);
      const localEndDate = draftTask.endTime ? new Date(draftTask.endTime) : null;
      
      
      const taskDate = localStartDate.getFullYear() + '-' + 
        String(localStartDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(localStartDate.getDate()).padStart(2, '0');
      
      
      const taskPayload = {
        title: draftTask.title.trim(),
        description: draftTask.description ? draftTask.description.trim() : "", 
        startTime: draftTask.startTime.toISOString(), 
        endTime: draftTask.endTime ? draftTask.endTime.toISOString() : null, 
        projectId: projectId,
        assignedToUserId: draftTask.assignedToUserId || null,
        priority: draftTask.priority || null,
      };

      console.log('=== Task Creation Debug ===');
      console.log('Original Start Time:', draftTask.startTime.toLocaleString());
      console.log('Local Start Date:', localStartDate.toLocaleDateString());
      console.log('Task Date (YYYY-MM-DD):', taskDate);
      console.log('Task Payload Being Sent:', taskPayload);
      console.log('=== End Task Creation Debug ===');

      const result = await dispatch(createNewTask(taskPayload));
      
      if (createNewTask.fulfilled.match(result)) {
        
        
        removeDraftTask(draftTask.id);

        Toast.show({
          type: 'success',
          text1: 'Task Created Successfully!',
          text2: 'Your new task has been added to the project',
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });
      } else {
        
        const errorMessage = result.payload || 'Failed to create task. Please try again.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error creating task:", error);

      let errorMessage = "Failed to create task. Please try again.";

      
      if (error.response?.data?.message) {
        
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(", ");
        } else {
          errorMessage = String(error.response.data.message);
        }
      } else if (error.message) {
        errorMessage = String(error.message);
      }

      Toast.show({
        type: 'error',
        text1: 'Task Creation Failed',
        text2: errorMessage,
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    } finally {
      setCreatingTaskId(null);
    }
  };

  const loadProjectData = async (isRefresh = false) => {
    try {
      if (!projectId) {
        console.error("ViewAllTasksScreen - No projectId provided");
        return;
      }

      dispatch(setCurrentProjectId(projectId));

      
      if (!isRefresh && (!tasks || tasks.length === 0)) {
        setInitialLoading(true);
      }

      
      await dispatch(
        fetchTasksByProjectId(
          isRefresh ? { projectId, forceRefresh: true } : projectId
        )
      );

      setProject({
        id: projectId,
        name: projectName || "Project",
      });

      if (isRefresh) {
        setSearchTerm("");
        setFiltersApplied(false);
        setSelectedFilters({
          createdAt: null,
          assignedTo: null,
          upcoming: null,
          status: null,
        });
      }
    } catch (err) {
      console.error("ViewAllTasksScreen - Error loading project data:", err);
    } finally {
      if (!isRefresh) {
        setInitialLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      
      if (filtersApplied) {
        console.log('ViewAllTasksScreen - Refreshing with applied filters (calling API):', selectedFilters);
        await handleApplyFilters(selectedFilters);
      } else {
        console.log('ViewAllTasksScreen - Refreshing with getTaskByProjectId API call (no filters applied)');
        await loadProjectData(true); 
      }
    } catch (error) {
      console.error('ViewAllTasksScreen - Error during refresh:', error);
      
      console.log('ViewAllTasksScreen - Fallback: Refreshing with getTaskByProjectId API call');
      await loadProjectData(true); 
    }
    
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
    const firstName = assignedTo.first_name || assignedTo.firstName || "";
    const lastName = assignedTo.last_name || assignedTo.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName && assignedTo.email) {
      return assignedTo.email;
    }
    return fullName || "Unassigned";
  };

  const getPriorityMeta = (priority) => {
    const value = String(priority || "medium").toLowerCase();
    if (value === "critical") {
      return { label: "Critical", color: "#B91C1C", bg: "#FEE2E2" };
    }
    if (value === "high") {
      return { label: "High", color: "#C05621", bg: "#FFF1E8" };
    }
    if (value === "low") {
      return { label: "Low", color: "#1B7A4A", bg: "#E8F8EF" };
    }
    return { label: "Medium", color: "#2563EB", bg: "#E8F1FF" };
  };

  const formatCardDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "No date";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  
  const allTasks = [...draftTasks, ...filteredTasks];

  const handleUpdate = (task) => {
    
    if (userRole === "Employee") {
      showErrorDialog("Access Denied", "Employees cannot update tasks.");
      return;
    }

    setSelectedTask(task);
    setUpdateTaskModalVisible(true);
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

    
    setTaskToDelete(task);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    const taskId = taskToDelete.id;
    const taskTitle = taskToDelete.title;

    
    setDeleteDialogVisible(false);
    setTaskToDelete(null);

    try {
      const result = await dispatch(deleteExistingTask(taskId));
      
      if (deleteExistingTask.fulfilled.match(result)) {
        
        
        if (filtersApplied) {
          setFilteredTasks(prevFilteredTasks => 
            prevFilteredTasks.filter(task => task.id !== taskId)
          );
        }
        
        Toast.show({
          type: 'success',
          text1: 'Task Deleted Successfully!',
          text2: 'The task has been permanently removed',
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });
      } else {
        
        const errorMessage = result.payload || "Failed to delete task. Please try again.";
        Toast.show({
          type: 'error',
          text1: 'Delete Failed',
          text2: errorMessage,
          visibilityTime: 4000,
          autoHide: true,
          topOffset: 80,
        });
      }
    } catch (error) {
      console.error("ViewAllTasksScreen - Error deleting task:", error);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: "An unexpected error occurred",
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    setTaskToDelete(null);
  };

  const handleUpdateTaskSuccess = (updatedTask) => {
    setUpdateTaskModalVisible(false);
    setSelectedTask(null);
    
    
    if (filtersApplied && updatedTask) {
      setFilteredTasks(prevFilteredTasks => 
        prevFilteredTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      );
    }
    
  };

  const handleUpdateTaskClose = () => {
    setUpdateTaskModalVisible(false);
    setSelectedTask(null);
  };

  const handleClearFilters = async () => {
    console.log('ViewAllTasksScreen - Clearing all filters');
    setFiltersApplied(false);
    setSelectedFilters({
      createdAt: null, 
      assignedTo: null, 
      upcoming: null, 
      status: null 
    });
    await loadProjectData();
  };

  const handleApplyFilters = async (filters, preFilteredTasks = null) => {
    console.log('Applied filters:', filters);
    
    try {
      setInitialLoading(true);
      dispatch(clearError()); 

      if (!projectId) {
        console.error('ViewAllTasksScreen - No projectId available for filtering');
        showErrorDialog('Error', 'Project ID is required for filtering');
        return;
      }

      
      if (preFilteredTasks) {
        
        console.log('Using pre-filtered tasks from FilterModal');
        setFilteredTasks(preFilteredTasks || []);
      } else {
        
        console.log('Calling filterTask service directly');
        const backendFilteredTasks = await filterTask(filters, projectId);
        setFilteredTasks(backendFilteredTasks || []);
      }

      setFiltersApplied(true);
      setSelectedFilters(filters);

      
      setSearchTerm("");
      
    } catch (err) {
      console.error('ViewAllTasksScreen - Error applying filters:', err);
      showErrorDialog('Error', 'Failed to apply filters. Please try again.');
    } finally {
      setInitialLoading(false);
    }
  };

  const formatDraftDateTime = (value) => {
    if (!value) return "";
    const d = value.getDate().toString().padStart(2, "0");
    const m = (value.getMonth() + 1).toString().padStart(2, "0");
    const y = value.getFullYear();
    const time = value.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${d}/${m}/${y} ${time}`;
  };

  const renderTaskCard = React.useCallback((task) => {
    
    if (task.isDraft) {
      const priorityOpen = priorityDraftId === task.id;

      return (
        <View
          style={[
            draftCardStyles.card,
            priorityOpen && draftCardStyles.cardOpen,
          ]}
        >
          <View style={draftCardStyles.fieldRow}>
            <Text style={draftCardStyles.label}>Title</Text>
            <TextInput
              style={draftCardStyles.input}
              placeholder="Enter task title..."
              placeholderTextColor="#9CA3AF"
              value={task.title}
              onChangeText={(text) => updateDraftTask(task.id, "title", text)}
              onFocus={() => setPriorityDraftId(null)}
            />
            <TouchableOpacity
              style={draftCardStyles.trashBtn}
              onPress={() => removeDraftTask(task.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={12} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={draftCardStyles.fieldRow}>
            <Text style={draftCardStyles.label}>Desc</Text>
            <TextInput
              style={draftCardStyles.input}
              placeholder="Description (optional)"
              placeholderTextColor="#9CA3AF"
              value={task.description}
              onChangeText={(text) =>
                updateDraftTask(task.id, "description", text.slice(0, 500))
              }
              onFocus={() => setPriorityDraftId(null)}
            />
          </View>

          <View
            style={[
              draftCardStyles.fieldRow,
              priorityOpen && draftCardStyles.fieldRowOpen,
            ]}
          >
            <Text style={draftCardStyles.label}>Priority</Text>
            <PriorityDropdown
              value={task.priority || "low"}
              options={priorityOptions}
              open={priorityOpen}
              onOpenChange={(next) =>
                setPriorityDraftId(next ? task.id : null)
              }
              onChange={(next) => {
                updateDraftTask(task.id, "priority", next);
                setPriorityDraftId(null);
              }}
              style={draftCardStyles.priorityDropdown}
            />
          </View>

          <View style={draftCardStyles.fieldRow}>
            <Text style={draftCardStyles.label}>Dates</Text>
            <TouchableOpacity
              style={[draftCardStyles.input, draftCardStyles.dateHalf]}
              onPress={() => {
                Keyboard.dismiss();
                setPriorityDraftId(null);
                setActiveDraftId(task.id);
                setDatePickerValue(task.startTime);
                setIsDateConfirmed(false);
                setShowStartDatePicker(true);
              }}
            >
              <Text style={draftCardStyles.inputText} numberOfLines={1}>
                {formatDraftDateTime(task.startTime)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[draftCardStyles.input, draftCardStyles.dateHalf]}
              onPress={() => {
                Keyboard.dismiss();
                setPriorityDraftId(null);
                setActiveDraftId(task.id);
                setDatePickerValue(task.endTime || task.startTime);
                setIsDateConfirmed(false);
                setShowEndDatePicker(true);
              }}
            >
              <Text
                style={[
                  draftCardStyles.inputText,
                  !task.endTime && { color: "#9CA3AF", fontWeight: "400" },
                ]}
                numberOfLines={1}
              >
                {task.endTime
                  ? formatDraftDateTime(task.endTime)
                  : "End date"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              draftCardStyles.createBtn,
              creatingTaskId === task.id && { opacity: 0.6 },
            ]}
            onPress={() => handleCreateTaskFromDraft(task)}
            disabled={creatingTaskId === task.id}
            activeOpacity={0.85}
          >
            {creatingTaskId === task.id ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={draftCardStyles.createBtnText}>Create Task</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    
    return (
      <TaskListCard
        task={task}
        projectName={projectName}
        onPress={() => navigation.navigate("TaskDetails", { task })}
        showMenu={userRole !== "Employee"}
        onEdit={() => handleUpdate(task)}
        onDelete={() => handleDelete(task)}
      />
    );
  }, [creatingTaskId, priorityDraftId, userRole, updateDraftTask, removeDraftTask, handleCreateTaskFromDraft, navigation, handleUpdate, handleDelete, projectName]);

  const renderContent = () => (
    <FlatList
      data={allTasks}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingBottom: 100,
        flexGrow: 1,
      }}
      
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={() => {
        Keyboard.dismiss();
        setPriorityDraftId(null);
      }}
      scrollEnabled
      
      removeClippedSubviews={false}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={8}
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
          filtersActive={filtersApplied}
        />
      }
      ListHeaderComponentStyle={{ marginHorizontal: -20 }}
      ListEmptyComponent={() => (
        <View className="flex-1 justify-center items-center p-5 min-h-[400px]">
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
            <View style={taskCardStyles.emptyState}>
              <View style={taskCardStyles.emptyIconWrap}>
                <Ionicons name="checkbox-outline" size={36} color={Brand.inkFaint} />
              </View>
              <Text style={taskCardStyles.emptyTitle}>
                {searchTerm.trim() !== ""
                  ? "No tasks match your search"
                  : "No task assigned"}
              </Text>
              <Text style={taskCardStyles.emptySubtitle}>
                {searchTerm.trim() !== ""
                  ? "Try a different search term"
                  : "Tasks for this project will show up here"}
              </Text>
            </View>
          )}
        </View>
      )}
      renderItem={({ item }) => renderTaskCard(item)}
    />
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />

      
      {initialLoading || loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-4 text-base text-gray-500">Loading tasks...</Text>
        </View>
      ) : (
        <View className="flex-1 bg-white">{renderContent()}</View>
      )}

      
      {!updateTaskModalVisible && <HomeBottomNav onAddPress={handleFabPress} />}

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={() => setSidebarVisible(false)}
      />

      
      {showStartDatePicker && (
        <DateTimePicker
          value={datePickerValue}
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
          minimumDate={
            activeDraftId
              ? (() => {
                  const currentDraft = draftTasks.find((draft) => draft.id === activeDraftId);
                  if (currentDraft) {
                    const draftDate = new Date(currentDraft.startTime);
                    const today = new Date();
                    
                    if (draftDate.toDateString() === today.toDateString()) {
                      return today;
                    }
                  }
                  return undefined;
                })()
              : undefined
          }
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={datePickerValue}
          mode="date"
          onChange={handleEndDateChange}
          minimumDate={new Date()}
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
          minimumDate={
            activeDraftId
              ? (() => {
                  const currentDraft = draftTasks.find((draft) => draft.id === activeDraftId);
                  if (currentDraft) {
                    const draftDate = new Date(currentDraft.endTime || currentDraft.startTime);
                    const today = new Date();
                    
                    if (draftDate.toDateString() === today.toDateString()) {
                      return today;
                    }
                  }
                  return undefined;
                })()
              : undefined
          }
        />
      )}

      
      {userRole !== "Employee" && (
        <UpdateTaskModal
          visible={updateTaskModalVisible}
          task={selectedTask}
          projectId={projectId}
          projectName={projectName}
          onClose={handleUpdateTaskClose}
          onSuccess={handleUpdateTaskSuccess}
        />
      )}

      
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        projectId={projectId}
      />

      <Modal
        visible={deleteDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            width: '100%',
            maxWidth: 320,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
          }}>
            <View style={{
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Ionicons name="trash-outline" size={24} color="#111827" />
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#1F2937',
                textAlign: 'center',
                marginBottom: 4,
              }}>
                Delete Task
              </Text>
            </View>

            <Text style={{
              fontSize: 15,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 16,
            }}>
              Are you sure you want to delete{' '}
              <Text style={{ fontWeight: '600', color: '#1F2937' }}>
                "{taskToDelete?.title}"
              </Text>
              {' '}permanently?
            </Text>
            
            <Text style={{
              fontSize: 13,
              color: '#6B7280',
              textAlign: 'center',
              fontWeight: '500',
              marginBottom: 20,
            }}>
              This action cannot be undone.
            </Text>

            <View style={{
              flexDirection: 'row',
              gap: 10,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={cancelDelete}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#374151',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: 'black',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: 'white',
                }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pastTimeDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPastTimeDialogVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            width: '100%',
            maxWidth: 320,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
          }}>
            <View style={{
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Ionicons name="time" size={24} color="#111827" />
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#1F2937',
                textAlign: 'center',
                marginBottom: 4,
              }}>
                Invalid Time
              </Text>
            </View>

            <Text style={{
              fontSize: 15,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 20,
            }}>
              Start time must be in the future. Please choose a future time.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: 'black',
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
              }}
              onPress={() => setPastTimeDialogVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={{
                fontSize: 15,
                fontWeight: '600',
                color: 'white',
              }}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ErrorDialog
        visible={errorDialog.visible}
        onClose={closeErrorDialog}
        title={errorDialog.title}
        message={errorDialog.message}
      />
    </View>
  );
}

const taskCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Brand.paper,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    shadowColor: Brand.ink,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardPressArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    minWidth: 0,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMain: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Brand.ink,
    letterSpacing: -0.2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 13,
    color: Brand.inkMuted,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    color: Brand.inkFaint,
    fontWeight: "500",
    flexShrink: 1,
  },
  metaDot: {
    marginHorizontal: 6,
    color: Brand.inkFaint,
  },
  menuBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Brand.paperSoft,
  },
  menuDropdown: {
    backgroundColor: Brand.paper,
    borderRadius: 12,
    paddingVertical: 4,
    width: 148,
    borderWidth: 1,
    borderColor: Brand.line,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  menuItem: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  menuItemInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  menuItemText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    color: Brand.ink,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.paperSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Brand.ink,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: Brand.inkMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});

const draftCardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 8,
    overflow: "visible",
    zIndex: 1,
  },
  cardOpen: {
    zIndex: 50,
    elevation: 50,
  },
  fieldRowOpen: {
    zIndex: 60,
    elevation: 60,
  },
  trashBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 6,
  },
  label: {
    width: 58,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    fontSize: 14,
    color: "#111827",
    minHeight: 36,
  },
  dateHalf: {
    flex: 1,
    justifyContent: "center",
  },
  priorityDropdown: {
    flex: 1,
  },
  inputText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  createBtn: {
    marginTop: 4,
    backgroundColor: "#111827",
    borderRadius: 8,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ViewAllTasksScreen;
