// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  RefreshControl,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ListTodo } from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTasksByProjectId,
  selectTasks,
  selectTaskLoading,
} from "../store/slices/taskSlice";
import {
  fetchLogsByProjectId,
  selectLogs,
} from "../store/slices/logSlice";
import { getProjectById } from "../services/projects/getProject";
import { getEmployeesAssignedToProject } from "../services/projects/getEmployeesAssignedToProject";
import HomeBottomNav from "../components/HomeBottomNav";
import UpdateProjectModal from "../components/UpdateProjectModal";
import CreateTask from "../components/CreateTask";
import { Brand } from "../constants/brandColors";
import { useAuth } from "../context/AuthContext";

const TABS = ["Overview", "Tasks", "Team", "Logs"];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getProjectMeta(project, tasks = []) {
  const total = tasks.length;
  const completed = tasks.filter((t) => {
    const status = String(t.status || t.taskStatus || "").toLowerCase();
    return status === "done" || status === "completed" || t.isCompleted;
  }).length;
  const progress =
    total > 0 ? Math.round((completed / total) * 100) : project?.startDate ? 60 : 20;

  if (!project?.startDate) {
    return { label: "Planning", tone: "planning", progress };
  }
  const start = new Date(project.startDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || start > now) {
    return { label: "Planning", tone: "planning", progress };
  }
  if (total > 0 && completed === total) {
    return { label: "Completed", tone: "done", progress: 100 };
  }
  return { label: "In Progress", tone: "progress", progress };
}

function taskStatusMeta(task) {
  const status = String(task.status || task.taskStatus || "").toLowerCase();
  if (status === "done" || status === "completed" || task.isCompleted) {
    return { label: "Done", color: "#1B7A4A", bg: "#E8F8EF", icon: "checkmark-circle" };
  }
  if (status === "in progress" || status === "in_progress" || status === "active") {
    return { label: "In Progress", color: "#2563EB", bg: "#E8F1FF", icon: "ellipse-outline" };
  }
  return { label: "Pending", color: "#C05621", bg: "#FFF1E8", icon: "ellipse-outline" };
}

