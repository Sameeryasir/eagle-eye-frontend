import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  StyleSheet,
  TextInput,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Sidebar from "../components/Sidebar";
import UpdateTaskModal from "../components/UpdateTaskModal";
import { Brand } from "../constants/brandColors";
import { getUserRole } from "../services/utils/userRole";
import { taskAssignement } from "../services/inAppNotification/taskAssignement";
import {
  useTaskDetails,
  useTaskAssignees,
  useAssignTaskMutation,
  useDeleteTaskMutation,
} from "../hooks/queries";

const PRIORITY = {
  low: { label: "Low", color: "#059669", bg: "#ECFDF5" },
  medium: { label: "Medium", color: "#D97706", bg: "#FFFBEB" },
  high: { label: "High", color: "#DC2626", bg: "#FEF2F2" },
  critical: { label: "Critical", color: "#B91C1C", bg: "#FEE2E2" },
};

function OverflowMenuRenderer({ style, children, layouts, ...other }) {
  const { windowLayout, triggerLayout, optionsLayout } = layouts;
  const gap = 6;
  const menuW = optionsLayout.width || 150;
  const menuH = optionsLayout.height || 96;
  const triggerX = triggerLayout.x - windowLayout.x;
  const triggerY = triggerLayout.y - windowLayout.y;

  let top = triggerY + triggerLayout.height + gap;
  if (top + menuH > windowLayout.height - 8) {
    top = Math.max(8, triggerY - menuH - gap);
  }

  let left = triggerX + triggerLayout.width - menuW;
  if (left < 8) left = 8;
  if (left + menuW > windowLayout.width - 8) {
    left = windowLayout.width - menuW - 8;
  }

  return (
    <View {...other} style={[{ position: "absolute", top, left }, style]}>
      {children}
    </View>
  );
}

function getPriorityMeta(priority) {
  const key = String(priority || "").toLowerCase();
  return PRIORITY[key] || null;
}

