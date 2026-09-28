// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getUserForConversations } from "../services/chats/getUserForConversations";
import { createConversation } from "../services/chats/createConversation";
import { createProjectConversation } from "../services/chats/createPorjectConversation";
import { useAuth } from "../context/AuthContext";
import { getMyProjects } from "../services/projects/getProjectsByLoginUserId";
import { getEmployeesAssignedToProject } from "../services/projects/getEmployeesAssignedToProject";

const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return "?";
  if (!lastName) return firstName.charAt(0).toUpperCase();
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const SelectUserModal = ({ visible, onClose, onUserSelect }) => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const [projects, setProjects] = useState([]);
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [showConversationExistsDialog, setShowConversationExistsDialog] =
    useState(false);
  const [existingConversationData, setExistingConversationData] =
    useState(null);

  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  useEffect(() => {
    if (visible) {
      fetchEmployees();
      setSearchQuery("");
      setSelectedProject(null);
      setProjectSearchQuery("");
      setShowProjectPopup(false);
    }
  }, [visible]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("=== Fetching Employees for Chat ===");
      const response = await getUserForConversations();

      if (response && Array.isArray(response)) {
        const filteredEmployees = response.filter(
          (emp) => emp.id?.toString() !== currentUserId?.toString()
        );

        console.log(
          "Total employees fetched for conversations:",
          response.length
        );
        console.log(
          "Filtered employees (excluding current user):",
          filteredEmployees.length
        );
        console.log("Current user ID:", currentUserId);

        setEmployees(filteredEmployees);
      } else {
        console.warn("No employees data received from conversation API");
        setEmployees([]);
      }
    } catch (err) {
      console.error("Error fetching employees for conversations:", err);
      setError("Failed to load team members. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    setIsLoadingProjects(true);

    try {
      console.log("=== Fetching Projects ===");
      const response = await getMyProjects();

      if (response && Array.isArray(response)) {
        console.log("Projects loaded:", response.length);
        setProjects(response);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const filteredEmployees = React.useMemo(() => {
    if (searchQuery.trim() === "") {
      return employees;
    }

    return employees.filter((employee) => {
      const firstName = employee.first_name || "";
      const lastName = employee.last_name || "";
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const email = (employee.email || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      return fullName.includes(query) || email.includes(query);
    });
  }, [searchQuery, employees]);

  const filteredProjects = React.useMemo(() => {
    if (projectSearchQuery.trim() === "") {
      return projects;
    }

    return projects.filter((project) => {
      const projectName = (project.name || project.title || "").toLowerCase();
      const query = projectSearchQuery.toLowerCase();
      return projectName.includes(query);
    });
  }, [projectSearchQuery, projects]);

  const handleUserSelect = async (employee) => {
    console.log("=== User Selected ===");
    console.log("Employee:", employee);
    console.log("Employee ID:", employee.id);
    console.log("Employee ID Type:", typeof employee.id);
    console.log("Selected Project:", selectedProject);

    if (selectedProject) {
      console.log(
        "⚠️ Project is selected - preventing individual conversation"
      );
      Alert.alert(
        "Use Project Chat",
        'When a project is selected, please use the "Create Project Chat" button to start a group conversation with all team members.',
        [{ text: "OK" }]
      );
      return;
    }

    if (!employee.id) {
      Alert.alert("Error", "Employee ID is missing. Please try again.", [
        { text: "OK" },
      ]);
      return;
    }

    setIsCreatingConversation(true);

    try {
      const employeeId =
        typeof employee.id === "string"
          ? parseInt(employee.id, 10)
          : employee.id;

      const conversationData = {
        type: "private",
        participantIds: [employeeId],
      };

      console.log("Creating conversation with data:", conversationData);
      console.log("Employee ID being sent:", employeeId, typeof employeeId);

      const response = await createConversation(conversationData);

      console.log("Conversation created successfully:", response);

      if (onUserSelect) {
        onUserSelect({
          employee: employee,
          conversation: response,
          project: selectedProject || null,
          userId: employeeId,
        });
      }

      handleClose();
    } catch (err) {
      console.error("Error creating conversation:", err);
      console.error("Error response data:", err.response?.data);
      console.error("Error response status:", err.response?.status);

      if (err.response?.status === 400) {
        console.log("Conversation already exists with this user");

        const existingConversation = err.response?.data?.conversation;

        setExistingConversationData(existingConversation);
        setShowConversationExistsDialog(true);
      } else {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to create conversation. Please try again.";

        Alert.alert("Error", errorMessage, [{ text: "OK" }]);
      }
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleCreateProjectChat = async () => {
    console.log("=== Creating Project Group Chat ===");
    console.log("Selected Project:", selectedProject);

    if (!selectedProject?.id) {
      Alert.alert("Error", "Please select a project first.", [{ text: "OK" }]);
      return;
    }

    if (employees.length === 0) {
      Alert.alert(
        "No Team Members",
        "There are no employees assigned to this project. Please assign team members to the project before creating a conversation.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsCreatingConversation(true);

    try {
      console.log(
        "Creating project conversation for project ID:",
        selectedProject.id
      );

      const response = await createProjectConversation(selectedProject.id);

      console.log("Project conversation created successfully:", response);

      if (onUserSelect) {
        onUserSelect({
          conversation: response,
          project: selectedProject,
          isGroupChat: true,
        });
      }

      handleClose();
    } catch (err) {
      console.error("Error creating project group chat:", err);
      console.error("Error response data:", err.response?.data);
      console.error("Error status:", err.response?.status);

      if (err.response?.status === 400) {
        console.log("Conversation already exists for this project");

        const existingConversation = err.response?.data?.conversation;

        setExistingConversationData(existingConversation);
        setShowConversationExistsDialog(true);
      } else {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to create project chat. Please try again.";

        Alert.alert("Error", errorMessage, [{ text: "OK" }]);
      }
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleConversationExistsDialogOk = () => {
    console.log("User confirmed existing conversation dialog");

    if (existingConversationData && onUserSelect) {
      console.log(
        "Navigating to existing conversation:",
        existingConversationData
      );

      const isGroupChat =
        existingConversationData.type === "group" || selectedProject != null;

      const navigationData = {
        conversation: existingConversationData,
        isGroupChat: isGroupChat,
      };

      if (isGroupChat && selectedProject) {
        navigationData.project = selectedProject;
      }

      if (!isGroupChat && existingConversationData.participants) {
        const otherParticipant = existingConversationData.participants.find(
          (p) => p.user?.id?.toString() !== currentUserId?.toString()
        );
        navigationData.employee = otherParticipant?.user;
      }

      onUserSelect(navigationData);
    }

    setShowConversationExistsDialog(false);
    setExistingConversationData(null);

    handleClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setError(null);
    setSelectedProject(null);
    setProjectSearchQuery("");
    setShowProjectPopup(false);
    Keyboard.dismiss();
    onClose();
  };

  const handleProjectSelect = async (project) => {
    console.log("🎯 Project selected:", project);
    setSelectedProject(project);
    setShowProjectPopup(false);

    if (project && project.id) {
      setIsLoading(true);
      setError(null);

      try {
        console.log("📋 Fetching employees assigned to project:", project.id);
        const projectData = await getEmployeesAssignedToProject(project.id);

        console.log("✅ Project data received:", projectData);

        if (
          projectData &&
          projectData.assignedTo &&
          Array.isArray(projectData.assignedTo)
        ) {
          const filteredEmployees = projectData.assignedTo.filter(
            (emp) => emp.id?.toString() !== currentUserId?.toString()
          );

          console.log("👥 Assigned employees:", filteredEmployees.length);
          setEmployees(filteredEmployees);
        } else {
          console.warn("⚠️ No assigned employees in project data");
          setEmployees([]);
        }
      } catch (err) {
        console.error("❌ Error fetching project employees:", err);
        setError("Failed to load project employees. Please try again.");

        Alert.alert(
          "Error",
          "Failed to load employees for this project. Please try again.",
          [{ text: "OK" }]
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderEmployeeItem = ({ item }) => {
    const firstName = item.first_name || "";
    const lastName = item.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || "Unknown User";
    const email = item.email || "";

    const isDisabled = !!selectedProject;

    return (
      <View className="px-5 mb-3">
        <TouchableOpacity
          className="flex-row items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          onPress={() => handleUserSelect(item)}
          activeOpacity={0.7}
          disabled={isDisabled}
        >
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center shadow-sm"
            style={{ backgroundColor: getAvatarColor(fullName) }}
          >
            <Text className="text-xl font-bold text-white">
              {getInitials(firstName, lastName)}
            </Text>
          </View>

          <View className="flex-1 ml-4">
            <Text
              className="text-base font-bold text-gray-900"
              numberOfLines={1}
            >
              {fullName}
            </Text>
            {email && (
              <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
                {email}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View className="flex-1 items-center justify-center px-8 bg-gray-50">
        <View className="w-24 h-24 bg-gray-100 rounded-3xl items-center justify-center mb-5">
          <Ionicons
            name={searchQuery ? "search-outline" : "people-outline"}
            size={48}
            color="#9CA3AF"
          />
        </View>
        <Text className="text-xl font-bold text-gray-900 text-center">
          {searchQuery ? "No team members found" : "No team members"}
        </Text>
        <Text className="text-base text-gray-500 mt-2 text-center">
          {searchQuery
            ? "Try adjusting your search terms"
            : "There are no other team members to chat with"}
        </Text>
      </View>
    );
  };

  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center px-8 bg-gray-50">
      <View className="w-24 h-24 bg-red-50 rounded-3xl items-center justify-center mb-5">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
      </View>
      <Text className="text-xl font-bold text-gray-900 text-center">
        {error || "Something went wrong"}
      </Text>
      <Text className="text-base text-gray-500 mt-2 text-center mb-6">
        Unable to load team members
      </Text>
      <TouchableOpacity
        className="bg-black rounded-2xl px-8 py-4 shadow-sm"
        onPress={fetchEmployees}
        activeOpacity={0.8}
      >
        <Text className="text-white text-base font-bold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#000000" />
      <Text className="text-base text-gray-500 mt-4">
        Loading team members...
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-gray-50">
        <View className="bg-black px-6 pt-4 pb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white text-2xl font-bold">
                Start a Chat
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                Select a team member to connect
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isCreatingConversation}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="close" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-5 pt-5 pb-4 bg-gray-50">
          <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-gray-50 rounded-xl items-center justify-center mr-3">
                <Ionicons name="folder" size={22} color="black" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  Project Context
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Optional - Link to a project
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                onPress={async () => {
                  console.log(
                    "🎯 Project selection button pressed - toggling popup"
                  );

                  if (!showProjectPopup) {
                    setShowProjectPopup(true);

                    await fetchProjects();
                  } else {
                    setShowProjectPopup(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  className="flex-1 text-base font-semibold"
                  style={{ color: selectedProject ? "#111827" : "#9CA3AF" }}
                >
                  {selectedProject
                    ? selectedProject.name ||
                      selectedProject.title ||
                      "Unnamed Project"
                    : "Choose a project..."}
                </Text>

                <Ionicons
                  name={showProjectPopup ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {selectedProject && (
                <TouchableOpacity
                  className="ml-2 w-10 h-10 rounded-xl bg-gray-200 items-center justify-center"
                  onPress={async () => {
                    console.log("🔄 Clearing project selection");
                    setSelectedProject(null);

                    await fetchEmployees();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#374151" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Team Members
            </Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <Ionicons name="search" size={22} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-900 font-medium"
                placeholder="Search by name or email..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  className="w-7 h-7 rounded-full bg-gray-200 items-center justify-center"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {selectedProject && (
          <View className="px-5 pb-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <TouchableOpacity
                className="flex-row items-center justify-between"
                onPress={handleCreateProjectChat}
                activeOpacity={0.7}
                disabled={employees.length === 0 || isLoading}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-12 h-12 rounded-xl items-center justify-center mr-3 ${
                      employees.length === 0 ? "bg-gray-200" : "bg-gray-100"
                    }`}
                  >
                    <Ionicons
                      name="people"
                      size={24}
                      color={employees.length === 0 ? "#9CA3AF" : "black"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-base font-bold ${
                        employees.length === 0
                          ? "text-gray-400"
                          : "text-gray-900"
                      }`}
                    >
                      Create Project Chat
                    </Text>
                    <Text
                      className={`text-xs mt-0.5 ${
                        employees.length === 0
                          ? "text-gray-400"
                          : "text-gray-500"
                      }`}
                    >
                      {employees.length === 0
                        ? "No employees assigned to this project"
                        : "Start a group conversation"}
                    </Text>
                  </View>
                </View>
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center ml-2 ${
                    employees.length === 0 ? "bg-gray-300" : "bg-black"
                  }`}
                >
                  <Ionicons
                    name="add"
                    size={24}
                    color={employees.length === 0 ? "#9CA3AF" : "white"}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLoading ? (
          renderLoadingState()
        ) : error ? (
          renderErrorState()
        ) : filteredEmployees.length > 0 ? (
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployeeItem}
            keyExtractor={(item) =>
              item.id?.toString() || Math.random().toString()
            }
            className="flex-1 bg-gray-50"
            contentContainerStyle={{
              paddingTop: 8,
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          renderEmptyState()
        )}

        <Modal
          visible={showProjectPopup}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowProjectPopup(false);
            setProjectSearchQuery("");
          }}
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
                width: "100%",
                maxWidth: 400,
                maxHeight: "70%",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Select Project
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowProjectPopup(false);
                    setProjectSearchQuery("");
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#F3F4F6",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  backgroundColor: "white",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F9FAFB",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Ionicons
                    name="search"
                    size={18}
                    color="#9CA3AF"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    placeholder="Search projects..."
                    value={projectSearchQuery}
                    onChangeText={setProjectSearchQuery}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: "#111827",
                    }}
                    placeholderTextColor="#9CA3AF"
                  />
                  {projectSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setProjectSearchQuery("")}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <ScrollView
                style={{ maxHeight: 300 }}
                showsVerticalScrollIndicator={true}
              >
                {isLoadingProjects ? (
                  <View style={{ paddingVertical: 40, alignItems: "center" }}>
                    <ActivityIndicator size="large" color="#000000" />
                    <Text
                      style={{ color: "#6B7280", marginTop: 12, fontSize: 14 }}
                    >
                      Loading projects...
                    </Text>
                  </View>
                ) : filteredProjects.length === 0 ? (
                  <View
                    style={{
                      paddingVertical: 40,
                      alignItems: "center",
                      paddingHorizontal: 20,
                    }}
                  >
                    <Ionicons name="folder-outline" size={48} color="#D1D5DB" />
                    <Text
                      style={{
                        color: "#6B7280",
                        fontSize: 15,
                        fontWeight: "600",
                        marginTop: 12,
                        textAlign: "center",
                      }}
                    >
                      {projectSearchQuery
                        ? "No projects found"
                        : "No projects available"}
                    </Text>
                  </View>
                ) : (
                  filteredProjects.map((project, index) => (
                    <TouchableOpacity
                      key={project.id || index}
                      onPress={() => handleProjectSelect(project)}
                      style={{
                        marginHorizontal: 16,
                        marginBottom: 10,
                        padding: 12,
                        backgroundColor:
                          selectedProject?.id === project.id
                            ? "#F3F4F6"
                            : "#FFFFFF",
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor:
                          selectedProject?.id === project.id
                            ? "#000000"
                            : "#E5E7EB",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor:
                            selectedProject?.id === project.id
                              ? "#000000"
                              : "#E5E7EB",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <Ionicons
                          name="folder"
                          size={20}
                          color={
                            selectedProject?.id === project.id
                              ? "#FFFFFF"
                              : "#6B7280"
                          }
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "600",
                            color: "#111827",
                          }}
                        >
                          {project.name || project.title || "Unnamed Project"}
                        </Text>

                        {project.company && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginTop: 4,
                            }}
                          >
                            <Ionicons name="business" size={12} color="black" />
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#000000",
                                fontWeight: "600",
                                marginLeft: 4,
                              }}
                            >
                              {project.company.name}
                            </Text>
                          </View>
                        )}
                      </View>

                      {selectedProject?.id === project.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#000000"
                        />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {isCreatingConversation && (
          <View
            className="absolute inset-0 bg-black/50 items-center justify-center"
            style={{ zIndex: 999 }}
          >
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="large" color="#000000" />
              <Text className="text-base font-semibold text-gray-800 mt-4">
                Creating conversation...
              </Text>
            </View>
          </View>
        )}

        {showConversationExistsDialog && (
          <View
            className="absolute inset-0 bg-black/50 items-center justify-center"
            style={{ zIndex: 1000 }}
          >
            <View className="bg-white rounded-3xl mx-6 w-11/12 max-w-md shadow-2xl">
              <View className="items-center pt-8 pb-4">
                <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center">
                  <Ionicons name="chatbubbles" size={40} color="#3B82F6" />
                </View>
              </View>

              <Text className="text-2xl font-bold text-gray-900 text-center px-6 mb-3">
                Conversation Already Exists
              </Text>

              <Text className="text-base text-gray-600 text-center px-8 mb-8 leading-6">
                {selectedProject
                  ? "A conversation has already been created for this project. You will be redirected to it."
                  : "A conversation already exists with this person. You will be redirected to it."}
              </Text>

              <View className="border-t border-gray-200">
                <TouchableOpacity
                  onPress={handleConversationExistsDialogOk}
                  className="py-4 items-center active:bg-gray-50"
                  activeOpacity={0.7}
                >
                  <Text className="text-lg font-semibold text-blue-500">
                    OK
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default SelectUserModal;
