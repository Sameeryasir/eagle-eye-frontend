import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import DropDownPicker from "react-native-dropdown-picker";
import Toast from "react-native-toast-message";
import { useDispatch, useSelector } from "react-redux";
import {
  createNewTask,
  fetchEmployeesForTaskAssignment,
  selectTaskCreating,
  selectEmployeesForAssignment,
} from "../store/slices/taskSlice";
import { Brand } from "../constants/brandColors";
import { useResponsiveLayout } from "../constants/responsiveLayout";

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low", color: "#1B7A4A" },
  { id: "medium", label: "Medium", color: "#2563EB" },
  { id: "high", label: "High", color: "#C05621" },
  { id: "critical", label: "Critical", color: "#B91C1C" },
];

function CreateTask({ projectId, projectName, onSuccess, onCancel, navigation }) {
  const dispatch = useDispatch();
  const creating = useSelector(selectTaskCreating);
  const employees = useSelector(selectEmployeesForAssignment);
  const layout = useResponsiveLayout();
  const {
    width,
    height,
    insets,
    contentWidth,
    horizontalPad,
    titleSize,
    subtitleSize,
    bodySize,
    labelSize,
    captionSize,
    buttonTextSize,
    inputHeight,
    buttonPadY,
    fieldGap,
    radius,
    hitSize,
    isCompactHeight,
    isSmallPhone,
    isTablet,
    stackFields,
    rs,
  } = layout;

  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    assignedTo: null,
    priority: "medium",
  });
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(null);
  const [minStartTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  });
  const [focusedField, setFocusedField] = useState(null);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showAssignedDropdown, setShowAssignedDropdown] = useState(false);
  const [activePicker, setActivePicker] = useState(null);

  const sidePad = isTablet
    ? Math.max(horizontalPad, 40)
    : isSmallPhone
      ? 16
      : Math.min(horizontalPad, 20);
  const formWidth = isTablet ? contentWidth : Math.max(width - sidePad * 2, 0);
  const fieldRadius = Math.max(radius - 2, 8);
  const footerPadBottom = Math.max(insets.bottom, 14);
  const descHeight = rs(isCompactHeight ? 72 : 88);
  const dropdownMaxHeight = Math.min(
    rs(isCompactHeight ? 180 : 220),
    Math.round(height * 0.32)
  );
  // MODAL listMode avoids measureInWindow crashes inside parent Modal/ScrollView
  const listMode = "MODAL";
  const scheduleStacked = stackFields || isSmallPhone || width < 380;

  const dropdownShared = useMemo(
    () => ({
      style: {
        backgroundColor: Brand.paperSoft,
        borderColor: Brand.line,
        borderWidth: 1,
        borderRadius: fieldRadius,
        minHeight: inputHeight,
        paddingHorizontal: rs(12),
      },
      textStyle: {
        fontSize: bodySize - 1,
        color: Brand.ink,
        fontWeight: "500",
      },
      placeholderStyle: {
        color: Brand.inkFaint,
        fontSize: bodySize - 1,
        fontWeight: "500",
      },
      dropDownContainerStyle: {
        backgroundColor: Brand.paper,
        borderColor: Brand.line,
        borderWidth: 1,
        borderRadius: fieldRadius,
        maxHeight: dropdownMaxHeight,
        shadowColor: Brand.ink,
        shadowOpacity: 0.1,
        shadowRadius: rs(10),
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      },
      listItemContainerStyle: {
        minHeight: rs(isCompactHeight ? 42 : 46),
        paddingHorizontal: rs(12),
      },
      listItemLabelStyle: {
        fontSize: bodySize - 1,
        fontWeight: "500",
        color: Brand.ink,
      },
      selectedItemLabelStyle: {
        fontWeight: "700",
        color: Brand.ink,
      },
      searchContainerStyle: {
        borderBottomColor: Brand.line,
        paddingHorizontal: rs(8),
      },
      searchTextInputStyle: {
        borderColor: Brand.line,
        borderRadius: Math.max(fieldRadius - 2, 8),
        backgroundColor: Brand.paperSoft,
        fontSize: bodySize - 1,
        color: Brand.ink,
        minHeight: rs(40),
      },
      arrowIconStyle: {
        width: rs(16),
        height: rs(16),
        tintColor: Brand.inkMuted,
      },
      tickIconStyle: {
        width: rs(16),
        height: rs(16),
        tintColor: Brand.ink,
      },
      labelProps: { numberOfLines: 1 },
      listMode,
      scrollViewProps: {
        nestedScrollEnabled: true,
        showsVerticalScrollIndicator: true,
        keyboardShouldPersistTaps: "handled",
      },
      modalProps: {
        animationType: "slide",
        statusBarTranslucent: true,
        presentationStyle: "overFullScreen",
      },
      modalContentContainerStyle: {
        backgroundColor: Brand.paper,
        flex: 1,
        paddingTop: Math.max(insets.top, 12),
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: sidePad,
      },
      modalTitleStyle: {
        fontSize: rs(16),
        fontWeight: "700",
        color: Brand.ink,
      },
      closeAfterSelecting: true,
    }),
    [
      bodySize,
      dropdownMaxHeight,
      fieldRadius,
      inputHeight,
      insets.bottom,
      insets.top,
      isCompactHeight,
      listMode,
      rs,
      sidePad,
    ]
  );

  useEffect(() => {
    dispatch(fetchEmployeesForTaskAssignment());
  }, [dispatch]);

  useEffect(() => {
    if (employees && Array.isArray(employees)) {
      setFilteredEmployees(employees);
    }
  }, [employees]);

  const handleClose = () => {
    if (onCancel) onCancel();
    else if (navigation?.goBack) navigation.goBack();
  };

  const handleCancel = () => {
    const hasDraft =
      taskData.title.trim() ||
      taskData.description.trim() ||
      !!taskData.assignedTo ||
      !!endDateTime;

    if (!hasDraft) {
      handleClose();
      return;
    }

    Alert.alert("Discard task?", "Your entered details will be lost.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: handleClose },
    ]);
  };

  const handleInputChange = (field, value) => {
    setTaskData((prev) => ({ ...prev, [field]: value }));
  };

  const getEmployeeLabel = (emp) => {
    if (!emp) return "";
    const name = `${emp.first_name || emp.firstName || ""} ${
      emp.last_name || emp.lastName || ""
    }`.trim();
    return name || emp.email || `User ${emp.id}`;
  };

  const handleEmployeeSearch = (text) => {
    if (text.trim() === "") {
      setFilteredEmployees(employees);
      return;
    }
    const searchLower = text.toLowerCase().trim();
    setFilteredEmployees(
      (employees || []).filter((employee) => {
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
      })
    );
  };

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

  const handleCreateTask = async () => {
    if (!taskData.title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }
    if (minStartTime && startDateTime < minStartTime) {
      Alert.alert("Error", "Start time cannot be before now");
      return;
    }
    if (endDateTime) {
      if (endDateTime <= startDateTime) {
        Alert.alert(
          "Error",
          "End date and time must be after start date and time"
        );
        return;
      }
      const timeDifference = endDateTime.getTime() - startDateTime.getTime();
      if (timeDifference < 15 * 60 * 1000) {
        Alert.alert("Error", "Task duration must be at least 15 minutes");
        return;
      }
      if (timeDifference > 365 * 24 * 60 * 60 * 1000) {
        Alert.alert("Error", "Task duration cannot exceed 1 year");
        return;
      }
    }
    if (!projectId) {
      Alert.alert("Error", "Project ID is required to create a task");
      return;
    }

    try {
      const taskPayload = {
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        assignedToUserId: taskData.assignedTo?.id || null,
        priority: taskData.priority || null,
        startTime: formatWithTimezone(startDateTime),
        minStartTime: formatWithTimezone(minStartTime),
        endTime: endDateTime ? formatWithTimezone(endDateTime) : null,
        projectId,
      };

      const result = await dispatch(createNewTask(taskPayload));
      if (createNewTask.fulfilled.match(result)) {
        Toast.show({
          type: "success",
          text1: "Task Created Successfully!",
          text2: "Your task has been created and saved",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });
        if (onSuccess) onSuccess();
        else handleClose();
      } else {
        Alert.alert(
          "Error",
          result.payload || "Failed to create task. Please try again."
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  const applyPickerValue = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setActivePicker(null);
    }
    if (event?.type === "dismissed") {
      setActivePicker(null);
      return;
    }
    if (!selectedDate || !activePicker) return;

    if (activePicker === "startDate") {
      const next = new Date(selectedDate);
      next.setHours(startDateTime.getHours(), startDateTime.getMinutes(), 0, 0);
      setStartDateTime(next);
    } else if (activePicker === "startTime") {
      const next = new Date(startDateTime);
      next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setStartDateTime(next);
    } else if (activePicker === "endDate") {
      const next = new Date(selectedDate);
      if (endDateTime) {
        next.setHours(endDateTime.getHours(), endDateTime.getMinutes(), 0, 0);
      } else {
        next.setHours(23, 59, 0, 0);
      }
      setEndDateTime(next);
    } else if (activePicker === "endTime") {
      const next = endDateTime ? new Date(endDateTime) : new Date();
      next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setEndDateTime(next);
    }
  };

  const formatDisplayDate = (value) =>
    value.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatDisplayTime = (value) =>
    value.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const canSubmit = !!taskData.title?.trim() && !creating;

  const labelStyle = {
    fontSize: labelSize + 1,
    fontWeight: "600",
    color: Brand.inkSoft,
    marginBottom: rs(7),
    letterSpacing: 0.1,
  };

  const fieldShell = (field) => ({
    width: "100%",
    borderWidth: 1,
    borderColor: focusedField === field ? Brand.ink : Brand.line,
    backgroundColor: focusedField === field ? Brand.paper : Brand.paperSoft,
    borderRadius: fieldRadius,
  });

  const openPriority = (updater) => {
    setShowPriorityDropdown((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next) {
        Keyboard.dismiss();
        setShowAssignedDropdown(false);
      }
      return !!next;
    });
  };

  const openAssigned = (updater) => {
    setShowAssignedDropdown((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next) {
        Keyboard.dismiss();
        setShowPriorityDropdown(false);
      }
      return !!next;
    });
  };

  const pickerTitle =
    activePicker === "startDate"
      ? "Start date"
      : activePicker === "startTime"
        ? "Start time"
        : activePicker === "endDate"
          ? "End date"
          : "End time";

  const pickerMode =
    activePicker === "startTime" || activePicker === "endTime" ? "time" : "date";

  const pickerValue =
    activePicker === "endDate" || activePicker === "endTime"
      ? endDateTime || new Date()
      : startDateTime;

  const renderScheduleButton = (field, icon, label, onPress, muted = false) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        fieldShell(field),
        !scheduleStacked && styles.scheduleHalf,
        scheduleStacked && { width: "100%" },
        {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: rs(12),
          minHeight: inputHeight,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={rs(16)}
        color={Brand.inkMuted}
        style={{ marginRight: rs(8) }}
      />
      <Text
        style={{
          flex: 1,
          fontSize: bodySize - 1,
          fontWeight: "500",
          color: muted ? Brand.inkFaint : Brand.ink,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={rs(14)} color={Brand.inkFaint} />
    </TouchableOpacity>
  );

  const priorityItems = PRIORITY_OPTIONS.map((priority) => ({
    label: priority.label,
    value: priority.id,
    icon: () => (
      <View
        style={{
          width: rs(9),
          height: rs(9),
          borderRadius: rs(5),
          backgroundColor: priority.color,
          marginRight: rs(4),
        }}
      />
    ),
  }));

  const assigneeItems = (filteredEmployees?.length
    ? filteredEmployees
    : employees || []
  ).map((emp) => {
    let label = getEmployeeLabel(emp);
    if (emp.email && label !== emp.email && width < 400) {
      label = label.length > 28 ? `${label.slice(0, 25)}...` : label;
    } else if (emp.email && label !== emp.email) {
      label = `${label} · ${emp.email}`;
      if (label.length > 48) label = `${label.slice(0, 45)}...`;
    }
    return { label, value: emp.id };
  });

  return (
    <View style={[styles.root, { width }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View
          style={{
            width: "100%",
            paddingTop: Math.max(insets.top, 8),
            paddingHorizontal: sidePad,
            paddingBottom: rs(4),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: Brand.line,
          }}
        >
          <TouchableOpacity
            onPress={handleCancel}
            style={{
              minWidth: hitSize,
              height: hitSize,
              alignItems: "flex-start",
              justifyContent: "center",
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: bodySize,
                fontWeight: "500",
                color: Brand.inkMuted,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: rs(16),
              fontWeight: "700",
              color: Brand.ink,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            New task
          </Text>

          <TouchableOpacity
            onPress={handleCreateTask}
            disabled={!canSubmit}
            style={{
              minWidth: hitSize,
              height: hitSize,
              alignItems: "flex-end",
              justifyContent: "center",
              opacity: canSubmit ? 1 : 0.35,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            {creating ? (
              <ActivityIndicator size="small" color={Brand.ink} />
            ) : (
              <Text
                style={{
                  fontSize: bodySize,
                  fontWeight: "700",
                  color: Brand.ink,
                }}
              >
                Create
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            width: "100%",
            paddingHorizontal: sidePad,
            paddingTop: isCompactHeight ? rs(16) : rs(24),
            paddingBottom: rs(28) + footerPadBottom,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >
          <View
            style={{
              width: formWidth,
              maxWidth: "100%",
              alignSelf: "center",
            }}
          >
            <Text
              style={{
                fontSize: isSmallPhone
                  ? rs(22)
                  : Math.min(titleSize - 2, rs(26)),
                fontWeight: "700",
                color: Brand.ink,
                letterSpacing: -0.35,
                marginBottom: rs(6),
              }}
            >
              Task details
            </Text>
            <Text
              style={{
                fontSize: subtitleSize,
                color: Brand.inkMuted,
                lineHeight: subtitleSize * 1.4,
                marginBottom: isCompactHeight ? rs(18) : rs(26),
              }}
            >
              {projectName
                ? `Add title, priority, and schedule for ${projectName}.`
                : "Add a title, priority, assignee, and schedule."}
            </Text>

            <View style={{ marginBottom: fieldGap + 4, width: "100%" }}>
              <Text style={labelStyle}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  fieldShell("title"),
                  {
                    paddingHorizontal: rs(14),
                    minHeight: inputHeight,
                    fontSize: bodySize,
                    color: Brand.ink,
                    paddingVertical: Platform.OS === "ios" ? rs(13) : rs(10),
                  },
                ]}
                placeholder="What needs to be done?"
                value={taskData.title}
                onChangeText={(value) => handleInputChange("title", value)}
                placeholderTextColor={Brand.inkFaint}
                returnKeyType="next"
                onFocus={() => {
                  setFocusedField("title");
                  setShowPriorityDropdown(false);
                  setShowAssignedDropdown(false);
                }}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={{ marginBottom: fieldGap + 4, width: "100%" }}>
              <Text style={labelStyle}>Description</Text>
              <TextInput
                style={[
                  fieldShell("description"),
                  {
                    paddingHorizontal: rs(14),
                    paddingTop: rs(10),
                    paddingBottom: rs(10),
                    height: descHeight,
                    fontSize: bodySize,
                    color: Brand.ink,
                    lineHeight: bodySize * 1.35,
                    textAlignVertical: "top",
                  },
                ]}
                placeholder="Notes for the crew (optional)"
                value={taskData.description}
                onChangeText={(value) =>
                  handleInputChange("description", value)
                }
                multiline
                numberOfLines={3}
                placeholderTextColor={Brand.inkFaint}
                onFocus={() => {
                  setFocusedField("description");
                  setShowPriorityDropdown(false);
                  setShowAssignedDropdown(false);
                }}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View
              style={{
                marginBottom: fieldGap + 4,
                width: "100%",
                zIndex: showPriorityDropdown ? 6000 : 2,
                elevation: showPriorityDropdown ? 12 : 0,
              }}
            >
              <Text style={labelStyle}>Priority</Text>
              <DropDownPicker
                open={showPriorityDropdown}
                value={taskData.priority}
                items={priorityItems}
                setOpen={openPriority}
                setValue={(updater) => {
                  const next =
                    typeof updater === "function"
                      ? updater(taskData.priority)
                      : updater;
                  handleInputChange("priority", next);
                }}
                placeholder="Select priority"
                placeholderStyle={dropdownShared.placeholderStyle}
                style={dropdownShared.style}
                textStyle={dropdownShared.textStyle}
                dropDownContainerStyle={dropdownShared.dropDownContainerStyle}
                listItemContainerStyle={dropdownShared.listItemContainerStyle}
                listItemLabelStyle={dropdownShared.listItemLabelStyle}
                selectedItemLabelStyle={dropdownShared.selectedItemLabelStyle}
                arrowIconStyle={dropdownShared.arrowIconStyle}
                tickIconStyle={dropdownShared.tickIconStyle}
                labelProps={dropdownShared.labelProps}
                listMode={dropdownShared.listMode}
                scrollViewProps={dropdownShared.scrollViewProps}
                modalProps={dropdownShared.modalProps}
                modalContentContainerStyle={
                  dropdownShared.modalContentContainerStyle
                }
                modalTitle="Select priority"
                modalTitleStyle={dropdownShared.modalTitleStyle}
                closeAfterSelecting
                zIndex={5000}
                zIndexInverse={2000}
              />
            </View>

            <View
              style={{
                marginBottom: fieldGap + 4,
                width: "100%",
                zIndex: showAssignedDropdown ? 5000 : 1,
                elevation: showAssignedDropdown ? 10 : 0,
              }}
            >
              <Text style={labelStyle}>Assignee</Text>
              <DropDownPicker
                open={showAssignedDropdown}
                value={taskData.assignedTo?.id || null}
                items={assigneeItems}
                setOpen={openAssigned}
                setValue={(updater) => {
                  const newId =
                    typeof updater === "function"
                      ? updater(taskData.assignedTo?.id || null)
                      : updater;
                  const emp =
                    (employees || []).find((e) => e.id === newId) || null;
                  handleInputChange("assignedTo", emp);
                }}
                searchable
                searchPlaceholder="Search crew..."
                onChangeSearchText={handleEmployeeSearch}
                placeholder="Unassigned"
                placeholderStyle={dropdownShared.placeholderStyle}
                style={dropdownShared.style}
                textStyle={dropdownShared.textStyle}
                dropDownContainerStyle={dropdownShared.dropDownContainerStyle}
                listItemContainerStyle={dropdownShared.listItemContainerStyle}
                listItemLabelStyle={dropdownShared.listItemLabelStyle}
                selectedItemLabelStyle={dropdownShared.selectedItemLabelStyle}
                searchContainerStyle={dropdownShared.searchContainerStyle}
                searchTextInputStyle={dropdownShared.searchTextInputStyle}
                arrowIconStyle={dropdownShared.arrowIconStyle}
                tickIconStyle={dropdownShared.tickIconStyle}
                labelProps={dropdownShared.labelProps}
                listMode={dropdownShared.listMode}
                scrollViewProps={dropdownShared.scrollViewProps}
                modalProps={dropdownShared.modalProps}
                modalContentContainerStyle={
                  dropdownShared.modalContentContainerStyle
                }
                modalTitle="Select assignee"
                modalTitleStyle={dropdownShared.modalTitleStyle}
                closeAfterSelecting
                zIndex={4000}
                zIndexInverse={1000}
              />
            </View>

            <View style={{ marginBottom: fieldGap + 4, width: "100%" }}>
              <Text style={labelStyle}>
                Start <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.scheduleSplit,
                  scheduleStacked && styles.scheduleStack,
                ]}
              >
                {renderScheduleButton(
                  "startDate",
                  "calendar-outline",
                  formatDisplayDate(startDateTime),
                  () => setActivePicker("startDate")
                )}
                {renderScheduleButton(
                  "startTime",
                  "time-outline",
                  formatDisplayTime(startDateTime),
                  () => setActivePicker("startTime")
                )}
              </View>
            </View>

            <View style={{ width: "100%" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: rs(7),
                }}
              >
                <Text style={[labelStyle, { marginBottom: 0 }]}>End</Text>
                {endDateTime ? (
                  <TouchableOpacity onPress={() => setEndDateTime(null)}>
                    <Text
                      style={{
                        fontSize: captionSize,
                        fontWeight: "700",
                        color: Brand.inkMuted,
                      }}
                    >
                      Clear
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View
                style={[
                  styles.scheduleSplit,
                  scheduleStacked && styles.scheduleStack,
                ]}
              >
                {renderScheduleButton(
                  "endDate",
                  "calendar-outline",
                  endDateTime ? formatDisplayDate(endDateTime) : "Optional",
                  () => setActivePicker("endDate"),
                  !endDateTime
                )}
                {renderScheduleButton(
                  "endTime",
                  "time-outline",
                  endDateTime ? formatDisplayTime(endDateTime) : "Optional",
                  () => setActivePicker("endTime"),
                  !endDateTime
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <View
          style={{
            width: "100%",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: Brand.line,
            backgroundColor: Brand.paper,
            paddingHorizontal: sidePad,
            paddingTop: rs(12),
            paddingBottom: footerPadBottom,
          }}
        >
          <TouchableOpacity
            onPress={handleCreateTask}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={{
              width: formWidth,
              maxWidth: "100%",
              alignSelf: "center",
              minHeight: rs(isCompactHeight ? 48 : 52),
              borderRadius: fieldRadius + 2,
              backgroundColor: Brand.ink,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: buttonPadY - 2,
              opacity: canSubmit ? 1 : 0.4,
            }}
          >
            {creating ? (
              <ActivityIndicator color={Brand.onInk} size="small" />
            ) : (
              <Text
                style={{
                  fontSize: buttonTextSize,
                  fontWeight: "700",
                  color: Brand.onInk,
                  letterSpacing: 0.15,
                }}
              >
                Create task
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {Platform.OS === "ios" && activePicker && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.dateModalRoot}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setActivePicker(null)}
            />
            <View
              style={[
                styles.dateModalCard,
                {
                  width: Math.min(formWidth, rs(380)),
                  maxWidth: "92%",
                  borderRadius: rs(14),
                },
              ]}
            >
              <View style={styles.dateModalHeader}>
                <Text
                  style={{
                    fontSize: rs(16),
                    fontWeight: "600",
                    color: Brand.ink,
                  }}
                >
                  {pickerTitle}
                </Text>
                <TouchableOpacity
                  onPress={() => setActivePicker(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={{
                      fontSize: rs(16),
                      fontWeight: "700",
                      color: Brand.ink,
                    }}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode={pickerMode}
                display={pickerMode === "date" ? "inline" : "spinner"}
                onChange={applyPickerValue}
                minimumDate={
                  activePicker === "endDate" ? startDateTime : undefined
                }
                themeVariant="light"
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === "android" && activePicker && (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode}
          display="default"
          onChange={applyPickerValue}
          minimumDate={activePicker === "endDate" ? startDateTime : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: Brand.paper,
  },
  flex: {
    flex: 1,
    width: "100%",
  },
  required: {
    color: Brand.danger,
  },
  scheduleSplit: {
    flexDirection: "row",
    gap: 8,
  },
  scheduleStack: {
    flexDirection: "column",
  },
  scheduleHalf: {
    flex: 1,
  },
  dateModalRoot: {
    flex: 1,
    backgroundColor: "rgba(35, 31, 32, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  dateModalCard: {
    backgroundColor: Brand.paper,
    width: "100%",
    overflow: "hidden",
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
});

export default CreateTask;