function SectionHeader({ icon, title, right }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Ionicons name={icon} size={18} color={Brand.ink} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function EmptyWidgetState({ icon, title }) {
  return (
    <View style={styles.emptyWidget}>
      <View style={styles.emptyWidgetIcon}>
        <Ionicons name={icon} size={28} color={Brand.inkFaint} />
      </View>
      <Text style={styles.emptyWidgetTitle}>{title}</Text>
    </View>
  );
}

function ProjectDetailsSkeleton() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const Bone = ({ style }) => (
    <Animated.View
      style={[
        { backgroundColor: Brand.line, borderRadius: 8, opacity: pulse },
        style,
      ]}
    />
  );

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Bone style={{ width: 72, height: 72, borderRadius: 14 }} />
        <View style={styles.heroMain}>
          <View style={styles.heroTitleRow}>
            <Bone style={{ flex: 1, height: 20, marginRight: 12 }} />
            <Bone style={{ width: 72, height: 24, borderRadius: 12 }} />
          </View>
          <Bone style={{ width: "85%", height: 12, marginTop: 10 }} />
          <Bone style={{ width: "45%", height: 11, marginTop: 10 }} />
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressLabels}>
          <Bone style={{ width: 110, height: 12 }} />
          <Bone style={{ width: 36, height: 12 }} />
        </View>
        <Bone style={{ width: "100%", height: 8, borderRadius: 6 }} />
      </View>

      <View style={styles.skeletonTabs}>
        {[72, 56, 52, 48].map((width) => (
          <Bone
            key={width}
            style={{ width, height: 14, borderRadius: 6 }}
          />
        ))}
      </View>

      <View style={styles.contentPad}>
        <View style={styles.skeletonSectionHead}>
          <Bone style={{ width: 140, height: 16 }} />
          <Bone style={{ width: 64, height: 14 }} />
        </View>
        {[0, 1, 2].map((i) => (
          <View key={`task-sk-${i}`} style={styles.skeletonTaskCard}>
            <Bone style={{ width: 22, height: 22, borderRadius: 11 }} />
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Bone style={{ width: "70%", height: 13, marginBottom: 8 }} />
              <Bone style={{ width: "45%", height: 11 }} />
            </View>
            <Bone style={{ width: 64, height: 24, borderRadius: 12 }} />
          </View>
        ))}

        <View style={[styles.skeletonSectionHead, { marginTop: 18 }]}>
          <Bone style={{ width: 130, height: 16 }} />
          <Bone style={{ width: 64, height: 14 }} />
        </View>
        {[0, 1].map((i) => (
          <View key={`log-sk-${i}`} style={styles.skeletonLogRow}>
            <Bone style={{ width: 36, height: 36, borderRadius: 10 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Bone style={{ width: "80%", height: 12, marginBottom: 8 }} />
              <Bone style={{ width: "35%", height: 11 }} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function ProjectDetailsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { userRole } = useAuth();
  const tasks = useSelector(selectTasks);
  const tasksLoading = useSelector(selectTaskLoading);
  const logs = useSelector(selectLogs);

  const { projectId, projectName } = route.params || {};
  const [activeTab, setActiveTab] = useState("Overview");
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updateVisible, setUpdateVisible] = useState(false);
  const [createTaskVisible, setCreateTaskVisible] = useState(false);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (!projectId) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [projectData, teamData] = await Promise.all([
          getProjectById(projectId).catch(() => null),
          getEmployeesAssignedToProject(projectId).catch(() => []),
        ]);

        setProject(projectData || { id: projectId, name: projectName });
        setTeam(Array.isArray(teamData) ? teamData : teamData?.employees || []);

        await Promise.all([
          dispatch(fetchTasksByProjectId(projectId)),
          dispatch(fetchLogsByProjectId(projectId)),
        ]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dispatch, projectId, projectName]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const meta = useMemo(
    () => getProjectMeta(project, tasks),
    [project, tasks]
  );

  const displayTasks = tasks || [];
  const displayLogs = logs || [];

  const canManage =
    userRole === "Owner" || userRole === "Admin" || userRole === "Manager";

  const recentTasks = tasksLoading ? [] : displayTasks.slice(0, 3);
  const recentLogs = displayLogs.slice(0, 3);

  const renderOverview = () => (
    <>
      <SectionHeader
        icon="checkbox-outline"
        title={`Recent Tasks (${displayTasks.length})`}
        right={
          <View style={styles.rowActions}>
            {canManage && (
              <TouchableOpacity
                onPress={() => setCreateTaskVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.linkAction}>+ Add Task</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ViewAllTasksScreen", {
                  projectId,
                  projectName: project?.name || projectName,
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.viewAll}>View All ›</Text>
            </TouchableOpacity>
          </View>
        }
      />
      {recentTasks.length > 0 ? (
        recentTasks.map((task) => {
          const status = taskStatusMeta(task);
          const assignee =
            task.assignedTo
              ? `${task.assignedTo.firstName || task.assignedTo.first_name || ""} ${
                  task.assignedTo.lastName || task.assignedTo.last_name || ""
                }`.trim()
              : task.assigneeName || "Unassigned";
          return (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("TaskDetails", { taskId: task.id })
              }
            >
              <Ionicons name={status.icon} size={20} color={status.color} />
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.title || task.name || "Untitled task"}
                </Text>
                <Text style={styles.taskMeta} numberOfLines={1}>
                  {assignee} ·{" "}
                  {formatDate(
                    task.endTime ||
                      task.dueDate ||
                      task.startTime ||
                      task.startDate ||
                      task.createdAt
                  )}
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusPillText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        !tasksLoading && (
          <EmptyWidgetState
            icon="checkbox-outline"
            title="No task assigned"
          />
        )
      )}

      <SectionHeader
        icon="document-text-outline"
        title={`Recent Logs (${displayLogs.length})`}
        right={
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("ViewAllLogScreen", {
                projectId,
                projectName: project?.name || projectName,
                logs: displayLogs,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.viewAll}>View All ›</Text>
          </TouchableOpacity>
        }
      />
      {recentLogs.length > 0 ? (
        recentLogs.map((log) => (
          <TouchableOpacity
            key={log.id}
            style={styles.activityRow}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("LogsDetail", { logId: log.id })
            }
          >
            <View style={styles.activityIcon}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={Brand.ink}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle} numberOfLines={2}>
                {log.note || log.description || "Log entry added"}
              </Text>
              <Text style={styles.activityMeta}>
                {formatDate(log.createdAt || log.date)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <EmptyWidgetState
          icon="document-text-outline"
          title="No logs created"
        />
      )}
    </>
  );

  const renderTasksTab = () => (
    <>
      <SectionHeader
        icon="checkbox-outline"
        title="All Tasks"
        right={
          canManage ? (
            <TouchableOpacity onPress={() => setCreateTaskVisible(true)}>
              <Text style={styles.linkAction}>+ Add Task</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {displayTasks.length > 0 ? (
        displayTasks.map((task) => {
          const status = taskStatusMeta(task);
          return (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() =>
                navigation.navigate("TaskDetails", { taskId: task.id })
              }
            >
              <Ionicons name={status.icon} size={20} color={status.color} />
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.title || task.name || "Untitled task"}
                </Text>
                <Text style={styles.taskMeta}>
                  {formatDate(
                    task.endTime || task.dueDate || task.startTime || task.createdAt
                  )}
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusPillText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <EmptyWidgetState icon="checkbox-outline" title="No task assigned" />
      )}
    </>
  );

  const renderTeamTab = () => (
    <>
      <SectionHeader
        icon="people-outline"
        title="Assigned Team"
        right={
          canManage ? (
            <TouchableOpacity
              onPress={() => navigation.navigate("PersonalScreen")}
            >
              <Text style={styles.linkAction}>+ Add Member</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {team.map((member, index) => {
        const name =
          `${member.firstName || member.user?.firstName || ""} ${
            member.lastName || member.user?.lastName || ""
          }`.trim() ||
          member.name ||
          "Member";
        const role =
          member.role?.name || member.user?.role?.name || "Crew";
        return (
          <View key={member.id || index} style={styles.teamListRow}>
            <View style={styles.teamAvatar}>
              <Text style={styles.teamInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.teamName}>{name}</Text>
              <Text style={styles.teamRole}>{role}</Text>
            </View>
          </View>
        );
      })}
      {team.length === 0 && (
        <Text style={styles.emptyInline}>No team members assigned</Text>
      )}
    </>
  );

  const renderLogsTab = () => (
    <>
      <SectionHeader
        icon="document-text-outline"
        title="Logs"
        right={
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("ViewAllLogScreen", {
                projectId,
                projectName: project?.name || projectName,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.viewAll}>View All ›</Text>
          </TouchableOpacity>
        }
      />
      {displayLogs.length > 0 ? (
        displayLogs.map((log) => (
          <TouchableOpacity
            key={log.id}
            style={styles.activityRow}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("LogsDetail", {
                logId: log.id,
              })
            }
          >
            <View style={styles.activityIcon}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={Brand.ink}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>
                {log.note || log.description || "Log entry"}
              </Text>
              <Text style={styles.activityMeta}>
                {formatDate(log.createdAt || log.date)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <EmptyWidgetState
          icon="document-text-outline"
          title="No logs created"
        />
      )}
    </>
  );

  const tabBody = () => {
    switch (activeTab) {
      case "Tasks":
        return renderTasksTab();
      case "Team":
        return renderTeamTab();
      case "Logs":
        return renderLogsTab();
      default:
        return renderOverview();
    }
  };

  if (!projectId) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.emptyInline}>Project not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkAction}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />

      {loading ? (
        <ProjectDetailsSkeleton />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAll(true)}
              tintColor={Brand.ink}
              colors={[Brand.ink]}
            />
          }
        >
          <View style={styles.heroCard}>
            {project?.imageUrl ? (
              <Image
                source={{ uri: project.imageUrl }}
                style={styles.heroImage}
              />
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <Ionicons name="business" size={28} color={Brand.ink} />
              </View>
            )}
            <View style={styles.heroMain}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {project?.name || projectName || "Project"}
                </Text>
                <View style={styles.heroTitleActions}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          meta.tone === "planning"
                            ? "#E8F1FF"
                            : meta.tone === "done"
                              ? "#F3F4F6"
                              : "#E8F8EF",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            meta.tone === "planning"
                              ? "#2563EB"
                              : meta.tone === "done"
                                ? Brand.inkMuted
                                : "#1B7A4A",
                        },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </View>
                  {canManage && (
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => setUpdateVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="create-outline"
                        size={14}
                        color={Brand.ink}
                      />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Text style={styles.heroSub} numberOfLines={2}>
                {project?.description?.trim() ||
                  project?.company?.name ||
                  "No description"}
              </Text>
              <View style={styles.heroMeta}>
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={Brand.inkFaint}
                />
                <Text style={styles.heroMetaText}>
                  {formatDate(project?.startDate)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLeft}>{meta.progress}% Complete</Text>
              <Text style={styles.progressRight}>{meta.progress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${meta.progress}%` }]}
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={styles.tabBtn}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {tab}
                  </Text>
                  {active && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.contentPad}>{tabBody()}</View>
        </ScrollView>
      )}

      <HomeBottomNav
        onAddPress={() => {
          if (canManage) {
            setCreateTaskVisible(true);
          }
        }}
      />

      <UpdateProjectModal
        visible={updateVisible}
        project={project}
        onClose={() => setUpdateVisible(false)}
        onSuccess={() => {
          setUpdateVisible(false);
          loadAll(true);
        }}
      />

      <Modal
        visible={createTaskVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setCreateTaskVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: Brand.paper }}>
          <SafeAreaView
            style={{ backgroundColor: Brand.paper }}
            edges={["top"]}
          >
            <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
            <View style={styles.createTaskHeader}>
              <ListTodo size={20} color={Brand.ink} strokeWidth={2} />
              <Text style={styles.createTaskHeaderTitle}>Create Task</Text>
            </View>
          </SafeAreaView>
          <CreateTask
            hideHeader
            projectId={projectId}
            projectName={project?.name || projectName}
            onCancel={() => setCreateTaskVisible(false)}
            onSuccess={() => {
              setCreateTaskVisible(false);
              loadAll(true);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  flex: { flex: 1 },
  createTaskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
    backgroundColor: Brand.paper,
  },
  createTaskHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Brand.ink,
    letterSpacing: -0.25,
  },
  center: { alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Brand.ink,
  },
  heroCard: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: Brand.paperSoft,
  },
  heroPlaceholder: {
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMain: { flex: 1, marginLeft: 12 },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  heroTitleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  heroTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: Brand.ink,
    letterSpacing: -0.3,
  },
  heroSub: {
    marginTop: 4,
    fontSize: 13,
    color: Brand.inkMuted,
    lineHeight: 18,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  heroMetaText: {
    marginLeft: 4,
    fontSize: 12,
    color: Brand.inkFaint,
    fontWeight: "500",
  },
  progressBlock: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLeft: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.inkSoft,
  },
  progressRight: {
    fontSize: 13,
    fontWeight: "700",
    color: Brand.ink,
  },
  progressTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "#EEF0F3",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Brand.ink,
    borderRadius: 6,
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  tabBtn: {
    paddingBottom: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Brand.inkFaint,
  },
  tabTextActive: {
    color: Brand.ink,
    fontWeight: "800",
  },
  tabUnderline: {
    marginTop: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.ink,
  },
  contentPad: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  skeletonTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  skeletonSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 4,
  },
  skeletonTaskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.paperSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  skeletonLogRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Brand.ink,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.ink,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkAction: {
    fontSize: 13,
    fontWeight: "700",
    color: Brand.ink,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.inkMuted,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  infoCard: {
    width: "48%",
    backgroundColor: "#F7F8FA",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: Brand.inkMuted,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.ink,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ownerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  teamRow: {
    gap: 14,
    paddingBottom: 8,
    marginBottom: 8,
  },
  teamItem: {
    width: 78,
    alignItems: "center",
  },
  teamAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  moreAvatar: {
    backgroundColor: Brand.ink,
    borderColor: Brand.ink,
  },
  moreText: {
    color: Brand.onInk,
    fontWeight: "700",
    fontSize: 12,
  },
  teamInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: Brand.ink,
  },
  onlineDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22A05A",
    borderWidth: 2,
    borderColor: Brand.paper,
  },
  teamName: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.ink,
    textAlign: "center",
  },
  teamRole: {
    fontSize: 11,
    color: Brand.inkMuted,
    textAlign: "center",
  },
  teamListRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  taskStats: {
    fontSize: 13,
    color: Brand.inkMuted,
    marginBottom: 10,
    fontWeight: "500",
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.ink,
  },
  taskMeta: {
    marginTop: 3,
    fontSize: 12,
    color: Brand.inkMuted,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.paperSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Brand.ink,
    lineHeight: 19,
  },
  activityMeta: {
    marginTop: 3,
    fontSize: 12,
    color: Brand.inkFaint,
  },
  docCard: {
    width: 130,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    backgroundColor: Brand.paper,
    padding: 12,
  },
  docIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  docName: {
    fontSize: 13,
    fontWeight: "700",
    color: Brand.ink,
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 11,
    color: Brand.inkFaint,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  emptyInline: {
    fontSize: 13,
    color: Brand.inkMuted,
    paddingVertical: 8,
  },
  emptyWidget: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Brand.paperSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  emptyWidgetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.paper,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  emptyWidgetTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.inkMuted,
    textAlign: "center",
  },
});
