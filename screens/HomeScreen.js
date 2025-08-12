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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import CreateProject from "./components/CreateProject";
import UpdateProjectModal from "./components/UpdateProjectModal";
import Header from "../components/Header";
import { getMyProjects } from "../services/projects/getProjectsByLoginUserId";
import { deleteProjectById } from "../services/projects/deleteProjectById";
import Loader from "../services/utils/loader";

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

function HomeScreen({ navigation }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [createProjectModalVisible, setCreateProjectModalVisible] =
    useState(false);
  const [updateProjectModalVisible, setUpdateProjectModalVisible] =
    useState(false);
  const menuButtonRefs = useRef({});
  const { width: screenWidth } = useWindowDimensions();

  const numColumns = screenWidth >= 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  const horizontalPadding = 40; // px-5 on container (20 left + 20 right)
  const interItemSpacing = 16; // mb-4 used for vertical; also used between columns
  const cardWidth =
    (screenWidth - horizontalPadding - (numColumns - 1) * interItemSpacing) /
    numColumns;

  useFocusEffect(
    React.useCallback(() => {
      if (projects.length === 0) {
        fetchProjects({ silent: false });
      } else {
        fetchProjects({ silent: true });
      }
    }, [projects.length])
  );

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

  const fetchProjects = async (options = { silent: false }) => {
    const { silent } = options;
    try {
      if (!silent) {
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
      if (!silent) {
        setInitialLoading(false);
      }
    }
  };

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

  const handleMenuPress = (project) => {
    const ref = menuButtonRefs.current[project.id];
    if (ref && typeof ref.measure === "function") {
      ref.measure((x, y, width, height, pageX, pageY) => {
        setMenuPosition({ x: pageX + width - 120, y: pageY + height + 5 });
      });
    } else {
      setMenuPosition({ x: 20, y: 80 });
    }
    setSelectedProject(project);
    setMenuVisible(true);
  };

  const handleUpdate = () => {
    setMenuVisible(false);
    setUpdateProjectModalVisible(true);
  };

  const handleDelete = () => {
    const projectId = selectedProject?.id;
    const projectName = selectedProject?.name;

    if (!projectId) {
      console.error("No project ID found");
      return;
    }

    setMenuVisible(false);
    setSelectedProject(null);

    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${projectName}" permanently? This action is not reversible.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProjectById(projectId);
              await fetchProjects();
            } catch (error) {
              console.error("Error deleting project:", error);
              Alert.alert(
                "Error",
                "Failed to delete project. Please try again.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleCreateProjectSuccess = () => {
    setCreateProjectModalVisible(false);
    fetchProjects(); // Refresh the projects list
  };

  const handleCreateProjectCancel = () => {
    setCreateProjectModalVisible(false);
  };

  const handleUpdateProjectSuccess = () => {
    setUpdateProjectModalVisible(false);
    setSelectedProject(null);
    fetchProjects(); // Refresh the projects list
  };

  const handleUpdateProjectClose = () => {
    setUpdateProjectModalVisible(false);
    setSelectedProject(null);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedProject(null);
  };

  const ProjectCard = ({ project, cardWidth }) => (
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
        <TouchableOpacity
          onPress={() => handleMenuPress(project)}
          ref={(ref) => {
            if (ref) menuButtonRefs.current[project.id] = ref;
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Rest of the card content */}
      <View className="p-6 py-8">
        <View className="flex-row items-center justify-between">
          <Text className="text-[14px] text-[#666] leading-[22px] flex-1 mr-3">
            {project.description}
          </Text>
          <Text className="text-[12px] text-[#999] font-medium">
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
        <ProjectCard project={item} cardWidth={cardWidth} />
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

      {/* Context Menu */}
      {menuVisible && (
        <>
          <TouchableOpacity
            className="absolute top-0 bottom-0 left-0 right-0"
            activeOpacity={1}
            onPress={closeMenu}
          />
          <View
            className="bg-white rounded-lg p-2"
            style={{
              position: "absolute",
              top: menuPosition.y,
              left: menuPosition.x,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }}
          >
            <TouchableOpacity
              className="flex-row items-center py-2.5 px-4 rounded"
              onPress={handleUpdate}
            >
              <Ionicons name="create-outline" size={18} color="#000" />
              <Text className="ml-2.5 text-[14px] font-semibold text-black">
                Update
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center py-2.5 px-4 rounded"
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#dc3545" />
              <Text className="ml-2.5 text-[14px] font-semibold text-[#dc3545]">
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </>
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
        onAddPress={() => setCreateProjectModalVisible(true)}
      />

      {/* Create Project Modal */}
      <Modal
        visible={createProjectModalVisible}
        animationType="slide"
        presentationStyle="formSheet" // changed from "pageSheet"
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
    </View>
  );
}

export default HomeScreen;
