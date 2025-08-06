import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import { getMyProjects } from "../services/projects/getProjectsByLoginUserId";
import { deleteProjectById } from "../services/projects/deleteProjectById";

function HomeScreen({ navigation }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [refreshing, setRefreshing] = useState(false);

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchProjects();
    }, [])
  );

  useEffect(() => {
    // Add keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await getMyProjects();
      setProjects(projectsData);
      setFilteredProjects(projectsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleSidebarToggle = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleSidebarClose = () => {
    setSidebarVisible(false);
  };

  const handleNavigation = (itemId) => {
    console.log("Navigating to:", itemId);
    // Add your navigation logic here
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
    if (text.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project => 
        project.name.toLowerCase().includes(text.toLowerCase()) ||
        project.description.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleMenuPress = (project, event) => {
    // Get the position of the pressed button
    event.target.measure((x, y, width, height, pageX, pageY) => {
      setMenuPosition({
        x: pageX + width - 120, // Position dropdown to the right of the button
        y: pageY + height + 5, // Position below the button
      });
    });
    
    setSelectedProject(project);
    setMenuVisible(true);
  };

  const handleUpdate = () => {
    console.log("Update project:", selectedProject?.id);
    setMenuVisible(false);
    setSelectedProject(null);
    
    // Navigate to UpdateProjectScreen with the project data
    if (selectedProject) {
      navigation.navigate('UpdateProject', { project: selectedProject });
    }
  };

  const handleDelete = () => {
    const projectId = selectedProject?.id;
    const projectName = selectedProject?.name;
    
    if (!projectId) {
      console.error("No project ID found");
      return;
    }
    
    // Close the dropdown menu before showing the alert
    setMenuVisible(false);
    setSelectedProject(null);
    
    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${projectName}" permanently? This action is not reversible.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Delete project:", projectId);
              await deleteProjectById(projectId);
              
              // Refresh the projects list after successful deletion
              await fetchProjects();
            } catch (error) {
              console.error("Error deleting project:", error);
              Alert.alert(
                "Error",
                "Failed to delete project. Please try again.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedProject(null);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProjects();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Custom Header */}
          <View style={styles.customHeader}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleSidebarToggle}
            >
              <Ionicons name="menu" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Projects</Text>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Project Cards */}
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            alwaysBounceVertical={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={dismissKeyboard}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#007AFF"]}
                tintColor="#007AFF"
              />
            }
          >
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons
                  name="search"
                  size={20}
                  color="#666"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search projects..."
                  placeholderTextColor="#999"
                  value={searchTerm}
                  onChangeText={handleSearch}
                  returnKeyType="search"
                  blurOnSubmit={true}
                />
              </View>
            </View>
            {loading ? (
              <View style={styles.centerContainer}>
                <Text style={styles.loadingText}>Loading projects...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchProjects}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : filteredProjects.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.noProjectsText}>
                  {searchTerm.trim() !== '' ? 'No projects match your search' : 'No projects found'}
                </Text>
              </View>
            ) : (
              filteredProjects.map((project) => (
                <TouchableOpacity key={project.id} style={styles.projectCard}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.projectTitle}>{project.name}</Text>
                      <TouchableOpacity
                        style={styles.menuButton}
                        onPress={(event) => handleMenuPress(project, event)}
                      >
                        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.projectDescription}>
                      {project.description}
                    </Text>
                    <View style={styles.dateContainer}>
                      <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Start Date:</Text>
                        <Text style={styles.dateValue}>{formatDate(project.startDate)}</Text>
                      </View>
                      <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>End Date:</Text>
                        <Text style={styles.dateValue}>{formatDate(project.endDate)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Sidebar */}
          <Sidebar
            isVisible={sidebarVisible}
            onClose={handleSidebarClose}
            onNavigate={handleNavigation}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Custom Bottom Navigation - Outside KeyboardAvoidingView */}
      <CustomBottomNav keyboardVisible={keyboardVisible} />

          {/* Dropdown Menu */}
          {menuVisible && (
            <TouchableOpacity
              style={styles.dropdownOverlay}
              activeOpacity={1}
              onPress={closeMenu}
            >
              <View 
                style={[
                  styles.dropdownContainer,
                  {
                    position: 'absolute',
                    top: menuPosition.y,
                    left: menuPosition.x,
                  }
                ]}
              >
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleUpdate}
                >
                  <Ionicons name="create-outline" size={18} color="black" />
                  <Text style={styles.dropdownItemText}>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <Text style={[styles.dropdownItemText, { color: "#FF3B30" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.5,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  searchContainer: {
    paddingVertical: 20,
    backgroundColor: "white",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Proper spacing for bottom nav
  },
  projectCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardContent: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.3,
    flex: 1,
  },
  projectDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    fontWeight: "400",
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  dateItem: {
    flexDirection: "column",
  },
  dateLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    fontWeight: "500",
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 300,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  noProjectsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  dropdownItemText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen;