function getStatusLabel(task) {
  const status = String(task?.status || task?.taskStatus || "").toLowerCase();
  if (status === "done" || status === "completed") return "Completed";
  if (status === "in_progress" || status === "in-progress") return "In Progress";
  if (status === "blocked") return "Blocked";
  return "Open";
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} · ${time}`;
}

function getAssignedToName(assignedTo) {
  if (!assignedTo) return "Unassigned";
  const fullName =
    `${assignedTo.first_name || assignedTo.firstName || ""} ${
      assignedTo.last_name || assignedTo.lastName || ""
    }`.trim();
  if (fullName) return fullName;
  return assignedTo.email || "Unassigned";
}

function initialFromName(name) {
  return String(name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
}

function TaskDetailsScreen({ navigation, route }) {
  const { taskId, projectId, task: routeTask } = route.params || {};
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const {
    data: fetchedTask,
    isLoading: taskLoading,
    isRefetching,
    error: taskError,
    refetch: refetchTask,
  } = useTaskDetails(taskId);

  const currentTask = fetchedTask || routeTask || null;

  const canManageAssignee = userRole !== "Employee";
  const {
    data: employeesData,
    isLoading: loadingEmployees,
    refetch: refetchEmployees,
  } = useTaskAssignees(canManageAssignee);

  const employees = Array.isArray(employeesData) ? employeesData : [];
  const assignMutation = useAssignTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const assigning = assignMutation.isPending;

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        setUserRole(await getUserRole());
      } catch {
        setUserRole(null);
      }
    };
    loadUserRole();
  }, []);

  const assignedPerson =
    currentTask?.assigned_to || currentTask?.assignedTo || null;
  const assignedName = getAssignedToName(assignedPerson);
  const isUnassigned = assignedName === "Unassigned";
  const priorityMeta = getPriorityMeta(currentTask?.priority);
  const statusLabel = getStatusLabel(currentTask);

  const selectedEmployee = useMemo(
    () =>
      employees.find((e) => Number(e.id) === Number(selectedEmployeeId)) ||
      null,
    [employees, selectedEmployeeId]
  );

  const selectedEmployeeLabel = selectedEmployee
    ? `${selectedEmployee.first_name || ""} ${
        selectedEmployee.last_name || ""
      }`.trim() || selectedEmployee.email
    : null;

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) => {
      const name =
        `${employee.first_name || ""} ${employee.last_name || ""}`.toLowerCase();
      const email = String(employee.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [employees, employeeSearch]);

  useEffect(() => {
    const currentId =
      assignedPerson?.id ||
      currentTask?.assignedToUserId ||
      currentTask?.assigned_to_user_id ||
      null;
    if (currentId != null && selectedEmployeeId == null) {
      setSelectedEmployeeId(currentId);
    }
  }, [assignedPerson, currentTask, selectedEmployeeId]);

  const handleUpdate = () => {
    setAssigneeOpen(false);
    setShowUpdateModal(true);
  };

  const handleUpdateSuccess = () => {
    setShowUpdateModal(false);
    refetchTask();
  };

  const onRefresh = async () => {
    await refetchTask();
  };

  const handleDelete = () => {
    setAssigneeOpen(false);
    setTaskToDelete(currentTask);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    const id = taskToDelete.id;
    const title = taskToDelete.title;
    const projId =
      taskToDelete?.project?.id || taskToDelete?.projectId || projectId;

    setDeleteDialogVisible(false);
    setTaskToDelete(null);

    try {
      await deleteMutation.mutateAsync(id);
      Toast.show({
        type: "success",
        text1: "Task Deleted",
        text2: `"${title}" has been deleted`,
      });
      setTimeout(() => {
        if (projId) {
          navigation.navigate("ViewAllTasksScreen", { projectId: projId });
        } else {
          navigation.goBack();
        }
      }, 600);
    } catch {
      Toast.show({
        type: "error",
        text1: "Delete Failed",
        text2: "Failed to delete task. Please try again.",
      });
    }
  };

  const handleAssignTask = async () => {
    if (!selectedEmployee) {
      Toast.show({
        type: "error",
        text1: "Select Employee",
        text2: "Please select an employee first.",
      });
      return;
    }

    const taskIdToUse = currentTask?.id || taskId;
    if (!taskIdToUse) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Task ID not found.",
      });
      return;
    }

    try {
      await assignMutation.mutateAsync({
        taskId: taskIdToUse,
        userId: selectedEmployee.id,
      });
      setAssigneeOpen(false);

      try {
        const raw = await AsyncStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;
        await taskAssignement({
          title: "New Task Assigned",
          message: `You have been assigned a new task: ${
            currentTask.title || currentTask.name
          }`,
          assignedToUserId: Number(selectedEmployee.id),
          fromUserId: user?.id ? Number(user.id) : undefined,
          priority: currentTask.priority || "low",
          taskId: Number(taskIdToUse),
        });
      } catch {
      }

      Toast.show({
        type: "success",
        text1: "Task Assigned",
        text2: `Assigned to ${selectedEmployee.first_name || ""} ${
          selectedEmployee.last_name || ""
        }`.trim(),
      });
      refetchTask();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Assign Failed",
        text2: err?.message || "Failed to assign task.",
      });
    }
  };

  const loading = taskLoading && !currentTask;
  const refreshing = isRefetching;
  const error = taskError
    ? `Unable to load task: ${
        taskError?.response?.data?.message ||
        taskError?.message ||
        "Failed to load task"
      }`
    : null;

  if (loading && !currentTask) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
        <View style={styles.center}>
          <ActivityIndicator color={Brand.ink} />
          <Text style={styles.mutedCenter}>Loading task…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentTask) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
        <View style={styles.center}>
          <Text style={styles.mutedCenter}>Task not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
      <SafeAreaView style={styles.flex} edges={[]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!assigneeOpen}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Brand.ink}
              colors={[Brand.ink]}
            />
          }
        >
          <View style={styles.hero}>
            <View
              style={[
                styles.priorityStripe,
                {
                  backgroundColor: priorityMeta?.color || Brand.ink,
                },
              ]}
            />
            <View style={styles.heroBody}>
              <View style={styles.heroTopRow}>
                <View style={[styles.pillRow, styles.flex]}>
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusPillText}>{statusLabel}</Text>
                  </View>
                  {priorityMeta && (
                    <View
                      style={[
                        styles.priorityPill,
                        { backgroundColor: priorityMeta.bg },
                      ]}
                    >
                      <View
                        style={[
                          styles.priorityDot,
                          { backgroundColor: priorityMeta.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.priorityPillText,
                          { color: priorityMeta.color },
                        ]}
                      >
                        {priorityMeta.label}
                      </Text>
                    </View>
                  )}
                </View>
                {userRole !== "Employee" && (
                  <Menu renderer={OverflowMenuRenderer}>
                    <MenuTrigger>
                      <View style={styles.menuBtn}>
                        <Ionicons
                          name="ellipsis-vertical"
                          size={16}
                          color={Brand.ink}
                        />
                      </View>
                    </MenuTrigger>
                    <MenuOptions
                      customStyles={{ optionsContainer: styles.menuContainer }}
                    >
                      <MenuOption onSelect={handleUpdate}>
                        <View style={styles.menuRow}>
                          <Ionicons
                            name="create-outline"
                            size={17}
                            color={Brand.ink}
                          />
                          <Text style={styles.menuText}>Edit</Text>
                        </View>
                      </MenuOption>
                      <MenuOption onSelect={handleDelete}>
                        <View style={styles.menuRow}>
                          <Ionicons
                            name="trash-outline"
                            size={17}
                            color={Brand.danger}
                          />
                          <Text
                            style={[styles.menuText, { color: Brand.danger }]}
                          >
                            Delete
                          </Text>
                        </View>
                      </MenuOption>
                    </MenuOptions>
                  </Menu>
                )}
              </View>

              <Text style={styles.heroTitle}>
                {currentTask.title || "Untitled Task"}
              </Text>

              {!!currentTask.description && (
                <Text style={styles.heroDesc}>{currentTask.description}</Text>
              )}
            </View>
          </View>
          <View style={[styles.section, { zIndex: assigneeOpen ? 30 : 1 }]}>
            <Text style={styles.sectionLabel}>Assignee</Text>

            {!canManageAssignee ? (
              <View style={styles.assigneeChip}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initialFromName(assignedName)}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.assigneeName}>{assignedName}</Text>
                  {!!assignedPerson?.email && !isUnassigned && (
                    <Text style={styles.assigneeEmail}>
                      {assignedPerson.email}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    Keyboard.dismiss();
                    const next = !assigneeOpen;
                    setAssigneeOpen(next);
                    if (next && employees.length === 0 && !loadingEmployees) {
                      refetchEmployees();
                    }
                  }}
                  style={styles.dropdownTrigger}
                >
                  <View style={styles.dropdownTriggerLeft}>
                    <View style={styles.avatarSm}>
                      <Ionicons
                        name="person-outline"
                        size={14}
                        color={Brand.inkMuted}
                      />
                    </View>
                    <Text
                      style={[
                        styles.dropdownTriggerText,
                        !selectedEmployeeLabel &&
                          isUnassigned &&
                          styles.placeholder,
                      ]}
                      numberOfLines={1}
                    >
                      {loadingEmployees
                        ? "Loading employees…"
                        : selectedEmployeeLabel ||
                          (!isUnassigned ? assignedName : "Select employee")}
                    </Text>
                  </View>
                  <Ionicons
                    name={assigneeOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={Brand.inkFaint}
                  />
                </TouchableOpacity>

                {assigneeOpen && (
                  <View style={styles.dropdownPanel}>
                    <View style={styles.searchRow}>
                      <Ionicons
                        name="search"
                        size={15}
                        color={Brand.inkFaint}
                      />
                      <TextInput
                        value={employeeSearch}
                        onChangeText={setEmployeeSearch}
                        placeholder="Search employees…"
                        placeholderTextColor={Brand.inkFaint}
                        style={styles.searchInput}
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                    </View>

                    {loadingEmployees ? (
                      <View style={styles.dropdownEmpty}>
                        <ActivityIndicator color={Brand.ink} />
                      </View>
                    ) : filteredEmployees.length === 0 ? (
                      <View style={styles.dropdownEmpty}>
                        <Text style={styles.dropdownEmptyText}>
                          No employees found
                        </Text>
                      </View>
                    ) : (
                      filteredEmployees.map((employee, index) => {
                        const name =
                          `${employee.first_name || ""} ${
                            employee.last_name || ""
                          }`.trim() ||
                          employee.email ||
                          "Employee";
                        const selected =
                          Number(selectedEmployeeId) === Number(employee.id);
                        const isLast = index === filteredEmployees.length - 1;
                        return (
                          <TouchableOpacity
                            key={String(employee.id)}
                            activeOpacity={0.75}
                            onPress={() => {
                              setSelectedEmployeeId(employee.id);
                              setAssigneeOpen(false);
                              setEmployeeSearch("");
                            }}
                            style={[
                              styles.dropdownItem,
                              selected && styles.dropdownItemSelected,
                              isLast && { borderBottomWidth: 0 },
                            ]}
                          >
                            <View style={styles.avatarSm}>
                              <Text style={styles.avatarSmText}>
                                {initialFromName(name)}
                              </Text>
                            </View>
                            <View style={styles.flex}>
                              <Text style={styles.dropdownItemName}>
                                {name}
                              </Text>
                              {!!employee.email && (
                                <Text
                                  style={styles.dropdownItemEmail}
                                  numberOfLines={1}
                                >
                                  {employee.email}
                                </Text>
                              )}
                            </View>
                            {selected && (
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color={Brand.ink}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}

                {selectedEmployeeId != null &&
                  (isUnassigned ||
                    Number(selectedEmployeeId) !==
                      Number(
                        assignedPerson?.id ||
                          currentTask?.assignedToUserId ||
                          NaN
                      )) && (
                    <TouchableOpacity
                      style={[styles.assignBtn, assigning && { opacity: 0.65 }]}
                      onPress={handleAssignTask}
                      disabled={assigning}
                      activeOpacity={0.85}
                    >
                      {assigning ? (
                        <ActivityIndicator color={Brand.onInk} />
                      ) : (
                        <Text style={styles.assignBtnText}>
                          {isUnassigned ? "Assign employee" : "Update assignee"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
              </View>
            )}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Schedule</Text>
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={Brand.ink}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.scheduleKey}>Starts</Text>
                  <Text style={styles.scheduleVal}>
                    {formatDateTime(currentTask.startTime)}
                  </Text>
                </View>
              </View>
              <View style={styles.scheduleDivider} />
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleIcon}>
                  <Ionicons name="flag-outline" size={16} color={Brand.ink} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.scheduleKey}>Ends</Text>
                  <Text style={styles.scheduleVal}>
                    {currentTask.endTime
                      ? formatDateTime(currentTask.endTime)
                      : "Not set"}
                  </Text>
                </View>
              </View>
              <View style={styles.scheduleDivider} />
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleIcon}>
                  <Ionicons name="time-outline" size={16} color={Brand.ink} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.scheduleKey}>Created</Text>
                  <Text style={styles.scheduleVal}>
                    {formatDateTime(currentTask.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <UpdateTaskModal
        visible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        task={currentTask}
        projectId={currentTask?.project?.id}
        projectName={currentTask?.project?.name}
        onSuccess={handleUpdateSuccess}
      />

      <Modal
        visible={deleteDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteDialogVisible(false);
          setTaskToDelete(null);
        }}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrap}>
              <Ionicons name="trash-outline" size={22} color={Brand.danger} />
            </View>
            <Text style={styles.dialogTitle}>Delete this task?</Text>
            <Text style={styles.dialogBody}>
              "{taskToDelete?.title}" will be permanently removed. This cannot
              be undone.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancel}
                onPress={() => {
                  setDeleteDialogVisible(false);
                  setTaskToDelete(null);
                }}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogDelete}
                onPress={confirmDelete}
              >
                <Text style={styles.dialogDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.paper,
  },
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  mutedCenter: {
    fontSize: 14,
    color: Brand.inkMuted,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 15,
    color: Brand.danger,
    textAlign: "center",
    marginBottom: 4,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
  },

  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.paper,
    overflow: "hidden",
    marginBottom: 22,
  },
  priorityStripe: {
    height: 4,
    width: "100%",
  },
  heroBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Brand.paperSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.ink,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.inkSoft,
  },
  priorityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Brand.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  heroDesc: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: Brand.inkMuted,
  },

  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Brand.inkFaint,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  assigneeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.paper,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Brand.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Brand.onInk,
    fontSize: 16,
    fontWeight: "800",
  },
  assigneeName: {
    fontSize: 15,
    fontWeight: "700",
    color: Brand.ink,
  },
  assigneeEmail: {
    marginTop: 2,
    fontSize: 12,
    color: Brand.inkMuted,
  },
  avatarSm: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmText: {
    fontSize: 12,
    fontWeight: "800",
    color: Brand.ink,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: Brand.ink,
    backgroundColor: Brand.paper,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  dropdownTriggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  dropdownTriggerText: {
    fontSize: 15,
    fontWeight: "600",
    color: Brand.ink,
    flex: 1,
  },
  placeholder: {
    color: Brand.inkFaint,
    fontWeight: "500",
  },
  dropdownPanel: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    backgroundColor: Brand.paper,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
    backgroundColor: Brand.paperSoft,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Brand.ink,
    paddingVertical: 2,
  },
  dropdownEmpty: {
    paddingVertical: 28,
    alignItems: "center",
  },
  dropdownEmptyText: {
    fontSize: 13,
    color: Brand.inkMuted,
    fontWeight: "500",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  dropdownItemSelected: {
    backgroundColor: Brand.paperSoft,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.ink,
  },
  dropdownItemEmail: {
    marginTop: 2,
    fontSize: 12,
    color: Brand.inkMuted,
  },
  assignBtn: {
    marginTop: 12,
    backgroundColor: Brand.ink,
    borderRadius: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  assignBtnText: {
    color: Brand.onInk,
    fontSize: 15,
    fontWeight: "800",
  },

  scheduleCard: {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    backgroundColor: Brand.paper,
    overflow: "hidden",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  scheduleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleKey: {
    fontSize: 12,
    fontWeight: "600",
    color: Brand.inkFaint,
    marginBottom: 2,
  },
  scheduleVal: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.ink,
  },
  scheduleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Brand.line,
    marginLeft: 60,
  },

  menuContainer: {
    backgroundColor: Brand.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingVertical: 4,
    width: 148,
    marginTop: 6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "600",
    color: Brand.ink,
  },

  primaryBtn: {
    backgroundColor: Brand.ink,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: Brand.onInk,
    fontWeight: "700",
    fontSize: 15,
  },

  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(35, 31, 32, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: Brand.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 22,
  },
  dialogIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Brand.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  dialogBody: {
    fontSize: 14,
    color: Brand.inkMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  dialogActions: {
    flexDirection: "row",
    gap: 10,
  },
  dialogCancel: {
    flex: 1,
    backgroundColor: Brand.paperSoft,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Brand.line,
  },
  dialogCancelText: {
    color: Brand.ink,
    fontWeight: "700",
  },
  dialogDelete: {
    flex: 1,
    backgroundColor: Brand.danger,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  dialogDeleteText: {
    color: Brand.onInk,
    fontWeight: "700",
  },
});

export default TaskDetailsScreen;
