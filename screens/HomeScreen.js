import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import Toast from 'react-native-toast-message';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import CreateProject from "./components/CreateProject";
import UpdateProjectModal from "./components/UpdateProjectModal";
import Header from "../components/Header";
import { getMyProjects } from "../services/projects/getProjectsByLoginUserId";
import { deleteProjectById } from "../services/projects/deleteProjectById";
import Loader from "../services/utils/loader";
import { getUserRole } from "../services/utils/userRole";

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
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const { width: screenWidth } = useWindowDimensions();

  const numColumns = screenWidth >= 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  const horizontalPadding = 40; // px-5 on container (20 left + 20 right)
  const interItemSpacing = 16; // mb-4 used for vertical; also used between columns
  const cardWidth =
    (screenWidth - horizontalPadding - (numColumns - 1) * interItemSpacing) /
    numColumns;

  // Load data on component mount
  useEffect(() => {
    fetchProjects({ silent: false });
  }, []);

  // NOTE: OTP verification success messages are now handled directly 
  // in OtpScreen using react-native-toast-message for consistent cross-platform experience

  // Get user role and disable swipe back for admin/owner
  useEffect(() => {
    const loadUserRole = async () => {
      const role = await getUserRole();
      setUserRole(role);

      // Disable swipe back gesture for admin or owner
      if (role === 'Admin' || role === 'Owner') {
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

  const fetchProjects = async (options = { silent: false, isRefresh: false }) => {
    const { silent, isRefresh } = options;
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!silent) {
        setInitialLoading(true);
      }
      setError(null);

      const projectsData = await getMyProjects();
      setProjects(projectsData);
      setFilteredProjects(projectsData);
    } catch (err) {
      console.error("Error fetching projects:", err);
      if (!silent) {
        setError("Failed to load projects");
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else if (!silent) {
        setInitialLoading(false);
      }
    }
  };

  const onRefresh = React.useCallback(() => {
    fetchProjects({ silent: true, isRefresh: true });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
    if (text.trim() === "") {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(
        (project) =>
          project.name.toLowerCase().includes(text.toLowerCase()) ||
          project.description.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  };

  const handleUpdate = (project) => {
    setSelectedProject(project);
    setUpdateProjectModalVisible(true);
  };

  const handleDelete = (project) => {
    const projectId = project?.id;
    const projectName = project?.name;

    if (!projectId) {
      console.error("No project ID found");
      return;
    }

    // Show beautiful custom dialog instead of Alert
    setProjectToDelete(project);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    const projectId = projectToDelete.id;
    const projectName = projectToDelete.name;

    // Close dialog immediately when delete button is tapped
    setDeleteDialogVisible(false);
    setProjectToDelete(null);

    try {
      await deleteProjectById(projectId);
      await fetchProjects();
      
      // --- Show Success Toast Message ---
      Toast.show({
        type: 'success',
        text1: 'Project Deleted Successfully!',
        text2: `"${projectName}" has been permanently deleted`,
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      
      // --- Show Error Toast Message ---
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Failed to delete project. Please try again.',
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

  const handleCreateProjectSuccess = () => {
    setCreateProjectModalVisible(false);
    
    // --- Show Success Toast Message ---
    Toast.show({
      type: 'success',
      text1: 'Project Created Successfully!',
      text2: 'Your new project has been added to the list',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 80,
    });
    
    // Force refresh projects with a slight delay to ensure API has updated
    setTimeout(() => {
      fetchProjects({ silent: false });
    }, 100);
  };

  const handleCreateProjectCancel = () => {
    setCreateProjectModalVisible(false);
  };

  const handleUpdateProjectSuccess = () => {
    setUpdateProjectModalVisible(false);
    setSelectedProject(null);
    
    // --- Show Success Toast Message ---
    Toast.show({
      type: 'success',
      text1: 'Project Updated Successfully!',
      text2: 'Your project changes have been saved',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 80,
    });
    
    fetchProjects(); // Refresh the projects list
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
      onPress={() =>
        navigation.navigate("WidgetScreen", { projectId: project.id })
      }
    >
      {/* Navbar-like header */}
      <View className="bg-black py-3 px-5 flex-row justify-between items-center">
        <Text
          className="text-white text-[16px] font-bold flex-1"
          numberOfLines={1}
        >
          {project.name}
        </Text>
{userRole !== 'Employee' && userRole !== 'Manager' && (
          <Menu rendererProps={{
            placement: 'bottom-end',
            anchorStyle: { marginRight: 0 },
            triggerStyle: { marginRight: 0 }
          }}>
            <MenuTrigger>
              <View style={{ activeOpacity: 1 }}>
                <Ionicons name="ellipsis-vertical" size={20} color="white" />
              </View>
            </MenuTrigger>
            <MenuOptions customStyles={{
              optionsContainer: {
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 8,
                width: 120,
                marginRight: -40,
                marginTop: 15,
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                elevation: 3,
              }
            }}>
              <MenuOption onSelect={() => handleUpdate(project)} customStyles={{
                optionWrapper: {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 4,
                }
              }}>
                <Ionicons name="create-outline" size={18} color="#000" />
                <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: 'black' }}>
                  Update
                </Text>
              </MenuOption>
              <MenuOption onSelect={() => handleDelete(project)} customStyles={{
                optionWrapper: {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 4,
                }
              }}>
                <Ionicons name="trash-outline" size={18} color="#dc3545" />
                <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#dc3545' }}>
                  Delete
                </Text>
              </MenuOption>
            </MenuOptions>
          </Menu>
        )}
      </View>

      {/* Rest of the card content */}
      <View className="p-6 py-8">
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
            style={{ marginTop: '1%' }}
          >
            {formatDate(project.startDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => (
    <FlatList
      data={filteredProjects}
      key={numColumns}
      numColumns={numColumns}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
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
        <View className="flex-1 justify-center items-center p-5 min-h-[400px]">
          {error ? (
            <>
              <Text className="text-[16px] text-[#dc3545] text-center mb-4 font-semibold">
                {error}
              </Text>
              <TouchableOpacity
                className="bg-black py-3 px-6 rounded-xl"
                onPress={fetchProjects}
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
        <ProjectCard project={item} cardWidth={cardWidth} userRole={userRole} />
      )}
    />
  );

  return (
    <View className="flex-1 bg-white">
      {/* Content (Header fixed; search bar scrolls inside list) */}
      {initialLoading ? (
        <View className="flex-1 justify-center items-center p-5 min-h-[100px]">
          <Loader size="large" color="#000000" text="Loading Projects" />
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
        onNavigate={() => { }}
      />

      {/* Bottom Nav */}
      <CustomBottomNav
        keyboardVisible={keyboardVisible}
        project
        currentScreen="home" // ✅ ADD: Tell bottom nav we're on home screen
        onAddPress={() => {
          // Only allow project creation for Owner role
          if (userRole === "Employee" || userRole === "Manager") {
            // Do nothing for Employee and Manager roles
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
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            width: '100%',
            maxWidth: 320,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
          }}>
            {/* Warning Icon */}
            <View style={{
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#FEF2F2',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Ionicons name="warning" size={24} color="#EF4444" />
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#1F2937',
                textAlign: 'center',
                marginBottom: 4,
              }}>
                Delete Project
              </Text>
            </View>

            {/* Message */}
            <Text style={{
              fontSize: 15,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 16,
            }}>
              Are you sure you want to delete{' '}
              <Text style={{ fontWeight: '600', color: '#1F2937' }}>
                "{projectToDelete?.name}"
              </Text>
              {' '}permanently?
            </Text>
            
            <Text style={{
              fontSize: 13,
              color: '#EF4444',
              textAlign: 'center',
              fontWeight: '500',
              marginBottom: 20,
            }}>
              This action cannot be undone.
            </Text>

            {/* Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 10,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={cancelDelete}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#374151',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#EF4444',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: 'white',
                }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default HomeScreen;
