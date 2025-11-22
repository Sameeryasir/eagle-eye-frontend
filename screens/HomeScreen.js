// --- Change Summary (2025-11-13) ---
// What: Ensured the loader visibly displays whenever projects are fetching by combining local and Redux loading flags.
// Why: Users expected to see a "Loading Projects" indicator while data loads, and it was not always shown.
// Dependencies: Uses existing `Loader` component; relies on Redux `selectProjectLoading`.
// MCP Context: Implemented in line with MCP context 7 for clarity and simple maintainability.
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Keyboard,
  Alert,
  FlatList,
  useWindowDimensions,
  Platform,
  TouchableWithoutFeedback,
  Modal,
  RefreshControl,
  ToastAndroid,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

import { useSelector, useDispatch } from "react-redux";
import {
  fetchProjects,
  refreshProjects,
  deleteProject,
  selectProjects,
  selectProjectLoading,
  selectProjectError,
} from "../store/slices/projectSlice";

import Sidebar from "../components/Sidebar";
import CustomBottomNav from "../components/CustomBottomNav";
import CreateProject from "../components/CreateProject";
import UpdateProjectModal from "../components/UpdateProjectModal";
import { getUserRole } from "../services/utils/userRole";
import { sendInvite } from "../services/auth/SendInvite";
import { getUserById } from "../services/user/getUserById";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isVerySmallScreen = screenWidth < 380 || screenHeight < 650;
const isSmallScreen = screenWidth < 400 || screenHeight < 700;
const isMediumScreen = screenWidth < 450;
const isLargeScreen = screenWidth >= 450;

const searchBarClasses = `flex-row items-center rounded-2xl px-4 py-3 bg-[#F8FAFC] border border-[#EAECF0]`;

