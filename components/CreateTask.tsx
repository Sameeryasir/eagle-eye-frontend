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
import {
  createNewTask,
  selectTaskCreating,
} from "../store/slices/taskSlice";
import { Brand } from "../constants/brandColors";
import { useResponsiveLayout } from "../constants/responsiveLayout";
import { useAppDispatch, useAppSelector } from "../hooks";
import { showErrorToast, showSuccessToastAfterModal } from "../utils/toast";

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low", color: "#1B7A4A" },
  { id: "medium", label: "Medium", color: "#C05621" },
  { id: "high", label: "High", color: "#B91C1C" },
];

const DESC_MAX = 120;

function CreateTask({
  projectId,
  onSuccess,
  onCancel,
  navigation,
  hideHeader = false,
}) {
  const dispatch = useAppDispatch();
  const creating = useAppSelector(selectTaskCreating);
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
    hitSize,
    isCompactHeight,
    isSmallPhone,
    isTablet,
    rs,
  } = layout;

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
  const [focusedField, setFocusedField] = useState(null);

  const handleClose = () => {
    if (onCancel) onCancel();
    else if (navigation?.goBack) navigation.goBack();
  };

  const handleCancel = () => {
    const hasDraft =
      title.trim() || description.trim() || endDateTime || priority !== "low";

    if (!hasDraft) {
      handleClose();
      return;
    }

    Alert.alert("Discard task?", "Your entered details will be lost.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: handleClose },
    ]);
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
    return value.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      showErrorToast("Task title is required");
      return;
    }
    if (!projectId) {
      showErrorToast("Project ID is required to create a task");
      return;
    }
    if (endDateTime && endDateTime <= startDateTime) {
      showErrorToast("End date must be after start date");
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
        if (onSuccess) onSuccess(result.payload);
        else handleClose();
        showSuccessToastAfterModal(
          "Task Created Successfully!",
          "Your task has been added to the list"
        );
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
    setFocusedField("start");
    setActivePicker("startDate");
  };

  const openEndPicker = () => {
    Keyboard.dismiss();
    setPriorityOpen(false);
    setFocusedField("end");
    setActivePicker("endDate");
  };

  const selectedPriority =
    PRIORITY_OPTIONS.find((p) => p.id === priority) || PRIORITY_OPTIONS[0];
  const canSubmit = !!title.trim() && !creating;

  const pickerMode =
    activePicker === "startTime" || activePicker === "endTime"
      ? "time"
      : "date";
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

  const sidePad = isTablet
    ? Math.max(horizontalPad, 40)
    : isSmallPhone
      ? 16
      : Math.min(horizontalPad, 20);
  const formWidth = isTablet
    ? contentWidth
    : Math.max(width - sidePad * 2, 0);
  const fieldRadius = Math.max(radius - 2, 8);
  const footerPadBottom = Math.max(insets.bottom, 14);
  const descHeight = rs(isCompactHeight ? 72 : 80);

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
    backgroundColor: "#FFFFFF",
    borderRadius: fieldRadius,
  });

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
        {!hideHeader && (
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
              backgroundColor: Brand.paper,
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
        )}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            width: "100%",
            paddingHorizontal: sidePad,
            paddingTop: isCompactHeight ? rs(18) : rs(24),
            paddingBottom: rs(28) + footerPadBottom,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            setPriorityOpen(false);
          }}
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
                marginBottom: isCompactHeight ? rs(20) : rs(26),
              }}
            >
              Add a title, short note, priority, and schedule.
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
                placeholder="e.g. Install flooring"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={Brand.inkFaint}
                returnKeyType="next"
                onFocus={() => {
                  setFocusedField("title");
                  setPriorityOpen(false);
                }}
                onBlur={() => setFocusedField(null)}
                maxLength={80}
              />
            </View>

            <View style={{ marginBottom: fieldGap + 4, width: "100%" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: rs(7),
                }}
              >
                <Text style={[labelStyle, { marginBottom: 0 }]}>
                  Short description
                </Text>
                <Text
                  style={{
                    fontSize: captionSize,
                    color: Brand.inkFaint,
                    fontWeight: "500",
                  }}
                >
                  {description.length}/{DESC_MAX}
                </Text>
              </View>
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
                placeholder="One-line summary (optional)"
                value={description}
                onChangeText={(value) =>
                  setDescription(value.slice(0, DESC_MAX))
                }
                multiline
                numberOfLines={2}
                placeholderTextColor={Brand.inkFaint}
                onFocus={() => {
                  setFocusedField("description");
                  setPriorityOpen(false);
                }}
                onBlur={() => setFocusedField(null)}
                maxLength={DESC_MAX}
              />
            </View>

            <View
              style={{
                marginBottom: fieldGap + 4,
                width: "100%",
                zIndex: priorityOpen ? 20 : 1,
              }}
            >
              <Text style={labelStyle}>Priority</Text>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setActivePicker(null);
                  setFocusedField("priority");
                  setPriorityOpen((open) => !open);
                }}
                activeOpacity={0.75}
                style={[
                  fieldShell("priority"),
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: rs(14),
                    minHeight: inputHeight,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: rs(8),
                      height: rs(8),
                      borderRadius: rs(4),
                      backgroundColor: selectedPriority.color,
                      marginRight: rs(10),
                    }}
                  />
                  <Text
                    style={{
                      fontSize: bodySize,
                      fontWeight: "500",
                      color: Brand.ink,
                    }}
                  >
                    {selectedPriority.label}
                  </Text>
                </View>
                <Ionicons
                  name={priorityOpen ? "chevron-up" : "chevron-forward"}
                  size={rs(16)}
                  color={Brand.inkFaint}
                />
              </TouchableOpacity>

              {priorityOpen && (
                <View
                  style={{
                    marginTop: rs(6),
                    borderWidth: 1,
                    borderColor: Brand.line,
                    borderRadius: fieldRadius,
                    backgroundColor: Brand.paper,
                    overflow: "hidden",
                  }}
                >
                  {PRIORITY_OPTIONS.map((option) => {
                    const selected = priority === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: rs(14),
                          paddingVertical: rs(12),
                          backgroundColor: selected
                            ? Brand.paperSoft
                            : Brand.paper,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: Brand.line,
                        }}
                        onPress={() => {
                          setPriority(option.id);
                          setPriorityOpen(false);
                          setFocusedField(null);
                        }}
                        activeOpacity={0.75}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <View
                            style={{
                              width: rs(8),
                              height: rs(8),
                              borderRadius: rs(4),
                              backgroundColor: option.color,
                              marginRight: rs(10),
                            }}
                          />
                          <Text
                            style={{
                              fontSize: bodySize,
                              fontWeight: "500",
                              color: Brand.ink,
                            }}
                          >
                            {option.label}
                          </Text>
                        </View>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={rs(18)}
                            color={Brand.ink}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ marginBottom: fieldGap + 4, width: "100%" }}>
              <Text style={labelStyle}>
                Start date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={openStartPicker}
                activeOpacity={0.75}
                style={[
                  fieldShell("start"),
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: rs(14),
                    minHeight: inputHeight,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={rs(18)}
                    color={Brand.inkMuted}
                    style={{ marginRight: rs(10) }}
                  />
                  <Text
                    style={{
                      fontSize: bodySize,
                      fontWeight: "500",
                      color: Brand.ink,
                    }}
                    numberOfLines={1}
                  >
                    {formatDateTimeDisplay(startDateTime)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={rs(16)}
                  color={Brand.inkFaint}
                />
              </TouchableOpacity>
            </View>

            <View style={{ width: "100%" }}>
              <Text style={labelStyle}>End date</Text>
              <TouchableOpacity
                onPress={openEndPicker}
                activeOpacity={0.75}
                style={[
                  fieldShell("end"),
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: rs(14),
                    minHeight: inputHeight,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={rs(18)}
                    color={Brand.inkMuted}
                    style={{ marginRight: rs(10) }}
                  />
                  <Text
                    style={{
                      fontSize: bodySize,
                      fontWeight: "500",
                      color: endDateTime ? Brand.ink : Brand.inkFaint,
                    }}
                    numberOfLines={1}
                  >
                    {endDateTime
                      ? formatDateTimeDisplay(endDateTime)
                      : "Optional"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={rs(16)}
                  color={Brand.inkFaint}
                />
              </TouchableOpacity>
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
                  width: Math.min(formWidth, 380),
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
                  onPress={() => {
                    if (activePicker === "startDate") {
                      setActivePicker("startTime");
                    } else if (activePicker === "endDate") {
                      setActivePicker("endTime");
                    } else {
                      setActivePicker(null);
                      setFocusedField(null);
                    }
                  }}
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
          minimumDate={
            activePicker === "endDate" ? startDateTime : undefined
          }
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
  required: {
    color: Brand.danger,
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
  },
  dateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
});

export default CreateTask;
