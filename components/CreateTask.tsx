// @ts-nocheck

import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createNewTask,
  selectTaskCreating,
} from "../store/slices/taskSlice";
import { useAppDispatch, useAppSelector } from "../hooks";
import { showErrorToast, showSuccessToast } from "../utils/toast";

const UI = {
  ink: "#111827",
  muted: "#9CA3AF",
  label: "#374151",
  border: "#E5E7EB",
  fieldBg: "#F3F4F6",
  paper: "#FFFFFF",
  placeholder: "#9CA3AF",
  button: "#111827",
  trashBg: "#FEE2E2",
  trash: "#EF4444",
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
  check: "#3B82F6",
  highlight: "#EFF6FF",
  borderActive: "#3B82F6",
};

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low", color: UI.low },
  { id: "medium", label: "Medium", color: UI.medium },
  { id: "high", label: "High", color: UI.high },
];

const DESC_MAX = 500;

function CreateTask({
  projectId,
  onSuccess,
  onCancel,
  navigation,
  hideHeader = false,
}) {
  const dispatch = useAppDispatch();
  const creating = useAppSelector(selectTaskCreating);
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("low");
  const [startDateTime, setStartDateTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  });
  const [endDateTime, setEndDateTime] = useState(null);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null); 

  const handleClose = () => {
    if (onCancel) onCancel();
    else if (navigation?.goBack) navigation.goBack();
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

  const formatDateTimeDisplay = (value) => {
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

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }
    if (!projectId) {
      Alert.alert("Error", "Project ID is required to create a task");
      return;
    }
    if (endDateTime && endDateTime <= startDateTime) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }

    try {
      const taskPayload = {
        title: title.trim(),
        description: description.trim().slice(0, DESC_MAX),
        assignedToUserId: null,
        priority: priority || null,
        startTime: formatWithTimezone(startDateTime),
        minStartTime: formatWithTimezone(startDateTime),
        endTime: endDateTime ? formatWithTimezone(endDateTime) : null,
        projectId: Number(projectId),
      };

      const result = await dispatch(createNewTask(taskPayload));
      if (createNewTask.fulfilled.match(result)) {
        showSuccessToast(
          "Task Created Successfully!",
          "Your task has been added to the list"
        );
        if (onSuccess) onSuccess(result.payload);
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
    if (Platform.OS === "android") {
      if (event?.type === "dismissed") {
        setActivePicker(null);
        return;
      }
      
      setActivePicker(null);
    }
    if (event?.type === "dismissed") {
      setActivePicker(null);
      return;
    }
    if (!selectedDate || !activePicker) return;

    if (activePicker === "startDate") {
      const next = new Date(selectedDate);
      next.setHours(
        startDateTime.getHours(),
        startDateTime.getMinutes(),
        0,
        0
      );
      setStartDateTime(next);
      if (Platform.OS === "android") {
        
        setTimeout(() => setActivePicker("startTime"), 100);
        return;
      }
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
      if (Platform.OS === "android") {
        setTimeout(() => setActivePicker("endTime"), 100);
        return;
      }
    } else if (activePicker === "endTime") {
      const next = endDateTime ? new Date(endDateTime) : new Date();
      next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setEndDateTime(next);
    }
  };

  const openStartPicker = () => {
    Keyboard.dismiss();
    setPriorityOpen(false);
    setActivePicker("startDate");
  };

  const openEndPicker = () => {
    Keyboard.dismiss();
    setPriorityOpen(false);
    setActivePicker("endDate");
  };

  const selectedPriority =
    PRIORITY_OPTIONS.find((p) => p.id === priority) || PRIORITY_OPTIONS[0];
  const canSubmit = !!title.trim() && !creating;

  const pickerMode =
    activePicker === "startTime" || activePicker === "endTime" ? "time" : "date";
  const pickerValue =
    activePicker === "endDate" || activePicker === "endTime"
      ? endDateTime || new Date()
      : startDateTime;
  const pickerTitle =
    activePicker === "startDate"
      ? "Start date"
      : activePicker === "startTime"
        ? "Start time"
        : activePicker === "endDate"
          ? "End date"
          : "End time";

  
  const renderFieldRow = (icon, label, children) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelCol}>
        <Ionicons name={icon} size={18} color={UI.label} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.inputCol}>{children}</View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={UI.paper} />

      {!hideHeader && (
        <View
          style={[
            styles.headerWrap,
            { paddingTop: Math.max(insets.top, 12) },
          ]}
        >
          <Text style={styles.headerTitle}>Create New Task</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.trashBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={UI.trash} />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            setPriorityOpen(false);
          }}
        >
          
          {renderFieldRow(
            "document-text-outline",
            "Title",
            <TextInput
              style={styles.input}
              placeholder="Enter task title..."
              placeholderTextColor={UI.placeholder}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setPriorityOpen(false)}
              returnKeyType="next"
            />
          )}

          
          {renderFieldRow(
            "chatbubble-ellipses-outline",
            "Description",
            <View style={styles.textAreaWrap}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter task description (optional)..."
                placeholderTextColor={UI.placeholder}
                value={description}
                onChangeText={(v) => setDescription(v.slice(0, DESC_MAX))}
                multiline
                textAlignVertical="top"
                onFocus={() => setPriorityOpen(false)}
              />
              <Text style={styles.charCount}>
                {description.length}/{DESC_MAX}
              </Text>
            </View>
          )}

          
          <View style={[styles.fieldRow, priorityOpen && styles.fieldRowOpen]}>
            <View style={styles.labelCol}>
              <Ionicons name="flag-outline" size={18} color={UI.label} />
              <Text style={styles.rowLabel}>Priority</Text>
            </View>
            <View style={styles.inputCol}>
              <TouchableOpacity
                style={[styles.input, styles.selectInput]}
                onPress={() => {
                  Keyboard.dismiss();
                  setActivePicker(null);
                  setPriorityOpen((o) => !o);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.priorityValue}>
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: selectedPriority.color },
                    ]}
                  />
                  <Text style={styles.inputText}>{selectedPriority.label}</Text>
                </View>
                <Ionicons
                  name={priorityOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={UI.muted}
                />
              </TouchableOpacity>
              {priorityOpen && (
                <View style={styles.dropdownPanel}>
                  {PRIORITY_OPTIONS.map((option) => {
                    const selected = priority === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionRow,
                          selected && styles.optionSelected,
                        ]}
                        onPress={() => {
                          setPriority(option.id);
                          setPriorityOpen(false);
                        }}
                      >
                        <View style={styles.priorityValue}>
                          <View
                            style={[
                              styles.priorityDot,
                              { backgroundColor: option.color },
                            ]}
                          />
                          <Text style={styles.inputText}>{option.label}</Text>
                        </View>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={UI.check}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          
          {renderFieldRow(
            "calendar-outline",
            "Start Date",
            <TouchableOpacity
              style={[styles.input, styles.selectInput]}
              onPress={openStartPicker}
              activeOpacity={0.75}
            >
              <Text style={styles.inputText} numberOfLines={1}>
                {formatDateTimeDisplay(startDateTime)}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={UI.muted} />
            </TouchableOpacity>
          )}

          
          {renderFieldRow(
            "calendar-outline",
            "End Date",
            <TouchableOpacity
              style={[styles.input, styles.selectInput]}
              onPress={openEndPicker}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.inputText,
                  !endDateTime && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {endDateTime
                  ? formatDateTimeDisplay(endDateTime)
                  : "No end date selected"}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={UI.muted} />
            </TouchableOpacity>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            onPress={handleCreateTask}
            disabled={!canSubmit}
            activeOpacity={0.88}
            style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
          >
            {creating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.createBtnText}>Create Task</Text>
                <Ionicons name="add" size={22} color="#FFFFFF" />
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
            <View style={styles.dateModalCard}>
              <View style={styles.dateModalHeader}>
                <Text style={styles.dateModalTitle}>{pickerTitle}</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (activePicker === "startDate") {
                      setActivePicker("startTime");
                    } else if (activePicker === "endDate") {
                      setActivePicker("endTime");
                    } else {
                      setActivePicker(null);
                    }
                  }}
                >
                  <Text style={styles.dateModalDone}>
                    {activePicker === "startDate" || activePicker === "endDate"
                      ? "Next"
                      : "Done"}
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
                accentColor={UI.check}
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
          minimumDate={
            activePicker === "endDate" ? startDateTime : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI.paper,
  },
  flex: {
    flex: 1,
  },
  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: UI.paper,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: UI.ink,
  },
  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: UI.trashBg,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    overflow: "visible",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
    zIndex: 1,
  },
  fieldRowOpen: {
    zIndex: 40,
    elevation: 40,
  },
  labelCol: {
    width: 110,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 14,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: UI.label,
  },
  inputCol: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    zIndex: 1,
  },
  input: {
    backgroundColor: UI.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 14,
    color: UI.ink,
    minHeight: 48,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputText: {
    fontSize: 14,
    color: UI.ink,
    fontWeight: "500",
    flexShrink: 1,
  },
  placeholderText: {
    color: UI.placeholder,
    fontWeight: "400",
  },
  textAreaWrap: {
    backgroundColor: UI.fieldBg,
    borderRadius: 12,
    overflow: "hidden",
  },
  textArea: {
    minHeight: 96,
    backgroundColor: "transparent",
    paddingBottom: 28,
  },
  charCount: {
    position: "absolute",
    right: 12,
    bottom: 8,
    fontSize: 11,
    color: UI.muted,
    fontWeight: "600",
  },
  priorityValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dropdownPanel: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: UI.paper,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 50,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionSelected: {
    backgroundColor: UI.highlight,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: UI.paper,
  },
  createBtn: {
    backgroundColor: UI.button,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createBtnDisabled: {
    opacity: 0.35,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dateModalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  dateModalCard: {
    backgroundColor: UI.paper,
    borderRadius: 14,
    width: "100%",
    maxWidth: 380,
    overflow: "hidden",
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.border,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.ink,
  },
  dateModalDone: {
    fontSize: 16,
    fontWeight: "700",
    color: UI.check,
  },
});

export default CreateTask;