const SearchBarHeader = React.memo(function SearchBarHeader({
  searchTerm,
  onChange,
}) {
  return (
    <View className="py-5 px-5">
      <View
        className={searchBarClasses}
        style={{ width: "100%", maxWidth: 600 }}
      >
        <Ionicons
          name="search"
          size={18}
          color="#6B7280"
          style={{ marginRight: 8 }}
        />
        <TextInput
          className="flex-1 text-[15px] text-[#111827]"
          placeholder="Search projects"
          placeholderTextColor="#9CA3AF"
          value={searchTerm}
          onChangeText={onChange}
          returnKeyType="search"
          blurOnSubmit={false}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => onChange("")} className="ml-2">
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

function HomeScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const projects = useSelector(selectProjects);
  const loading = useSelector(selectProjectLoading);
  const error = useSelector(selectProjectError);

  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [createProjectModalVisible, setCreateProjectModalVisible] =
    useState(false);
  const [updateProjectModalVisible, setUpdateProjectModalVisible] =
    useState(false);
  const [userRole, setUserRole] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [invitePopupVisible, setInvitePopupVisible] = useState(false);
  const [projectToInvite, setProjectToInvite] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteErrorDialogVisible, setInviteErrorDialogVisible] =
    useState(false);
  const [inviteErrorMessage, setInviteErrorMessage] = useState("");
  const { width: screenWidth } = useWindowDimensions();
  const [hideCompanyAfterCreate, setHideCompanyAfterCreate] = useState(false);
  const [currentUserCompanyId, setCurrentUserCompanyId] = useState(null);

  // --- Loading State Merge (MCP Context 7) ---
  // We merge the Redux loading flag with the local loading state so the loader covers all fetch scenarios.
  const isProjectsLoading = loading || isLoading;

  const numColumns = screenWidth >= 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  const horizontalPadding = 40;
  const interItemSpacing = 16;
  const cardWidth =
    (screenWidth - horizontalPadding - (numColumns - 1) * interItemSpacing) /
    numColumns;

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      setIsInitialLoad(true);

      try {
        await dispatch(fetchProjects());
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    };
    loadProjects();
  }, [dispatch]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [projects, searchTerm]);

  useEffect(() => {
    const loadUserRole = async () => {
      const role = await getUserRole();
      setUserRole(role);

      if (role === "Admin" || role === "Owner") {
        navigation.setOptions({
          gestureEnabled: false,
        });
      } else {
        navigation.setOptions({
          gestureEnabled: true,
        });
      }
    };

    loadUserRole();
  }, [navigation]);

  useEffect(() => {
    const loadCurrentUserCompany = async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
          const userData = await getUserById(userId);

          const companyId =
            userData?.company?.id || userData?.company_id || null;
          setCurrentUserCompanyId(companyId);
          console.log("Current user company ID:", companyId);
        }
      } catch (error) {
        console.error("Error loading current user company:", error);
      }
    };

    loadCurrentUserCompany();
  }, []);

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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setIsLoading(true);

    dispatch(refreshProjects()).finally(() => {
      setRefreshing(false);
      setIsLoading(false);
    });
  }, [dispatch]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
  };

  const handleUpdate = (project) => {
    setSelectedProject(project);
    setUpdateProjectModalVisible(true);
  };

  const handleInvite = (project) => {
    const projectId = project?.id;
    const projectName = project?.name;

    if (!projectId) {
      console.error("No project ID found");
      return;
    }

    setProjectToInvite(project);
    setInviteEmail("");
    setInvitePopupVisible(true);
  };

  const handleDelete = (project) => {
    const projectId = project?.id;
    const projectName = project?.name;

    if (!projectId) {
      console.error("No project ID found");
      return;
    }

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
      const resultAction = await dispatch(deleteProject(projectId));

      if (deleteProject.fulfilled.match(resultAction)) {
        Toast.show({
          type: "success",
          text1: "Project Deleted Successfully!",
          text2: `"${projectName}" has been permanently deleted`,
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Error deleting project:", error);

      Toast.show({
        type: "error",
        text1: "Delete Failed",
        text2: "Failed to delete project. Please try again.",
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    setProjectToDelete(null);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      Toast.show({
        type: "error",
        text1: "Email Required",
        text2: "Please enter an email address",
        visibilityTime: 3000,
        autoHide: true,
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
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    if (!projectToInvite?.id) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Project information is missing",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }

    setIsSendingInvite(true);

    try {
      await sendInvite(inviteEmail.trim(), projectToInvite.id);

      setInvitePopupVisible(false);
      const sentEmail = inviteEmail;
      setProjectToInvite(null);
      setInviteEmail("");

      Toast.show({
        type: "success",
        text1: "Invite Sent Successfully!",
        text2: `Invitation sent to ${sentEmail}`,
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    } catch (error) {
      console.error("Error sending invite:", error);

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

  const handleCancelInvitePopup = () => {
    setInvitePopupVisible(false);
    setProjectToInvite(null);
    setInviteEmail("");
    setIsSendingInvite(false);
  };

  const handleCreateProjectSuccess = () => {
    setCreateProjectModalVisible(false);

    setHideCompanyAfterCreate(true);

    Toast.show({
      type: "success",
      text1: "Project Created Successfully!",
      text2: "Your new project has been added to the list",
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 80,
    });

    setTimeout(() => setHideCompanyAfterCreate(false), 2000);
  };

  const handleCreateProjectCancel = () => {
    setCreateProjectModalVisible(false);
  };

  const handleUpdateProjectSuccess = () => {
    setUpdateProjectModalVisible(false);
    setSelectedProject(null);

    Toast.show({
      type: "success",
      text1: "Project Updated Successfully!",
      text2: "Your project changes have been saved",
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 80,
    });
  };

  const handleUpdateProjectClose = () => {
    setUpdateProjectModalVisible(false);
    setSelectedProject(null);
  };

  const ProjectCard = ({ project, cardWidth, userRole }) => (
    <TouchableOpacity
      key={project.id}
      className="bg-white rounded-2xl p-0 mb-4 border border-[#f0f0f0] overflow-hidden"
      style={{ width: cardWidth }}
      onPress={() => {
        console.log("🔍 NAVIGATION DEBUG - HomeScreen:");
        console.log("📱 Project ID:", project.id);
        console.log("📝 Project Name:", project.name);
        console.log("🚀 Navigating to WidgetScreen with params:", {
          projectId: project.id,
          projectName: project.name,
        });

        navigation.navigate("WidgetScreen", {
          projectId: project.id,
          projectName: project.name,
        });
      }}
    >
      {/* Navbar-like header */}
      <View className="bg-black py-3 px-5 flex-row justify-between items-center">
        <Text
          className="text-white text-[16px] font-bold flex-1"
          numberOfLines={1}
        >
          {project.name}
        </Text>
        {userRole !== "Employee" && userRole !== "Manager" && (
          <Menu
            rendererProps={{
              placement: "bottom-end",
              anchorStyle: { marginRight: 0 },
              triggerStyle: { marginRight: 0 },
            }}
          >
            <MenuTrigger>
              <View style={{ activeOpacity: 1 }}>
                <Ionicons name="ellipsis-vertical" size={20} color="white" />
              </View>
            </MenuTrigger>
            <MenuOptions
              customStyles={{
                optionsContainer: {
                  backgroundColor: "white",
                  borderRadius: 8,
                  padding: 8,
                  width: 140,
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
                onSelect={() => handleUpdate(project)}
                customStyles={{
                  optionWrapper: {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 6,
                    paddingHorizontal: 12,
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
                onSelect={() => handleInvite(project)}
                customStyles={{
                  optionWrapper: {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 4,
                  },
                }}
              >
                <Ionicons name="person-add-outline" size={18} color="#000000" />
                <Text
                  style={{
                    marginLeft: 10,
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#000000",
                  }}
                >
                  Invite
                </Text>
              </MenuOption>
              <MenuOption
                onSelect={() => handleDelete(project)}
                customStyles={{
                  optionWrapper: {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 6,
                    paddingHorizontal: 12,
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

      {/* Rest of the card content */}
      <View className="p-6 py-8">
        {/* Company Tag - Show only for collaborated projects (different company) (MCP Context 7) --- */}
        {/* Business Rule: Hide company name for projects from user's own company, show only for collaborated projects */}
        {project.company &&
          currentUserCompanyId &&
          project.company.id !== currentUserCompanyId && (
            <View className="mb-3">
              <View className="flex-row items-center self-start">
                <Ionicons name="business" size={14} color="black" />
                <Text className="text-[14px] text-black font-semibold ml-1.5">
                  {project.company.name}
                </Text>
              </View>
            </View>
          )}

        <View className="flex-row items-start justify-between">
          <Text
            className="text-[14px] text-[#666] leading-[22px] flex-1 mr-3"
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {project.description}
          </Text>
          <Text
            className="text-[12px] text-[#999] font-medium"
            style={{ marginTop: "1%" }}
          >
            {formatDate(project.startDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading) {
      return null;
    }

    const isEmpty = filteredProjects.length === 0;

    return (
      <FlatList
        data={filteredProjects}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={
          isEmpty
            ? { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 100 }
            : { paddingHorizontal: 20, paddingBottom: 100 }
        }
        scrollEnabled={true}
        bounces={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3155A1"]}
            tintColor="#3155A1"
          />
        }
        ListHeaderComponent={
          <SearchBarHeader searchTerm={searchTerm} onChange={handleSearch} />
        }
        ListHeaderComponentStyle={{ marginHorizontal: -20 }}
        ListEmptyComponent={() => (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 40,
              minHeight: screenHeight * 0.7,
            }}
          >
            {error ? (
              <>
                <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-semibold">
                  {error}
                </Text>
                <TouchableOpacity
                  className="bg-black py-3 px-6 rounded-xl"
                  onPress={() => dispatch(fetchProjects())}
                >
                  <Text className="text-white text-[16px] font-semibold">
                    Retry
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text className="text-[16px] text-[#666] text-center font-medium">
                {searchTerm.trim() !== ""
                  ? "No projects match your search"
                  : "No projects found"}
              </Text>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            cardWidth={cardWidth}
            userRole={userRole}
          />
        )}
      />
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Content (Header fixed; search bar scrolls inside list) */}
      {/* --- Simple Custom Loader (MCP Context 7) --- */}
      {/* Why: Simple inline loader centered on screen, no external dependencies */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-4 text-base text-gray-500">Loading Projects...</Text>
        </View>
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-white">{renderContent()}</View>
        </TouchableWithoutFeedback>
      )}

      {/* Sidebar */}
      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={() => {}}
      />

      {/* Bottom Nav */}
      <CustomBottomNav
        keyboardVisible={keyboardVisible}
        project
        currentScreen="home"
        onAddPress={() => {
          if (userRole === "Employee" || userRole === "Manager") {
            return;
          }
          setCreateProjectModalVisible(true);
        }}
      />

      {/* Create Project Modal */}
      <Modal
        visible={createProjectModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCreateProjectModalVisible(false)}
      >
        <CreateProject
          navigation={{
            goBack: () => setCreateProjectModalVisible(false),
          }}
          onSuccess={handleCreateProjectSuccess}
          onCancel={handleCreateProjectCancel}
        />
      </Modal>

      {/* Update Project Modal */}
      <UpdateProjectModal
        visible={updateProjectModalVisible}
        project={selectedProject}
        onClose={handleUpdateProjectClose}
        onSuccess={handleUpdateProjectSuccess}
      />

      {/* Beautiful Delete Confirmation Dialog */}
      <Modal
        visible={deleteDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxWidth: 320,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            {/* Warning Icon */}
            <View
              style={{
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#FEF2F2",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="warning" size={24} color="#EF4444" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#1F2937",
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                Delete Project
              </Text>
            </View>

            {/* Message */}
            <Text
              style={{
                fontSize: 15,
                color: "#6B7280",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              Are you sure you want to delete{" "}
              <Text style={{ fontWeight: "600", color: "#1F2937" }}>
                "{projectToDelete?.name}"
              </Text>{" "}
              permanently?
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: "#EF4444",
                textAlign: "center",
                fontWeight: "500",
                marginBottom: 20,
              }}
            >
              This action cannot be undone.
            </Text>

            {/* Action Buttons */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
                onPress={cancelDelete}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#EF4444",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Popup Menu */}
      <Modal
        visible={invitePopupVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelInvitePopup}
      >
        <TouchableWithoutFeedback onPress={handleCancelInvitePopup}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 12,
                  padding: 16,
                  width: 280,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 3,
                }}
              >
                {/* Header */}
                <View
                  style={{
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#F3F4F6",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name="person-add" size={20} color="#000000" />
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#374151",
                      textAlign: "center",
                    }}
                  >
                    Invite to {projectToInvite?.name}
                  </Text>
                </View>

                {/* Email Input */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: 8,
                    }}
                  >
                    Enter the owner email address
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                      backgroundColor: "#F9FAFB",
                    }}
                    placeholder="Enter email address"
                    placeholderTextColor="#9CA3AF"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSendInvite}
                  />
                </View>

                {/* Action Buttons */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isSendingInvite ? "#E5E7EB" : "#F3F4F6",
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                    onPress={handleCancelInvitePopup}
                    activeOpacity={0.8}
                    disabled={isSendingInvite}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: isSendingInvite ? "#9CA3AF" : "#374151",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isSendingInvite ? "#4B5563" : "#000000",
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={handleSendInvite}
                    activeOpacity={0.8}
                    disabled={isSendingInvite}
                  >
                    {isSendingInvite ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "white",
                        }}
                      >
                        Send Invite
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Invite Error Dialog */}
      <Modal
        visible={inviteErrorDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInviteErrorDialogVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxWidth: 320,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            {/* Error Icon */}
            <View
              style={{
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#FEF2F2",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="close-circle" size={28} color="#EF4444" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#1F2937",
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                Invite Failed
              </Text>
            </View>

            {/* Error Message */}
            <Text
              style={{
                fontSize: 15,
                color: "#6B7280",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 20,
              }}
            >
              {inviteErrorMessage}
            </Text>

            {/* OK Button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#000000",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
              }}
              onPress={() => {
                setInviteErrorDialogVisible(false);
                setInviteErrorMessage("");
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "white",
                }}
              >
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default HomeScreen;
