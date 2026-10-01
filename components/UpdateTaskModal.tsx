// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import NoChangesDialog from "./NoChangesDialog";
import ErrorDialog from "./ErrorDialog";
import DateTimePicker from "@react-native-community/datetimepicker";
import DropDownPicker from "react-native-dropdown-picker";

import { useDispatch, useSelector } from "react-redux";
import {
  updateExistingTask,
  selectTaskUpdating,
  selectTaskUpdateError,
} from "../store/slices/taskSlice";
import { addNotification } from "../store/slices/notificationSlice";
import { getEmployeesToAssignTask } from "../services/employees/getEmployeesOfTheCompany";
import { taskAssignement } from "../services/inAppNotification/taskAssignement";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function UpdateTaskModal({
  visible,
  onClose,
  task,
  projectId,
  projectName,
  onSuccess,
}) {
  console.log("🔍 UpdateTaskModal - Navigation Params Received:");
  console.log("📱 Project ID:", projectId);
  console.log("📝 Project Name:", projectName);
  console.log("📋 Task:", task);

  const dispatch = useDispatch();
  const updating = useSelector(selectTaskUpdating);
  const updateError = useSelector(selectTaskUpdateError);

  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    assignedTo: null,
    priority: null,
  });
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [showAssignedDropdown, setShowAssignedDropdown] = useState(false);
  const [isDropdownInteracting, setIsDropdownInteracting] = useState(false);
  const [noChangesDialogVisible, setNoChangesDialogVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityOptions] = useState([
    { id: "low", label: "Low", color: "#10B981" },
    { id: "medium", label: "Medium", color: "#F59E0B" },
    { id: "high", label: "High", color: "#EF4444" },
    { id: "critical", label: "Critical", color: "#EF4444" },
  ]);

  const [errorDialog, setErrorDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    if (task) {
      setTaskData({
        title: task.title || "",
        description: task.description || "",
        assignedTo: task.assigned_to || task.assignedTo || null,
        priority: task.priority || null,
      });

      if (task.startTime) {
        setStartDateTime(new Date(task.startTime));
      }

      if (task.endTime) {
        setEndDateTime(new Date(task.endTime));
      } else {
        setEndDateTime(null);
      }
    }

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [task]);

  useEffect(() => {
    if (visible) {
      loadEmployees();
    }
  }, [visible]);

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

  const showErrorDialog = (title, message) => {
    setErrorDialog({
      visible: true,
      title: title,
      message: message,
    });
  };

  const closeErrorDialog = () => {
    setErrorDialog({
      visible: false,
      title: "",
      message: "",
    });
  };

  const handleEmployeeSearch = (text) => {
    setSearchQuery(text);

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

  const openDropdown = (dropdownType) => {
    setShowAssignedDropdown(false);
    setPriorityOpen(false);

    if (dropdownType === "priority") {
      setPriorityOpen(true);
    } else if (dropdownType === "assigned") {
      setShowAssignedDropdown(true);
    }
  };

  const closeAllDropdowns = () => {
    setShowAssignedDropdown(false);
    setPriorityOpen(false);
    setIsDropdownInteracting(false);
    setIsSearching(false);
  };

  const handleInputChange = (field, value) => {
    setTaskData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(startDateTime.getHours());
      newDate.setMinutes(startDateTime.getMinutes());
      setStartDateTime(newDate);

      if (newDate > endDateTime) {
        setEndDateTime(newDate);
      }
    }
  };

  const handleStartTimeChange = (event, selectedDate) => {
    setShowStartTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(startDateTime);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());

      const now = new Date();
      const isToday = newDate.toDateString() === now.toDateString();

      if (isToday && newDate < now) {
        showErrorDialog(
          "Invalid Time",
          "You cannot select a time in the past for today. Please choose a future time."
        );
        return;
      }

      setStartDateTime(newDate);

      if (endDateTime && newDate > endDateTime) {
        setEndDateTime(newDate);
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);

    if (event.type === "set" && selectedDate) {
      const newDate = new Date(selectedDate);

      if (endDateTime) {
        newDate.setHours(endDateTime.getHours());
        newDate.setMinutes(endDateTime.getMinutes());
        newDate.setSeconds(endDateTime.getSeconds());
      } else {
        newDate.setHours(23);
        newDate.setMinutes(59);
        newDate.setSeconds(0);
      }
      setEndDateTime(newDate);
    }
  };

  const handleEndTimeChange = (event, selectedDate) => {
    setShowEndTimePicker(false);

    if (event.type === "set" && selectedDate) {
      if (endDateTime) {
        const newDate = new Date(endDateTime);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);

        const now = new Date();
        const isToday = newDate.toDateString() === now.toDateString();

        if (isToday && newDate < now) {
          showErrorDialog(
            "Invalid Time",
            "You cannot select a time in the past for today. Please choose a future time."
          );
          return;
        }

        if (newDate >= startDateTime) {
          setEndDateTime(newDate);
        } else {
          showErrorDialog(
            "Invalid End Time",
            "End time must be after start time. Please choose a later time."
          );
        }
      } else {
        const newDate = new Date(startDateTime);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);

        const now = new Date();
        const isToday = newDate.toDateString() === now.toDateString();

        if (isToday && newDate < now) {
          showErrorDialog(
            "Invalid Time",
            "You cannot select a time in the past for today. Please choose a future time."
          );
          return;
        }

        setEndDateTime(newDate);
      }
    }
  };

  const handleUpdateTask = async () => {
    if (!taskData.title.trim()) {
      showErrorDialog("Validation Error", "Task title is required");
      return;
    }

    if (!task?.id) {
      showErrorDialog(
        "Validation Error",
        "Task ID is required to update a task"
      );
      return;
    }

    if (endDateTime && endDateTime < startDateTime) {
      showErrorDialog(
        "Time Validation Error",
        "End time cannot be before start time. Please adjust your dates."
      );
      return;
    }

    const originalTask = {
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo || null,
      priority: task.priority || null,
      startTime: task.startTime ? new Date(task.startTime) : new Date(),
      endTime: task.endTime ? new Date(task.endTime) : null,
    };

    const currentTask = {
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : "",
      assignedTo: taskData.assignedTo,
      priority: taskData.priority,
      startTime: startDateTime,
      endTime: endDateTime,
    };

    const taskPayload = {};

    if (originalTask.title !== currentTask.title) {
      taskPayload.title = currentTask.title;
    }

    if (originalTask.description !== currentTask.description) {
      taskPayload.description = currentTask.description;
    }

    if (originalTask.assignedTo?.id !== currentTask.assignedTo?.id) {
      taskPayload.assignedToUserId = currentTask.assignedTo?.id || null;
    }

    if (originalTask.priority !== currentTask.priority) {
      taskPayload.priority = currentTask.priority;
    }

    const formatWithTimezone = (date) => {
      const timezoneOffset = date.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
      const offsetMinutes = Math.abs(timezoneOffset) % 60;
      const offsetSign = timezoneOffset <= 0 ? "+" : "-";
      const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

      const isoString = date
        .toLocaleString("sv-SE", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          fractionalSecondDigits: 3,
        })
        .replace(" ", "T");

      return `${isoString}${timezoneString}`;
    };

    if (originalTask.startTime.getTime() !== currentTask.startTime.getTime()) {
      taskPayload.startTime = formatWithTimezone(currentTask.startTime);
    }

    const originalEndTime = originalTask.endTime?.getTime() || null;
    const currentEndTime = currentTask.endTime?.getTime() || null;

    if (originalEndTime !== currentEndTime) {
      taskPayload.endTime = currentTask.endTime
        ? formatWithTimezone(currentTask.endTime)
        : null;
    }

    const hasChanges = Object.keys(taskPayload).length > 0;

    if (!hasChanges) {
      setNoChangesDialogVisible(true);
      return;
    }

    taskPayload.projectId = projectId;

    try {
      const result = await dispatch(
        updateExistingTask({ taskId: task.id, taskData: taskPayload })
      );

      if (updateExistingTask.fulfilled.match(result)) {
        if (originalTask.assignedTo?.id !== currentTask.assignedTo?.id) {
          try {
            const currentUserId = await AsyncStorage.getItem("userId");
            const currentUserFirstName =
              await AsyncStorage.getItem("userFirstName");
            const currentUserLastName =
              await AsyncStorage.getItem("userLastName");
            const currentUserName =
              `${currentUserFirstName || ""} ${currentUserLastName || ""}`.trim() ||
              "Unknown User";

            if (currentTask.assignedTo?.id) {
              const newAssigneeNotification = {
                type: "task_assignment",
                title: "New Task Assigned",
                message: `You have been assigned a new task: ${currentTask.title}`,
                taskId: task.id,
                projectId: projectId,
                fromUserId: currentUserId,
                fromUserName: currentUserName,
                assignedToUserId: Number(currentTask.assignedTo.id),
                priority: currentTask.priority || "medium",
              };

              console.log(
                "🔔 NEW ASSIGNEE NOTIFICATION BEING STORED IN REDUX:",
                newAssigneeNotification
              );
              dispatch(addNotification(newAssigneeNotification));

              try {
                const apiNotificationData = {
                  title: "New Task Assigned",
                  message: `You have been assigned a new task: ${task.title || task.name}`,
                  assignedToUserId: Number(currentTask.assignedTo.id),
                  fromUserName: currentUserName,
                  priority: currentTask.priority || "low",
                  projectName: projectName,
                  taskId: task.id,
                  taskName: task.title,
                };

                console.log(
                  "🔔 CALLING API FOR NEW ASSIGNEE NOTIFI-CATION:",
                  apiNotificationData
                );
                await taskAssignement(apiNotificationData);
                console.log("✅ API NOTIFICATION SENT SUCCESSFULLY");
              } catch (apiError) {
                console.error("❌ Error sending API notification:", apiError);
              }
            }
          } catch (error) {
            console.error("Error creating notifications:", error);
          }
        }

        Toast.show({
          type: "success",
          text1: "Task Updated Successfully!",
          text2: "Your task changes have been saved",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });

        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess(result.payload);
        }, 1000);
      } else {
        const errorMessage =
          result.payload || "Failed to update task. Please try again.";
        Toast.show({
          type: "error",
          text1: "Update Failed",
          text2: errorMessage,
          visibilityTime: 4000,
          autoHide: true,
          topOffset: 80,
        });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: "An unexpected error occurred",
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    closeAllDropdowns();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="bg-black px-4 py-3 flex-row items-center justify-between">
          <Text className="text-black text-[18px] font-semibold">
            Update Task
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View className="flex-1 p-5 items-center">
            <FlatList
              className="flex-1 w-full max-w-md"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!isDropdownInteracting || isSearching}
              data={[{ key: "form" }]}
              renderItem={() => (
                <View>
                  <View className="mb-8 items-center">
                    <Text className="text-[28px] font-bold text-[#333]">
                      Update Task
                    </Text>
                    <Text className="text-[16px] text-[#666] text-center">
                      Modify the task details below
                    </Text>
                  </View>

                  <View className="mb-5">
                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="document-text"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Task Title
                        </Text>
                      </View>
                      <TextInput
                        className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                        placeholder="Enter task title"
                        value={taskData.title}
                        onChangeText={(value) =>
                          handleInputChange("title", value)
                        }
                        placeholderTextColor="#999"
                        returnKeyType="next"
                      />
                    </View>

                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="chatbubble-ellipses"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Description
                        </Text>
                      </View>
                      <TextInput
                        className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                        placeholder="Describe your task"
                        value={taskData.description}
                        onChangeText={(value) =>
                          handleInputChange("description", value)
                        }
                        multiline
                        numberOfLines={4}
                        placeholderTextColor="#999"
                        returnKeyType="next"
                        style={{ textAlignVertical: "top" }}
                      />
                    </View>

                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="person"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Assigned To
                        </Text>
                      </View>
                      <DropDownPicker
                        open={showAssignedDropdown}
                        value={taskData.assignedTo?.id || null}
                        items={filteredEmployees.map((employee) => {
                          const fullName =
                            `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
                          let displayName = fullName
                            ? `${fullName} - ${employee.email}`
                            : employee.email;

                          if (displayName.length > 40) {
                            displayName = displayName.substring(0, 37) + "...";
                          }

                          return {
                            label: displayName,
                            value: employee.id,
                          };
                        })}
                        setOpen={(open) => {
                          if (open) {
                            setPriorityOpen(false);
                            setIsDropdownInteracting(true);
                            setIsSearching(false);
                          } else {
                            setIsDropdownInteracting(false);
                            setIsSearching(false);
                          }
                          setShowAssignedDropdown(open);
                        }}
                        setValue={(callback) => {
                          const newValue = callback(
                            taskData.assignedTo?.id || null
                          );
                          const selectedEmployee = employees.find(
                            (emp) => emp.id === newValue
                          );
                          handleInputChange(
                            "assignedTo",
                            selectedEmployee || null
                          );
                        }}
                        placeholder="Select Employee"
                        placeholderStyle={{
                          color: "#9ca3af",
                          fontSize: 16,
                          fontWeight: "400",
                        }}
                        style={{
                          backgroundColor: "#f8f9fa",
                          borderColor: "#e1e8ed",
                          borderRadius: 8,
                          minHeight: 0,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                        }}
                        textStyle={{
                          fontSize: 16,
                          color: taskData.assignedTo ? "#333" : "#9ca3af",
                          fontWeight: "400",
                        }}
                        labelProps={{
                          numberOfLines: 1,
                        }}
                        customItemContainerStyle={{
                          height: 40,
                        }}
                        customItemLabelStyle={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#333",
                        }}
                        dropDownContainerStyle={{
                          backgroundColor: "white",
                          borderColor: "#e5e7eb",
                          borderRadius: 8,
                          shadowColor: "#000",
                          shadowOpacity: 0.15,
                          shadowRadius: 6,
                          shadowOffset: { width: 0, height: 3 },
                          elevation: 999999,
                          maxHeight: 200,
                          zIndex: 999999,

                          ...(keyboardVisible && {
                            marginBottom: keyboardHeight - 50,
                          }),
                        }}
                        listMode="SCROLLVIEW"
                        scrollViewProps={{
                          nestedScrollEnabled: true,
                          showsVerticalScrollIndicator: true,
                          onScrollBeginDrag: () => {
                            setIsDropdownInteracting(true);
                          },
                          onScrollEndDrag: () => {
                            if (showAssignedDropdown) {
                              setIsDropdownInteracting(true);
                            }
                          },
                          scrollEventThrottle: 16,
                          onTouchStart: () => {
                            setIsDropdownInteracting(true);
                          },
                          onTouchEnd: () => {
                            if (!showAssignedDropdown) {
                              setIsDropdownInteracting(false);
                            }
                          },
                        }}
                        listItemContainerStyle={{
                          height: 40,
                          paddingHorizontal: 12,
                        }}
                        listItemLabelStyle={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#333",
                        }}
                        arrowIconStyle={{
                          width: 16,
                          height: 16,
                          tintColor: "#6b7280",
                        }}
                        showArrowIcon={true}
                        searchable={true}
                        searchPlaceholder="Search employees..."
                        searchTextInputStyle={{
                          borderColor: "#e5e7eb",
                          borderRadius: 6,
                          fontSize: 14,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                        }}
                        searchTextInputProps={{
                          placeholderTextColor: "#9ca3af",
                          returnKeyType: "search",
                          blurOnSubmit: false,
                          autoCorrect: false,
                          autoCapitalize: "none",
                          onFocus: () => {
                            setIsSearching(true);
                          },
                          onBlur: () => {
                            setIsSearching(false);
                          },
                        }}
                        onSearch={(text) => {
                          handleEmployeeSearch(text);
                        }}
                      />
                    </View>

                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="flag"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Priority
                        </Text>
                      </View>
                      <View style={{ zIndex: 9999 }}>
                        <DropDownPicker
                          open={priorityOpen}
                          value={taskData.priority || null}
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
                              openDropdown("priority");
                            } else {
                              setPriorityOpen(false);
                              setIsDropdownInteracting(false);
                            }
                          }}
                          setValue={(callback) => {
                            const newValue = callback(
                              taskData.priority || null
                            );
                            handleInputChange("priority", newValue);
                          }}
                          placeholder="Select Priority"
                          placeholderStyle={{
                            color: "#9ca3af",
                            fontSize: 16,
                            fontWeight: "400",
                          }}
                          style={{
                            backgroundColor: "#f8f9fa",
                            borderColor: "#e1e8ed",
                            borderRadius: 8,
                            minHeight: 0,
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                          }}
                          textStyle={{
                            fontSize: 16,
                            color: taskData.priority ? "#333" : "#9ca3af",
                            fontWeight: "400",
                          }}
                          dropDownContainerStyle={{
                            backgroundColor: "white",
                            borderColor: "#E5E7EB",
                            borderRadius: 12,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.15,
                            shadowRadius: 8,
                            elevation: 8,
                            maxHeight: 250,
                            zIndex: 1000,
                            borderWidth: 1,
                          }}
                          listMode="SCROLLVIEW"
                          scrollViewProps={{ nestedScrollEnabled: true }}
                          listItemContainerStyle={{
                            height: 40,
                            paddingHorizontal: 12,
                          }}
                          listItemLabelStyle={{
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#333",
                          }}
                          arrowIconStyle={{
                            width: 16,
                            height: 16,
                            tintColor: "#6b7280",
                          }}
                          showArrowIcon={true}
                        />
                      </View>
                    </View>

                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="time"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Start Date & Time
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                          onPress={() => setShowStartDatePicker(true)}
                        >
                          <Text className="text-[16px] text-[#333] font-medium">
                            {startDateTime.toLocaleDateString()}
                          </Text>
                          <Ionicons
                            name="calendar-outline"
                            size={16}
                            color="#666"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                          onPress={() => setShowStartTimePicker(true)}
                        >
                          <Text className="text-[16px] text-[#333] font-medium">
                            {startDateTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </Text>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#666"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ marginBottom: 30 }}>
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="calendar"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          End Date & Time
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                          onPress={() => setShowEndDatePicker(true)}
                        >
                          <Text className="text-[16px] text-[#333] font-medium">
                            {endDateTime
                              ? endDateTime.toLocaleDateString()
                              : "Not selected"}
                          </Text>
                          <Ionicons
                            name="calendar-outline"
                            size={16}
                            color="#666"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                          onPress={() => setShowEndTimePicker(true)}
                        >
                          <Text className="text-[16px] text-[#333] font-medium">
                            {endDateTime
                              ? endDateTime.toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "No time"}
                          </Text>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#666"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.key}
            />
          </View>
        </TouchableWithoutFeedback>

        <View className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-5 bg-transparent items-center">
          <TouchableOpacity
            className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
            onPress={handleUpdateTask}
            disabled={updating}
            activeOpacity={0.8}
          >
            {updating ? (
              <View className="flex-row items-center ">
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            ) : (
              <Text className="text-white text-[16px] font-semibold">
                Update Task
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {showStartDatePicker && (
          <DateTimePicker
            value={startDateTime}
            mode="date"
            onChange={handleStartDateChange}
            minimumDate={new Date()}
          />
        )}

        {showStartTimePicker && (
          <DateTimePicker
            value={startDateTime}
            mode="time"
            onChange={handleStartTimeChange}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDateTime || startDateTime}
            mode="date"
            onChange={handleEndDateChange}
            minimumDate={new Date()}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={endDateTime || startDateTime}
            mode="time"
            onChange={handleEndTimeChange}
          />
        )}

        <NoChangesDialog
          visible={noChangesDialogVisible}
          onClose={() => setNoChangesDialogVisible(false)}
        />

        <ErrorDialog
          visible={errorDialog.visible}
          onClose={closeErrorDialog}
          title={errorDialog.title}
          message={errorDialog.message}
        />
      </View>
    </Modal>
  );
}
