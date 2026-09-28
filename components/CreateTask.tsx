// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CalendarDays, Flag, Sparkles } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import DropDownPicker from "react-native-dropdown-picker";
import {
  createNewTask,
  fetchEmployeesForTaskAssignment,
  selectTaskCreating,
  selectEmployeesForAssignment,
} from "../store/slices/taskSlice";
import { useAppDispatch, useAppSelector } from "../hooks";
import { showErrorToast, showSuccessToast } from "../utils/toast";
import { Brand } from "../constants/brandColors";
import { useResponsiveLayout } from "../constants/responsiveLayout";

DropDownPicker.setListMode("MODAL");

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low", color: "#1B7A4A" },
  { id: "medium", label: "Medium", color: "#2563EB" },
  { id: "high", label: "High", color: "#C05621" },
  { id: "critical", label: "Critical", color: "#B91C1C" },
];

function CreateTask({
  projectId,
  projectName,
  onSuccess,
  onCancel,
  navigation,
  hideHeader = false,
}) {
  const dispatch = useAppDispatch();
  const creating = useAppSelector(selectTaskCreating);
  const employees = useAppSelector(selectEmployeesForAssignment);
  const layout = useResponsiveLayout();
  const {
    width,
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
    isCompactHeight,
    isSmallPhone,
    isTablet,
    stackFields,
    rs,
  } = layout;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;

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
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null);

  const sidePad = isTablet
    ? Math.max(horizontalPad, 48)
    : isSmallPhone
      ? 16
      : Math.min(horizontalPad, 22);
  const formWidth = isTablet
    ? Math.min(contentWidth + 48, 540)
    : Math.max(width - sidePad * 2, 0);
  const fieldRadius = Math.max(radius - 1, 10);
  const footerPadBottom = Math.max(insets.bottom, 14);
  const descHeight = rs(isCompactHeight ? 76 : 92);
  const scheduleStacked = stackFields || isSmallPhone || width < 390;
  const pairRow = isTablet || width >= 430;

  useEffect(() => {
    dispatch(fetchEmployeesForTaskAssignment());
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dispatch, fadeIn, slideUp]);

  const handleClose = () => {
    if (onCancel) onCancel();
    else if (navigation?.goBack) navigation.goBack();
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

  const priorityItems = useMemo(
    () =>
      PRIORITY_OPTIONS.map((priority) => ({
        label: priority.label,
        value: priority.id,
        icon: () => (
          <View
            style={{
              width: rs(9),
              height: rs(9),
              borderRadius: rs(5),
              backgroundColor: priority.color,
              marginRight: rs(6),
            }}
          />
        ),
      })),
    [rs]
  );

  const assigneeItems = useMemo(
    () =>
      (employees || []).map((emp) => ({
        label: getEmployeeLabel(emp),
        value: emp.id,
      })),
    [employees]
  );

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
        showSuccessToast(
          "Task Created Successfully!",
          "Your task has been created and saved"
        );
        if (onSuccess) onSuccess();
        else handleClose();
      } else {
        showErrorToast(
          result.payload || "Failed to create task. Please try again."
        );
      }
    } catch (error) {
      showErrorToast(error, "An unexpected error occurred. Please try again.");
    }
  };

  const applyPickerValue = (event, selectedDate) => {
    if (Platform.OS === "android") setActivePicker(null);
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
  const selectedPriority =
    PRIORITY_OPTIONS.find((p) => p.id === taskData.priority) ||
    PRIORITY_OPTIONS[1];
  const readiness = [
    !!taskData.title?.trim(),
    !!taskData.priority,
    !!startDateTime,
  ].filter(Boolean).length;

  const dropdownStyle = {
    backgroundColor: Brand.paperSoft,
    borderColor: Brand.line,
    borderWidth: 1,
    borderRadius: fieldRadius,
    minHeight: inputHeight,
    paddingHorizontal: rs(12),
  };
  const dropdownTextStyle = {
    fontSize: bodySize - 1,
    color: Brand.ink,
    fontWeight: "500",
  };
  const dropdownListStyle = {
    backgroundColor: Brand.paper,
    borderColor: Brand.line,
    borderWidth: 1,
    borderRadius: fieldRadius,
  };
  const modalPickerStyle = {
    backgroundColor: Brand.paper,
    flex: 1,
    paddingTop: Math.max(insets.top, 12),
    paddingBottom: Math.max(insets.bottom, 12),
    paddingHorizontal: sidePad,
  };

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

  const renderScheduleButton = (field, icon, topLabel, value, onPress, muted) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        fieldShell(field),
        !scheduleStacked && styles.scheduleHalf,
        scheduleStacked && { width: "100%" },
        {
          paddingHorizontal: rs(12),
          paddingVertical: rs(10),
          minHeight: inputHeight + 4,
        },
      ]}
    >
      <View style={styles.scheduleTop}>
        <Ionicons name={icon} size={rs(14)} color={Brand.inkMuted} />
        <Text style={[styles.scheduleHint, { fontSize: captionSize - 1 }]}>
          {topLabel}
        </Text>
      </View>
      <View style={styles.scheduleBottom}>
        <Text
          style={{
            flex: 1,
            fontSize: bodySize - 1,
            fontWeight: "700",
            color: muted ? Brand.inkFaint : Brand.ink,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={rs(14)} color={Brand.inkFaint} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { width }]}>
      {!hideHeader && (
        <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            width: "100%",
            paddingHorizontal: sidePad,
            paddingTop: isCompactHeight ? rs(16) : rs(22),
            paddingBottom: rs(28) + footerPadBottom,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >
          <Animated.View
            style={{
              width: formWidth,
              maxWidth: "100%",
              alignSelf: "center",
              opacity: fadeIn,
              transform: [{ translateY: slideUp }],
            }}
          >
            <View style={styles.introRow}>
              <View
                style={[
                  styles.introBadge,
                  {
                    width: rs(44),
                    height: rs(44),
                    borderRadius: rs(14),
                  },
                ]}
              >
                <Sparkles size={rs(20)} color={Brand.ink} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: isSmallPhone
                      ? rs(22)
                      : Math.min(titleSize - 2, rs(26)),
                    fontWeight: "800",
                    color: Brand.ink,
                    letterSpacing: -0.4,
                  }}
                >
                  Task details
                </Text>
                <Text
                  style={{
                    marginTop: rs(4),
                    fontSize: subtitleSize,
                    color: Brand.inkMuted,
                    lineHeight: subtitleSize * 1.4,
                    fontWeight: "500",
                  }}
                >
                  {projectName
                    ? `For ${projectName}`
                    : "Title, priority, assignee, and schedule"}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              {[0, 1, 2].map((step) => (
                <View
                  key={step}
                  style={[
                    styles.progressSeg,
                    {
                      backgroundColor:
                        step < readiness ? Brand.ink : Brand.line,
                      height: rs(3),
                      borderRadius: 2,
                    },
                  ]}
                />
              ))}
            </View>
            <Text
              style={{
                fontSize: captionSize,
                color: Brand.inkFaint,
                fontWeight: "600",
                marginBottom: isCompactHeight ? rs(18) : rs(24),
                letterSpacing: 0.2,
              }}
            >
              {readiness}/3 ready · title unlocks create
            </Text>

            <View style={{ marginBottom: fieldGap + 6, width: "100%" }}>
              <Text style={labelStyle}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  fieldShell("title"),
                  {
                    paddingHorizontal: rs(14),
                    minHeight: inputHeight + 2,
                    fontSize: bodySize,
                    color: Brand.ink,
                    fontWeight: "600",
                    paddingVertical: Platform.OS === "ios" ? rs(14) : rs(11),
                  },
                ]}
                placeholder="What needs to be done?"
                value={taskData.title}
                onChangeText={(value) => handleInputChange("title", value)}
                placeholderTextColor={Brand.inkFaint}
                returnKeyType="next"
                onFocus={() => setFocusedField("title")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={{ marginBottom: fieldGap + 10, width: "100%" }}>
              <Text style={labelStyle}>Description</Text>
              <TextInput
                style={[
                  fieldShell("description"),
                  {
                    paddingHorizontal: rs(14),
                    paddingTop: rs(12),
                    paddingBottom: rs(12),
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
                onFocus={() => setFocusedField("description")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.dividerRow}>
              <Flag size={rs(14)} color={Brand.inkMuted} strokeWidth={2} />
              <Text style={[styles.dividerLabel, { fontSize: captionSize }]}>
                PRIORITY & ASSIGNEE
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <View
              style={[
                styles.pairRow,
                !pairRow && styles.pairStack,
                { gap: fieldGap, marginBottom: fieldGap + 10 },
              ]}
            >
              <View
                style={[
                  pairRow ? styles.pairHalf : { width: "100%" },
                  { zIndex: priorityOpen ? 4000 : 2 },
                ]}
              >
                <Text style={labelStyle}>Priority</Text>
                <DropDownPicker
                  open={priorityOpen}
                  value={taskData.priority}
                  items={priorityItems}
                  setOpen={(updater) => {
                    setPriorityOpen((prev) => {
                      const next =
                        typeof updater === "function" ? updater(prev) : updater;
                      if (next) {
                        Keyboard.dismiss();
                        setAssigneeOpen(false);
                      }
                      return !!next;
                    });
                  }}
                  setValue={(updater) => {
                    const next =
                      typeof updater === "function"
                        ? updater(taskData.priority)
                        : updater;
                    handleInputChange("priority", next);
                  }}
                  placeholder="Select priority"
                  placeholderStyle={{
                    color: Brand.inkFaint,
                    fontSize: bodySize - 1,
                  }}
                  style={dropdownStyle}
                  textStyle={dropdownTextStyle}
                  dropDownContainerStyle={dropdownListStyle}
                  listMode="MODAL"
                  modalTitle="Select priority"
                  modalTitleStyle={{
                    fontSize: rs(16),
                    fontWeight: "700",
                    color: Brand.ink,
                  }}
                  modalContentContainerStyle={modalPickerStyle}
                  modalProps={{
                    animationType: "slide",
                    statusBarTranslucent: true,
                  }}
                  closeAfterSelecting
                  zIndex={4000}
                  zIndexInverse={1000}
                />
              </View>

              <View
                style={[
                  pairRow ? styles.pairHalf : { width: "100%" },
                  { zIndex: assigneeOpen ? 3000 : 1 },
                ]}
              >
                <Text style={labelStyle}>Assignee</Text>
                <DropDownPicker
                  open={assigneeOpen}
                  value={taskData.assignedTo?.id || null}
                  items={assigneeItems}
                  setOpen={(updater) => {
                    setAssigneeOpen((prev) => {
                      const next =
                        typeof updater === "function" ? updater(prev) : updater;
                      if (next) {
                        Keyboard.dismiss();
                        setPriorityOpen(false);
                      }
                      return !!next;
                    });
                  }}
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
                  placeholder="Unassigned"
                  placeholderStyle={{
                    color: Brand.inkFaint,
                    fontSize: bodySize - 1,
                  }}
                  style={dropdownStyle}
                  textStyle={dropdownTextStyle}
                  dropDownContainerStyle={dropdownListStyle}
                  searchContainerStyle={{
                    borderBottomColor: Brand.line,
                    paddingHorizontal: rs(8),
                  }}
                  searchTextInputStyle={{
                    borderColor: Brand.line,
                    borderRadius: Math.max(fieldRadius - 2, 8),
                    backgroundColor: Brand.paperSoft,
                    fontSize: bodySize - 1,
                    color: Brand.ink,
                    minHeight: rs(40),
                  }}
                  listMode="MODAL"
                  modalTitle="Select assignee"
                  modalTitleStyle={{
                    fontSize: rs(16),
                    fontWeight: "700",
                    color: Brand.ink,
                  }}
                  modalContentContainerStyle={modalPickerStyle}
                  modalProps={{
                    animationType: "slide",
                    statusBarTranslucent: true,
                  }}
                  closeAfterSelecting
                  zIndex={3000}
                  zIndexInverse={1000}
                />
              </View>
            </View>

            <View
              style={[
                styles.summaryStrip,
                {
                  borderRadius: fieldRadius,
                  marginBottom: fieldGap + 12,
                  paddingHorizontal: rs(12),
                  paddingVertical: rs(10),
                },
              ]}
            >
              <View style={styles.summaryItem}>
                <View
                  style={[
                    styles.summaryDot,
                    { backgroundColor: selectedPriority.color },
                  ]}
                />
                <Text style={styles.summaryText}>{selectedPriority.label}</Text>
              </View>
              <View style={styles.summarySep} />
              <Text style={[styles.summaryText, { flex: 1 }]} numberOfLines={1}>
                {taskData.assignedTo
                  ? getEmployeeLabel(taskData.assignedTo)
                  : "Unassigned"}
              </Text>
            </View>

            <View style={styles.dividerRow}>
              <CalendarDays
                size={rs(14)}
                color={Brand.inkMuted}
                strokeWidth={2}
              />
              <Text style={[styles.dividerLabel, { fontSize: captionSize }]}>
                SCHEDULE
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={labelStyle}>
              Starts <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.scheduleSplit,
                scheduleStacked && styles.scheduleStack,
                { marginBottom: fieldGap + 6 },
              ]}
            >
              {renderScheduleButton(
                "startDate",
                "calendar-outline",
                "Date",
                formatDisplayDate(startDateTime),
                () => setActivePicker("startDate"),
                false
              )}
              {renderScheduleButton(
                "startTime",
                "time-outline",
                "Time",
                formatDisplayTime(startDateTime),
                () => setActivePicker("startTime"),
                false
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: rs(7),
              }}
            >
              <Text style={[labelStyle, { marginBottom: 0 }]}>Ends</Text>
              {endDateTime ? (
                <TouchableOpacity
                  onPress={() => setEndDateTime(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
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
                "Date",
                endDateTime ? formatDisplayDate(endDateTime) : "Optional",
                () => setActivePicker("endDate"),
                !endDateTime
              )}
              {renderScheduleButton(
                "endTime",
                "time-outline",
                "Time",
                endDateTime ? formatDisplayTime(endDateTime) : "Optional",
                () => setActivePicker("endTime"),
                !endDateTime
              )}
            </View>
          </Animated.View>
        </ScrollView>

        <View
          style={[
            styles.footerBar,
            {
              paddingHorizontal: sidePad,
              paddingTop: rs(12),
              paddingBottom: footerPadBottom,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleCreateTask}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={{
              width: formWidth,
              maxWidth: "100%",
              alignSelf: "center",
              minHeight: rs(isCompactHeight ? 50 : 54),
              borderRadius: fieldRadius + 2,
              backgroundColor: Brand.ink,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: buttonPadY - 2,
              opacity: canSubmit ? 1 : 0.35,
              flexDirection: "row",
              gap: 8,
            }}
          >
            {creating ? (
              <ActivityIndicator color={Brand.onInk} size="small" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={rs(18)}
                  color={Brand.onInk}
                />
                <Text
                  style={{
                    fontSize: buttonTextSize,
                    fontWeight: "700",
                    color: Brand.onInk,
                    letterSpacing: 0.2,
                  }}
                >
                  Create task
                </Text>
              </>
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
                <TouchableOpacity onPress={() => setActivePicker(null)}>
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
                accentColor={Brand.ink}
                textColor={Brand.ink}
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
          accentColor={Brand.ink}
          textColor={Brand.ink}
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
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  introBadge: {
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  progressSeg: {
    flex: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  dividerLabel: {
    fontWeight: "700",
    color: Brand.inkMuted,
    letterSpacing: 0.8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Brand.line,
  },
  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.inkSoft,
  },
  summarySep: {
    width: 1,
    height: 14,
    backgroundColor: Brand.lineStrong,
    marginHorizontal: 12,
  },
  required: {
    color: Brand.danger,
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  pairStack: {
    flexDirection: "column",
  },
  pairHalf: {
    flex: 1,
    minWidth: 0,
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
  scheduleTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  scheduleHint: {
    fontWeight: "600",
    color: Brand.inkFaint,
    letterSpacing: 0.2,
  },
  scheduleBottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerBar: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
    backgroundColor: Brand.paper,
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
