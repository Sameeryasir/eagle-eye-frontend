import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEmployeesToAssignTask } from '../../services/employees/getEmployeesOfTheCompany';
import { createConversation } from '../../services/chats/createConversation';
import { createProjectConversation } from '../../services/chats/createPorjectConversation';
import { useAuth } from '../../context/AuthContext';
import { getMyProjects } from '../../services/projects/getProjectsByLoginUserId';
import { getEmployeesAssignedToProject } from '../../services/projects/getEmployeesAssignedToProject';


const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return '?';
  if (!lastName) return firstName.charAt(0).toUpperCase();
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};


const getAvatarColor = (name) => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Light Purple
    '#85C1E9', // Light Blue
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const SelectUserModal = ({ visible, onClose, onUserSelect }) => {
  // --- Local State Management (MCP Context 7) ---
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  
  // --- Project Popup State (MCP Context 7) ---
  // Custom popup similar to FilterModal's employee dropdown
  const [projects, setProjects] = useState([]);
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  
  // --- Keyboard State for Popup Positioning (MCP Context 7) ---
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // --- Get current user from auth context (MCP Context 7) ---
  // Business Rule: Don't show current user in the list (can't chat with yourself)
  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  
  useEffect(() => {
    if (visible) {
      fetchEmployees();
      fetchProjects();
      setSearchQuery('');
      setSelectedProject(null);
      setProjectSearchQuery('');
      setShowProjectPopup(false);
    }
  }, [visible]);


  useEffect(() => {
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

  // --- Fetch Employees Function (MCP Context 7) ---
  // Business Rule: Fetch all employees from company except current user
  const fetchEmployees = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('=== Fetching Employees for Chat ===');
      const response = await getEmployeesToAssignTask();
      
      if (response && Array.isArray(response)) {
        // Filter out current user (can't chat with yourself)
        const filteredEmployees = response.filter(
          emp => emp.id?.toString() !== currentUserId?.toString()
        );
        
        console.log('Total employees fetched:', response.length);
        console.log('Filtered employees (excluding current user):', filteredEmployees.length);
        console.log('Current user ID:', currentUserId);
        
        setEmployees(filteredEmployees);
      } else {
        console.warn('No employees data received from API');
        setEmployees([]);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load team members. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fetch Projects Function (MCP Context 7) ---
  // Business Rule: Fetch all projects for current user
  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    
    try {
      console.log('=== Fetching Projects ===');
      const response = await getMyProjects();
      
      if (response && Array.isArray(response)) {
        console.log('Projects loaded:', response.length);
        setProjects(response);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // --- Search Filter Logic (MCP Context 7) ---
  // Filter employees by name or email based on search query
  const filteredEmployees = React.useMemo(() => {
    if (searchQuery.trim() === '') {
      return employees;
    }
    
    return employees.filter(employee => {
      const firstName = employee.first_name || '';
      const lastName = employee.last_name || '';
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const email = (employee.email || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      
      return fullName.includes(query) || email.includes(query);
    });
  }, [searchQuery, employees]);

  // --- Filter Projects by Search Query (MCP Context 7) ---
  // Filter projects by name based on search query
  const filteredProjects = React.useMemo(() => {
    if (projectSearchQuery.trim() === '') {
      return projects;
    }
    
    return projects.filter(project => {
      const projectName = (project.name || project.title || '').toLowerCase();
      const query = projectSearchQuery.toLowerCase();
      return projectName.includes(query);
    });
  }, [projectSearchQuery, projects]);

  // --- Handle User Selection (MCP Context 7) ---
  // When user taps on an employee, create conversation and pass data back to parent
  const handleUserSelect = async (employee) => {
    console.log('=== User Selected ===');
    console.log('Employee:', employee);
    console.log('Employee ID:', employee.id);
    console.log('Employee ID Type:', typeof employee.id);
    console.log('Selected Project:', selectedProject);
    
    // Business Rule: Ensure employee ID exists
    if (!employee.id) {
      Alert.alert(
        'Error',
        'Employee ID is missing. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Business Rule: Create private conversation with selected employee
    setIsCreatingConversation(true);
    
    try {
      // Call API to create conversation (matching CreateConversationDto)
      // Ensure ID is a number (not string) for backend
      const employeeId = typeof employee.id === 'string' ? parseInt(employee.id, 10) : employee.id;
      
      const conversationData = {
        type: 'private', // Private conversation (1-on-1)
        participantIds: [employeeId], // Array with selected employee's ID as number
      };
      
      console.log('Creating conversation with data:', conversationData);
      console.log('Employee ID being sent:', employeeId, typeof employeeId);
      
      const response = await createConversation(conversationData);
      
      console.log('Conversation created successfully:', response);
      
      // Pass created conversation data to parent for navigation
      if (onUserSelect) {
        onUserSelect({
          employee: employee,
          conversation: response, // Pass the created conversation data
          project: selectedProject || null, // Pass selected project (if any)
          userId: employeeId, // Explicitly pass userId
        });
      }
      
      // Close modal after successful creation
      handleClose();
      
    } catch (err) {
      console.error('Error creating conversation:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);
      
      // Show detailed error message to user
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create conversation. Please try again.';
      
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
      
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // --- Handle Create Project Group Chat (MCP Context 7) ---
  // When user taps "Create Project Chat" button, create a group conversation for the project
  // Business Rule: Uses simplified API that automatically adds all project members
  const handleCreateProjectChat = async () => {
    console.log('=== Creating Project Group Chat ===');
    console.log('Selected Project:', selectedProject);
    
    // Business Rule: Ensure project is selected
    if (!selectedProject?.id) {
      Alert.alert(
        'Error',
        'Please select a project first.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setIsCreatingConversation(true);
    
    try {
      console.log('Creating project conversation for project ID:', selectedProject.id);
      
      // Call simplified API - backend handles adding all project members
      const response = await createProjectConversation(selectedProject.id);
      
      console.log('Project conversation created successfully:', response);
      
      // Pass created conversation data to parent for navigation
      if (onUserSelect) {
        onUserSelect({
          conversation: response,
          project: selectedProject,
          isGroupChat: true,
        });
      }
      
      // Close modal after successful creation
      handleClose();
      
    } catch (err) {
      console.error('Error creating project group chat:', err);
      console.error('Error response data:', err.response?.data);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create project chat. Please try again.';
      
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
      
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // --- Handle Modal Close (MCP Context 7) ---
  // Reset state when modal closes
  const handleClose = () => {
    setSearchQuery('');
    setError(null);
    setSelectedProject(null);
    setProjectSearchQuery('');
    setShowProjectPopup(false);
    Keyboard.dismiss();
    onClose();
  };

  // --- Handle Project Selection (MCP Context 7) ---
  // When user selects a project from the popup
  // Business Rule: Fetch employees assigned to the selected project
  const handleProjectSelect = async (project) => {
    console.log('🎯 Project selected:', project);
    setSelectedProject(project);
    setShowProjectPopup(false);
    
    // Fetch employees assigned to this project
    if (project && project.id) {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('📋 Fetching employees assigned to project:', project.id);
        const projectData = await getEmployeesAssignedToProject(project.id);
        
        console.log('✅ Project data received:', projectData);
        
        // Extract assignedTo array from response
        if (projectData && projectData.assignedTo && Array.isArray(projectData.assignedTo)) {
          // Filter out current user (can't chat with yourself)
          const filteredEmployees = projectData.assignedTo.filter(
            emp => emp.id?.toString() !== currentUserId?.toString()
          );
          
          console.log('👥 Assigned employees:', filteredEmployees.length);
          setEmployees(filteredEmployees);
        } else {
          console.warn('⚠️ No assigned employees in project data');
          setEmployees([]);
        }
      } catch (err) {
        console.error('❌ Error fetching project employees:', err);
        setError('Failed to load project employees. Please try again.');
        
        // Show alert to user
        Alert.alert(
          'Error',
          'Failed to load employees for this project. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  // --- Render Employee Item (MCP Context 7) ---
  // Individual employee list item with avatar and info - Premium card design
  const renderEmployeeItem = ({ item }) => {
    const firstName = item.first_name || '';
    const lastName = item.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
    const email = item.email || '';
    
    return (
      <View className="px-5 mb-3">
        <TouchableOpacity
          className="flex-row items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          onPress={() => handleUserSelect(item)}
          activeOpacity={0.7}
        >
          {/* Avatar with Initials - Enhanced Design */}
          <View 
            className="w-16 h-16 rounded-2xl items-center justify-center shadow-sm"
            style={{ backgroundColor: getAvatarColor(fullName) }}
          >
            <Text className="text-xl font-bold text-white">
              {getInitials(firstName, lastName)}
            </Text>
          </View>

          {/* User Info */}
          <View className="flex-1 ml-4">
            <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
              {fullName}
            </Text>
            {email && (
              <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
                {email}
              </Text>
            )}
          </View>

          {/* Arrow Button */}
          <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center ml-2">
            <Ionicons name="arrow-forward" size={18} color="#374151" />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // --- Empty State Component (MCP Context 7) ---
  // Show when no employees match search or no employees available - Premium design
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
          {searchQuery ? 'No team members found' : 'No team members'}
        </Text>
        <Text className="text-base text-gray-500 mt-2 text-center">
          {searchQuery 
            ? 'Try adjusting your search terms' 
            : 'There are no other team members to chat with'}
        </Text>
      </View>
    );
  };

  // --- Error State Component (MCP Context 7) ---
  // Show when API call fails - Premium design
  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center px-8 bg-gray-50">
      <View className="w-24 h-24 bg-red-50 rounded-3xl items-center justify-center mb-5">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
      </View>
      <Text className="text-xl font-bold text-gray-900 text-center">
        {error || 'Something went wrong'}
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

  // --- Loading State Component (MCP Context 7) ---
  // Show spinner while fetching employees
  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#000000" />
      <Text className="text-base text-gray-500 mt-4">Loading team members...</Text>
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
        {/* Header - Premium Design (MCP Context 7) */}
        <View className="bg-black px-6 pt-4 pb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white text-2xl font-bold">Start a Chat</Text>
              <Text className="text-gray-400 text-sm mt-1">Select a team member to connect</Text>
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

        {/* Controls Section - Premium Design (MCP Context 7) */}
        <View className="px-5 pt-5 pb-4 bg-gray-50">
          {/* Project Selection Card */}
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
                  console.log('🎯 Project selection button pressed - toggling popup');
                  
                  // Toggle popup and fetch projects if needed
                  if (!showProjectPopup) {
                    setShowProjectPopup(true);
                    if (projects.length === 0 && !isLoadingProjects) {
                      await fetchProjects();
                    }
                  } else {
                    setShowProjectPopup(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text 
                  className="flex-1 text-base font-semibold" 
                  style={{ color: selectedProject ? '#111827' : '#9CA3AF' }}
                >
                  {selectedProject 
                    ? selectedProject.name || selectedProject.title || 'Unnamed Project'
                    : 'Choose a project...'}
                </Text>
                
                {/* Dropdown Arrow Icon */}
                <Ionicons
                  name={showProjectPopup ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
              
              {/* Clear Project Button - Show only when project is selected */}
              {selectedProject && (
                <TouchableOpacity
                  className="ml-2 w-10 h-10 rounded-xl bg-gray-200 items-center justify-center"
                  onPress={async () => {
                    console.log('🔄 Clearing project selection');
                    setSelectedProject(null);
                    // Reload all employees
                    await fetchEmployees();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#374151" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search Bar Card */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-3">Team Members</Text>
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
                  onPress={() => setSearchQuery('')}
                  className="w-7 h-7 rounded-full bg-gray-200 items-center justify-center"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Create Project Chat Card - Show only when project is selected (MCP Context 7) */}
        {/* Business Rule: Appears between controls and employee list when project is selected */}
        {selectedProject && (
          <View className="px-5 pb-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <TouchableOpacity
                className="flex-row items-center justify-between"
                onPress={handleCreateProjectChat}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="people" size={24} color="black" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">
                      Create Project Chat
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Start a group conversation
                    </Text>
                  </View>
                </View>
                <View className="w-10 h-10 bg-black rounded-full items-center justify-center ml-2">
                  <Ionicons name="add" size={24} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Employee List (MCP Context 7) */}
        {isLoading ? (
          renderLoadingState()
        ) : error ? (
          renderErrorState()
        ) : filteredEmployees.length > 0 ? (
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployeeItem}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
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

        {/* Simple Project Selection Modal (MCP Context 7) */}
        {/* Business Rule: Clean, simple modal matching TaskDetailsScreen design */}
        <Modal
          visible={showProjectPopup}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowProjectPopup(false);
            setProjectSearchQuery('');
          }}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}>
            {/* Modal Container */}
            <View style={{
              backgroundColor: 'white',
              borderRadius: 16,
              width: '100%',
              maxWidth: 400,
              maxHeight: '70%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            }}>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#111827',
                }}>
                  Select Project
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowProjectPopup(false);
                    setProjectSearchQuery('');
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 16,
                backgroundColor: 'white',
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}>
                  <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search projects..."
                    value={projectSearchQuery}
                    onChangeText={setProjectSearchQuery}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: '#111827',
                    }}
                    placeholderTextColor="#9CA3AF"
                  />
                  {projectSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setProjectSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Project List */}
              <ScrollView 
                style={{ maxHeight: 300 }} 
                showsVerticalScrollIndicator={true}
              >
                {isLoadingProjects ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#000000" />
                    <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 14 }}>
                      Loading projects...
                    </Text>
                  </View>
                ) : filteredProjects.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 20 }}>
                    <Ionicons name="folder-outline" size={48} color="#D1D5DB" />
                    <Text style={{ color: '#6B7280', fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
                      {projectSearchQuery ? 'No projects found' : 'No projects available'}
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
                        backgroundColor: selectedProject?.id === project.id ? '#F3F4F6' : '#FFFFFF',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selectedProject?.id === project.id ? '#000000' : '#E5E7EB',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      {/* Folder Icon */}
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: selectedProject?.id === project.id ? '#000000' : '#E5E7EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Ionicons 
                          name="folder" 
                          size={20} 
                          color={selectedProject?.id === project.id ? '#FFFFFF' : '#6B7280'} 
                        />
                      </View>
                      
                      {/* Project Info */}
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: '#111827',
                        }}>
                          {project.name || project.title || 'Unnamed Project'}
                        </Text>
                        
                        {/* Company Tag - Show if company exists */}
                        {project.company && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Ionicons name="business" size={12} color="black" />
                            <Text style={{
                              fontSize: 12,
                              color: '#000000',
                              fontWeight: '600',
                              marginLeft: 4,
                            }}>
                              {project.company.name}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Checkmark */}
                      {selectedProject?.id === project.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#000000" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Loading Overlay (MCP Context 7) */}
        {/* Shows when creating conversation with API */}
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
      </View>
    </Modal>
  );
};

export default SelectUserModal;

