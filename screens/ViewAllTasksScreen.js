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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import { deleteTaskById } from "../services/tasks/deleteTaskById";
import { getTaskByProjectId } from "../services/tasks/getTaskByProjectId";


function ViewAllTasksScreen({ navigation, route }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [project, setProject] = useState(null);

  // Get projectId from route params
  const { projectId } = route.params || {};

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (projectId) {
        loadProjectData();
      }
    }, [projectId])
  );

  // Reset search when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      setFilteredTasks(tasks);
    }
  }, [tasks]);

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

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching tasks for project ID:', projectId);
      
      // Fetch project and tasks data using getTaskByProjectId
      const response = await getTaskByProjectId(projectId);
      
      console.log('API Response from getTaskByProjectId:', response);
      console.log('Response type:', typeof response);
      console.log('Is response an array?', Array.isArray(response));
      
      if (response) {
        console.log('Response keys:', Object.keys(response));
        console.log('Response.project:', response.project);
        console.log('Response.tasks:', response.tasks);
      }
      
      // Set project data
      if (response && response.project) {
        console.log('Setting project from response.project');
        setProject(response.project);
      } else if (response) {
        console.log('Setting project from response directly');
        // If the API returns project data directly
        setProject(response);
      }
      
      // Set tasks data
      if (response && response.tasks) {
        console.log('Setting tasks from response.tasks, count:', response.tasks.length);
        setTasks(response.tasks);
        setFilteredTasks(response.tasks);
      } else if (response && Array.isArray(response)) {
        console.log('Setting tasks from response array, count:', response.length);
        // If the API returns tasks array directly
        setTasks(response);
        setFilteredTasks(response);
      } else {
        console.log('No tasks found, setting empty array');
        setTasks([]);
        setFilteredTasks([]);
      }
      
      // Reset search term when loading new data
      setSearchTerm('');
    } catch (err) {
      console.error('Error loading project data:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getAssignedToName = (assignedTo) => {
    if (!assignedTo) return "Unassigned";
    const firstName = assignedTo.first_name || "";
    const lastName = assignedTo.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName && assignedTo.email) {
      return assignedTo.email;
    }
    return fullName || "Unassigned";
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
    console.log('Search term:', text);
    console.log('Current tasks count:', tasks.length);
    
    if (text.trim() === '') {
      setFilteredTasks(tasks);
      console.log('Empty search, showing all tasks:', tasks.length);
    } else {
      const searchLower = text.toLowerCase().trim();
      console.log('Searching for:', searchLower);
      
      const filtered = tasks.filter(task => {
        try {
          // Search only in task title
          const titleMatch = task.title && task.title.toLowerCase().includes(searchLower);
          
          if (titleMatch) {
            console.log('Task matches search:', task.title, 'Search term:', searchLower);
          }
          
          return titleMatch;
        } catch (error) {
          console.error('Error filtering task:', task, error);
          return false;
        }
      });
      
      console.log('Filtered tasks count:', filtered.length);
      setFilteredTasks(filtered);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleMenuPress = (task, event) => {
    // Get the position of the pressed button
    event.target.measure((x, y, width, height, pageX, pageY) => {
      setMenuPosition({
        x: pageX + width - 120, // Position dropdown to the right of the button
        y: pageY + height + 5, // Position below the button
      });
    });
    
    setSelectedTask(task);
    setMenuVisible(true);
  };

  const handleUpdate = () => {
    console.log("Update task:", selectedTask?.id);
    setMenuVisible(false);
    setSelectedTask(null);
    
         // Navigate to UpdateTaskScreen with the task data
     if (selectedTask) {
       navigation.navigate('UpdateTask', { task: selectedTask, projectId: project?.id });
     }
  };

  const handleDelete = () => {
    const taskId = selectedTask?.id;
    const taskTitle = selectedTask?.title;
    
    if (!taskId) {
      console.error("No task ID found");
      return;
    }
    
    // Close the dropdown menu before showing the alert
    setMenuVisible(false);
    setSelectedTask(null);
    
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${taskTitle}" permanently? This action is not reversible.`,
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
              console.log("Calling delete API for task:", taskId);
              
              // Call the delete task API first
              await deleteTaskById(taskId);
              
              // Only remove from local state if API call is successful
              console.log("API call successful, removing task from local state:", taskId);
              
              // Remove the task from both tasks and filteredTasks arrays
              const updatedTasks = tasks.filter(task => task.id !== taskId);
              const updatedFilteredTasks = filteredTasks.filter(task => task.id !== taskId);
              
              // Update the state
              setTasks(updatedTasks);
              setFilteredTasks(updatedFilteredTasks);
              
              // Show success message
              Alert.alert(
                "Success",
                "Task deleted successfully!",
                [{ text: "OK" }]
              );
              
            } catch (error) {
              console.error("Error deleting task:", error);
              
              // Show error message with more details
              let errorMessage = "Failed to delete task. Please try again.";
              if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = error.message;
              }
              
              Alert.alert(
                "Error",
                errorMessage,
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
    setSelectedTask(null);
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleSidebarToggle}
        >
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Tasks
        </Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainerStyle}
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
                  placeholder="Search tasks..."
                  placeholderTextColor="#999"
                  value={searchTerm}
                  onChangeText={handleSearch}
                  returnKeyType="search"
                  blurOnSubmit={true}
                  onFocus={() => console.log('Search input focused')}
                  onBlur={() => console.log('Search input blurred')}
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => handleSearch('')}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {loading ? (
              <View style={styles.centerContainer}>
                <Text style={styles.loadingText}>Loading tasks...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadProjectData}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : filteredTasks.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.noTasksText}>
                  {searchTerm.trim() !== '' ? 'No tasks match your search' : 'No tasks found'}
                </Text>
              </View>
                         ) : (
               <>
                                   {filteredTasks.map((task) => (
                   <View key={task.id} style={styles.taskCard}>
                     <View style={styles.cardContent}>
                       <View style={styles.cardHeader}>
                         <View style={styles.titleContainer}>
                           <Text style={styles.taskTitle}>{task.title}</Text>
                         </View>
                         <TouchableOpacity
                           style={styles.menuButton}
                           onPress={(event) => handleMenuPress(task, event)}
                         >
                           <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                         </TouchableOpacity>
                       </View>

                       <View style={styles.taskDetails}>
                         <View style={styles.taskDetailSection}>
                           <Text style={styles.taskSectionLabel}>Description</Text>
                           <Text style={styles.taskDescription} numberOfLines={2}>
                             {task.description || "No description"}
                           </Text>
                         </View>
                         
                         <View style={styles.taskInfoRow}>
                           <View style={styles.taskInfoItem}>
                             <Ionicons name="person" size={16} color="#666" />
                             <Text style={styles.taskInfoLabel}>Assigned</Text>
                             <Text style={styles.taskInfoValue}>
                               {getAssignedToName(task.assignedTo)}
                             </Text>
                           </View>
                           
                           <View style={styles.taskInfoItem}>
                             <Ionicons name="calendar" size={16} color="#666" />
                             <Text style={styles.taskInfoLabel}>Start Date</Text>
                             <Text style={styles.taskInfoValue}>
                               {formatDate(task.startTime)}
                             </Text>
                           </View>
                           
                           <View style={styles.taskInfoItem}>
                             <Ionicons name="calendar-outline" size={16} color="#666" />
                             <Text style={styles.taskInfoLabel}>End Date</Text>
                             <Text style={styles.taskInfoValue}>
                               {formatDate(task.endTime)}
                             </Text>
                           </View>
                         </View>
                       </View>
                     </View>
                   </View>
                 ))}
              </>
            )}
        </ScrollView>
      </View>

      {/* Sidebar */}
      <Sidebar
        isVisible={sidebarVisible}
        onClose={handleSidebarClose}
        onNavigate={handleSidebarClose}
      />

      {/* Bottom Navigation - Only show when keyboard is not visible */}
      {!keyboardVisible && (
        <CustomBottomNav task={true} projectId={projectId} />
      )}

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

  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight - 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "white",
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
    paddingVertical: 10,
    backgroundColor: "white",
    paddingBottom:20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 25,
    paddingHorizontal: 25,
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
  clearButton: {
    padding: 5,
    marginLeft: 8,
  },
  searchResultsInfo: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  searchResultsText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainerStyle: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 100, // Space for bottom navigation
  },
  taskCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  cardContent: {
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    lineHeight: 24,
  },
  taskDetails: {
    gap: 16,
  },
  taskDetailSection: {
    marginBottom: 8,
  },
  taskSectionLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  taskDescription: {
    fontSize: 15,
    color: "#555",
    lineHeight: 20,
    fontStyle: "italic",
  },
  taskInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  taskInfoItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  taskInfoLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 2,
    textAlign: "center",
  },
  taskInfoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    lineHeight: 16,
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
  noTasksText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
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

export default ViewAllTasksScreen;
