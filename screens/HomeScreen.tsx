// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Keyboard,
  FlatList,
  useWindowDimensions,
  Platform,
  TouchableWithoutFeedback,
  Modal,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Image,
  StatusBar,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Folder } from "lucide-react-native";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

function OverflowMenuRenderer({ style, children, layouts, ...other }) {
  const { windowLayout, triggerLayout, optionsLayout } = layouts;
  const gap = 6;
  const menuW = optionsLayout.width || 148;
  const menuH = optionsLayout.height || 88;
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
    <View
      {...other}
      style={[
        {
          position: "absolute",
          top,
          left,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
import {
  useProjectsList,
  useDeleteProjectMutation,
} from "../hooks/queries";
import Sidebar from "../components/Sidebar";
import CreateProject from "../components/CreateProject";
import UpdateProjectModal from "../components/UpdateProjectModal";
import { sendInvite } from "../services/auth/SendInvite";
import { getUserById } from "../services/user/getUserById";
import { useAuth } from "../context/AuthContext";
import { Brand } from "../constants/brandColors";
import appEmitter from "../utils/appEmitter";

const STATUS_STYLES = {
  planning: { bg: "#E8F1FF", text: "#2563EB", bar: "#3B82F6" },
  progress: { bg: "#E8F8EF", text: "#1B7A4A", bar: "#22A05A" },
  hold: { bg: "#FFF1E8", text: "#C05621", bar: "#F08A3C" },
};

function getProjectMeta(project) {
  if (!project?.startDate) {
    return { label: "Planning", key: "planning", progress: 20 };
  }
  const start = new Date(project.startDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || start > now) {
    return { label: "Planning", key: "planning", progress: 20 };
  }
  return { label: "In Progress", key: "progress", progress: 60 };
}

function ProjectCardSkeleton() {
  const pulse = React.useRef(new Animated.Value(0.45)).current;

  React.useEffect(() => {
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
      style={[{ backgroundColor: Brand.line, borderRadius: 8, opacity: pulse }, style]}
    />
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Bone style={{ width: 56, height: 56, borderRadius: 12 }} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Bone style={{ width: "70%", height: 14, marginBottom: 8 }} />
          <Bone style={{ width: "50%", height: 11, marginBottom: 8 }} />
          <Bone style={{ width: "40%", height: 11 }} />
        </View>
        <Bone style={{ width: 72, height: 24, borderRadius: 12 }} />
      </View>
      <Bone style={{ width: "100%", height: 6, borderRadius: 4, marginTop: 14 }} />
    </View>
  );
}

function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { userRole, userInfo } = useAuth();

  const {
    data: projectsData,
    isLoading: projectsLoading,
    isFetching,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjectsList();
  const deleteProjectMutation = useDeleteProjectMutation();

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const loading = projectsLoading;
  const error = projectsError
    ? (projectsError?.response?.data?.message || projectsError?.message || "Failed to load projects")
    : null;

  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [createProjectModalVisible, setCreateProjectModalVisible] =
    useState(false);
  const [updateProjectModalVisible, setUpdateProjectModalVisible] =
    useState(false);
  const userName =
    `${userInfo?.firstName || ""} ${userInfo?.lastName || ""}`.trim() ||
    userRole ||
    "there";
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [invitePopupVisible, setInvitePopupVisible] = useState(false);
  const [projectToInvite, setProjectToInvite] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteErrorDialogVisible, setInviteErrorDialogVisible] =
    useState(false);
  const [inviteErrorMessage, setInviteErrorMessage] = useState("");
  const [currentUserCompanyId, setCurrentUserCompanyId] = useState(null);

  const isProjectsLoading = loading || isLoading;
  const showSkeletons = isProjectsLoading && !refreshing;
  const canCreate =
    userRole && userRole !== "Employee" && userRole !== "Manager";
  const canManage = canCreate;

  useEffect(() => {
    setIsLoading(projectsLoading && projects.length === 0);
  }, [projectsLoading, projects.length]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProjects(projects);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredProjects(
        projects.filter(
          (project) =>
            project.name?.toLowerCase().includes(q) ||
            project.description?.toLowerCase().includes(q)
        )
      );
    }
  }, [projects, searchTerm]);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const existingCompanyId =
          userInfo?.company?.id || userInfo?.company_id || null;
        if (existingCompanyId) {
          setCurrentUserCompanyId(existingCompanyId);
          return;
        }

        const userId = userInfo?.id;
        if (userId) {
          const userData = await getUserById(userId);
          setCurrentUserCompanyId(
            userData?.company?.id || userData?.company_id || null
          );
        }
      } catch (err) {
        console.error("Error loading current user company:", err);
      }
    };
    loadCompany();
  }, [userInfo?.id, userInfo?.company?.id, userInfo?.company_id]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      show?.remove();
      hide?.remove();
    };
  }, []);

  useEffect(() => {
    const openCreate = () => setCreateProjectModalVisible(true);
    appEmitter.on("home-fab-press", openCreate);
    return () => appEmitter.off("home-fab-press", openCreate);
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refetchProjects().finally(() => setRefreshing(false));
  }, [refetchProjects]);

  const formatDate = (dateString) => {
    if (!dateString) return "No start date";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "No start date";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleUpdate = (project) => {
    setSelectedProject(project);
    setUpdateProjectModalVisible(true);
  };

  const handleInvite = (project) => {
    if (!project?.id) return;
    setProjectToInvite(project);
    setInviteEmail("");
    setInvitePopupVisible(true);
  };

  const handleDelete = (project) => {
    if (!project?.id) return;
    setProjectToDelete(project);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    const projectId = projectToDelete.id;
    const projectName = projectToDelete.name;
    setDeleteDialogVisible(false);
    setProjectToDelete(null);

    try {
      await deleteProjectMutation.mutateAsync(projectId);
      Toast.show({
        type: "success",
        text1: "Project Deleted Successfully!",
        text2: `"${projectName}" has been permanently deleted`,
        visibilityTime: 3000,
        topOffset: 80,
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Delete Failed",
        text2: "Failed to delete project. Please try again.",
        visibilityTime: 4000,
        topOffset: 80,
      });
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      Toast.show({
        type: "error",
        text1: "Email Required",
        text2: "Please enter an email address",
        visibilityTime: 3000,
        topOffset: 80,
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid email address",
        visibilityTime: 3000,
        topOffset: 80,
      });
      return;
    }
    if (!projectToInvite?.id) return;

    setIsSendingInvite(true);
    try {
      await sendInvite(inviteEmail.trim(), projectToInvite.id);
      const sentEmail = inviteEmail;
      setInvitePopupVisible(false);
      setProjectToInvite(null);
      setInviteEmail("");
      Toast.show({
        type: "success",
        text1: "Invite Sent Successfully!",
        text2: `Invitation sent to ${sentEmail}`,
        visibilityTime: 3000,
        topOffset: 80,
      });
    } catch (error) {
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to send invitation. Please try again.";
      setInvitePopupVisible(false);
      setInviteErrorMessage(errorMessage);
      setInviteErrorDialogVisible(true);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCreateProjectSuccess = () => {
    setCreateProjectModalVisible(false);
    refetchProjects();
  };

  const ProjectCard = ({ project }) => {
    const meta = getProjectMeta(project);
    const tone = STATUS_STYLES[meta.key];
    const subtitle =
      project.description?.trim() ||
      project.company?.name ||
      "No description yet";
    const showCompany =
      project.company &&
      currentUserCompanyId &&
      project.company.id !== currentUserCompanyId;

    const openDetails = () =>
      navigation.navigate("ProjectDetails", {
        projectId: project.id,
        projectName: project.name,
        imageUrl: project.imageUrl || project.image_url || null,
      });

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <TouchableOpacity
            style={styles.cardPressArea}
            activeOpacity={0.9}
            onPress={openDetails}
          >
            {project.imageUrl ? (
              <Image
                source={{ uri: project.imageUrl }}
                style={styles.thumbImage}
              />
            ) : (
              <View style={styles.thumb}>
                <Ionicons name="business" size={22} color={Brand.ink} />
              </View>
            )}

            <View style={styles.cardMain}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {project.name}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.statusText, { color: tone.text }]}>
                    {meta.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>

              <View style={styles.metaRow}>
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={Brand.inkFaint}
                />
                <Text style={styles.metaText} numberOfLines={1}>
                  {formatDate(project.startDate)}
                </Text>
                {showCompany && (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {project.company.name}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {canManage ? (
            <Menu renderer={OverflowMenuRenderer}>
              <MenuTrigger
                customStyles={{
                  triggerWrapper: styles.menuBtn,
                }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={16}
                  color={Brand.inkSoft}
                />
              </MenuTrigger>
              <MenuOptions
                customStyles={{
                  optionsContainer: styles.menuDropdown,
                  optionWrapper: styles.menuItem,
                }}
              >
                <MenuOption onSelect={() => handleUpdate(project)}>
                  <View style={styles.menuItemInner}>
                    <Ionicons name="create-outline" size={17} color={Brand.ink} />
                    <Text style={styles.menuItemText}>Edit</Text>
                  </View>
                </MenuOption>
                <MenuOption onSelect={() => handleDelete(project)}>
                  <View style={styles.menuItemInner}>
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={Brand.danger}
                    />
                    <Text style={[styles.menuItemText, { color: Brand.danger }]}>
                      Delete
                    </Text>
                  </View>
                </MenuOption>
              </MenuOptions>
            </Menu>
          ) : (
            <TouchableOpacity onPress={openDetails} hitSlop={8}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Brand.inkFaint}
                style={{ marginTop: 4 }}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={openDetails}>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${meta.progress}%`, backgroundColor: Brand.ink },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>{meta.progress}%</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const listData = showSkeletons
    ? Array.from({ length: 5 }, (_, i) => ({ id: `sk-${i}` }))
    : filteredProjects;

  const ListHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.greetingRow}>
        <TouchableOpacity
          style={styles.menuCircle}
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="menu" size={20} color={Brand.ink} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.helloText} numberOfLines={1}>
            Hello, {userName} 👋
          </Text>
          <Text style={styles.helloSub} numberOfLines={2}>
            Manage your projects and team efficiently.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.profileCircle}
          onPress={() => navigation.navigate("AccountInfo")}
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={20} color={Brand.inkSoft} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionRow}>
        <View style={styles.sectionLeft}>
          <Text style={styles.sectionTitle}>Projects</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {showSkeletons ? "—" : filteredProjects.length}
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setCreateProjectModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={Brand.onInk} />
            <Text style={styles.createBtnText}>Create Project</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons
            name="search"
            size={18}
            color={Brand.inkFaint}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor={Brand.inkFaint}
            value={searchTerm}
            onChangeText={setSearchTerm}
            editable={!showSkeletons}
            returnKeyType="search"
          />
          {!!searchTerm && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={18} color={Brand.inkFaint} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={20} color={Brand.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.flex}>
          <FlatList
            data={listData}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 110,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            refreshControl={
              showSkeletons ? undefined : (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[Brand.ink]}
                  tintColor={Brand.ink}
                />
              )
            }
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={() => (
              <View
                style={[
                  styles.emptyWrap,
                  { minHeight: screenHeight * 0.35 },
                ]}
              >
                {error ? (
                  <>
                    <Text style={styles.emptyError}>{error}</Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => refetchProjects()}
                    >
                      <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="folder-open-outline"
                      size={36}
                      color={Brand.inkFaint}
                    />
                    <Text style={styles.emptyTitle}>
                      {searchTerm.trim()
                        ? "No matching projects"
                        : "No projects yet"}
                    </Text>
                    <Text style={styles.emptySub}>
                      {searchTerm.trim()
                        ? "Try a different search."
                        : "Create a project to get started."}
                    </Text>
                  </>
                )}
              </View>
            )}
            renderItem={({ item }) =>
              showSkeletons ? (
                <ProjectCardSkeleton />
              ) : (
                <ProjectCard project={item} />
              )
            }
          />
        </View>
      </TouchableWithoutFeedback>

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={(itemId) => {
          setSidebarVisible(false);
          if (itemId === "chats") {
            navigation.navigate("MainTabs", { screen: "ChatScreen" });
          }
          if (itemId === "files") navigation.navigate("FilesScreen");
          if (itemId === "personnel") navigation.navigate("PersonalScreen");
        }}
        onLogoutComplete={() => {
          setSidebarVisible(false);
        }}
      />

      <Modal
        visible={createProjectModalVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setCreateProjectModalVisible(false)}
      >
        {createProjectModalVisible ? (
          <View style={{ flex: 1, backgroundColor: Brand.paper }}>
            <SafeAreaView
              style={{ backgroundColor: Brand.paper }}
              edges={["top"]}
            >
              <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
              <View style={styles.createProjectHeader}>
                <Folder size={20} color={Brand.ink} strokeWidth={2} />
                <Text style={styles.createProjectHeaderTitle}>Create Project</Text>
              </View>
            </SafeAreaView>
            <CreateProject
              hideHeader
              navigation={{
                goBack: () => setCreateProjectModalVisible(false),
              }}
              onSuccess={handleCreateProjectSuccess}
              onCancel={() => setCreateProjectModalVisible(false)}
            />
          </View>
        ) : null}
      </Modal>

      <UpdateProjectModal
        visible={updateProjectModalVisible}
        project={selectedProject}
        onClose={() => {
          setUpdateProjectModalVisible(false);
          setSelectedProject(null);
        }}
        onSuccess={() => {
          setUpdateProjectModalVisible(false);
          setSelectedProject(null);
          refetchProjects();
          Toast.show({
            type: "success",
            text1: "Project Updated Successfully!",
            text2: "Your project changes have been saved",
            visibilityTime: 3000,
            topOffset: 80,
          });
        }}
      />

      <Modal
        visible={deleteDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteDialogVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Project</Text>
            <Text style={styles.modalBody}>
              Delete "{projectToDelete?.name}" permanently? This cannot be
              undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteDialogVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDanger}
                onPress={confirmDelete}
              >
                <Text style={styles.modalDangerText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={invitePopupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInvitePopupVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setInvitePopupVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { maxWidth: 300 }]}>
                <Text style={styles.modalTitle}>
                  Invite to {projectToInvite?.name}
                </Text>
                <TextInput
                  style={styles.inviteInput}
                  placeholder="Enter email address"
                  placeholderTextColor={Brand.inkFaint}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onSubmitEditing={handleSendInvite}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => setInvitePopupVisible(false)}
                    disabled={isSendingInvite}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPrimary}
                    onPress={handleSendInvite}
                    disabled={isSendingInvite}
                  >
                    {isSendingInvite ? (
                      <ActivityIndicator size="small" color={Brand.onInk} />
                    ) : (
                      <Text style={styles.modalDangerText}>Send Invite</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={inviteErrorDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteErrorDialogVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invite Failed</Text>
            <Text style={styles.modalBody}>{inviteErrorMessage}</Text>
            <TouchableOpacity
              style={styles.modalPrimary}
              onPress={() => {
                setInviteErrorDialogVisible(false);
                setInviteErrorMessage("");
              }}
            >
              <Text style={styles.modalDangerText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  flex: { flex: 1 },
  createProjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
    backgroundColor: Brand.paper,
  },
  createProjectHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Brand.ink,
    letterSpacing: -0.2,
  },
  headerBlock: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  menuCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF0F3",
    alignItems: "center",
    justifyContent: "center",
  },
  helloText: {
    fontSize: 22,
    fontWeight: "800",
    color: Brand.ink,
    letterSpacing: -0.3,
  },
  helloSub: {
    marginTop: 3,
    fontSize: 13,
    color: Brand.inkMuted,
    lineHeight: 18,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Brand.ink,
    marginRight: 8,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: "#E8EEF7",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.inkSoft,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.ink,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  createBtnText: {
    color: Brand.onInk,
    fontSize: 13,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Brand.ink,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.paper,
    alignItems: "center",
    justifyContent: "center",
  },
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
  thumbImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Brand.line,
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
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    backgroundColor: "#EEF0F3",
    overflow: "hidden",
    marginRight: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.inkSoft,
    minWidth: 34,
    textAlign: "right",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: Brand.ink,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 14,
    color: Brand.inkMuted,
    textAlign: "center",
  },
  emptyError: {
    fontSize: 15,
    color: Brand.danger,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: Brand.ink,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: Brand.onInk,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(35,31,32,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: Brand.paper,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Brand.ink,
    marginBottom: 8,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    color: Brand.inkMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: Brand.paperSoft,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontWeight: "600",
    color: Brand.inkSoft,
  },
  modalDanger: {
    flex: 1,
    backgroundColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalPrimary: {
    flex: 1,
    backgroundColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDangerText: {
    fontWeight: "700",
    color: Brand.onInk,
  },
  inviteInput: {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    color: Brand.ink,
  },
});

export default HomeScreen;
