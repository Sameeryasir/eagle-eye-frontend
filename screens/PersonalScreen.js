import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEmployeesToAssignTask } from '../services/employees/getEmployeesOfTheCompany';
import { getMyProjects } from '../services/projects/getProjectsByLoginUserId';
import { assignProjectToEmployees } from '../services/projects/assignProject';
import Loader from '../services/utils/loader';
import CustomBottomNav from './components/CustomBottomNav';
import Toast from 'react-native-toast-message';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function PersonalScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState(false);
  
  // --- Project Dropdown State (MCP Context 7) ---
  // Business Rule: Manage project selection for employee assignment
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  

  // --- Load Employees Data (MCP Context 7) ---
  // Business Rule: Load all employees to display in personnel management screen
  useEffect(() => {
    loadEmployees();
    loadProjects();
  }, []);

  // --- Filter Employees Based on Search (MCP Context 7) ---
  // Business Rule: Allow managers to search employees by name and email for easier assignment
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(employee => {
        const firstName = employee.first_name?.toLowerCase() || '';
        const lastName = employee.last_name?.toLowerCase() || '';
        const email = employee.email?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        
        return firstName.includes(query) || 
               lastName.includes(query) || 
               email.includes(query) ||
               `${firstName} ${lastName}`.includes(query);
      });
      setFilteredEmployees(filtered);
    }
  }, [employees, searchQuery]);

  const loadEmployees = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('PersonalScreen - Loading employees...');
      const employeesData = await getEmployeesToAssignTask();
      console.log('PersonalScreen - Employees data:', employeesData);
      console.log('PersonalScreen - Employees data type:', typeof employeesData);
      console.log('PersonalScreen - Is array?', Array.isArray(employeesData));

      if (Array.isArray(employeesData)) {
        console.log('PersonalScreen - Setting employees array with length:', employeesData.length);
        if (employeesData.length > 0) {
          console.log('PersonalScreen - First employee:', employeesData[0]);
        }
        setEmployees(employeesData);
        setFilteredEmployees(employeesData); // Initialize filtered list
      } else {
        console.error('PersonalScreen - Invalid employees data format:', employeesData);
        console.error('PersonalScreen - Expected array but got:', typeof employeesData);
        setEmployees([]);
        setFilteredEmployees([]);
      }
    } catch (err) {
      console.error('PersonalScreen - Error loading employees:', err);
      setError('Failed to load employees. Please try again.');
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // --- Load Projects Data (MCP Context 7) ---
  // Business Rule: Load all projects for dropdown selection
  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      console.log('PersonalScreen - Loading projects...');
      const projectsData = await getMyProjects();
      console.log('PersonalScreen - Projects data:', projectsData);
      
      if (Array.isArray(projectsData)) {
        setProjects(projectsData);
      } else {
        console.error('PersonalScreen - Invalid projects data format:', projectsData);
        setProjects([]);
      }
    } catch (err) {
      console.error('PersonalScreen - Error loading projects:', err);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    loadEmployees(true);
    loadProjects();
  }, []);

  // --- Employee Selection Functions (MCP Context 7) ---
  // Business Rule: Allow managers to select multiple employees for project assignment
  const toggleEmployeeSelection = (employee) => {
    setSelectedEmployees(prev => {
      const isSelected = prev.some(emp => emp.id === employee.id);
      const newSelection = isSelected 
        ? prev.filter(emp => emp.id !== employee.id)
        : [...prev, employee];
      
      // Show/hide bulk actions based on selection
      setShowBulkActions(newSelection.length > 0);
      
      return newSelection;
    });
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
    setAssignmentMode(false);
    setShowBulkActions(false);
  };

  const selectAllEmployees = () => {
    setSelectedEmployees([...filteredEmployees]);
  };

  const deselectAllEmployees = () => {
    setSelectedEmployees([]);
  };

  // --- Assignment State Management (MCP Context 7) ---
  // Business Rule: Track assignment progress and results for better UX
  const [assignmentState, setAssignmentState] = useState({
    isAssigning: false,
    progress: 0,
    currentEmployee: null,
    successCount: 0,
    errorCount: 0,
    failedEmployees: [],
    results: null
  });

  // --- Bulk Actions State (MCP Context 7) ---
  // Business Rule: Manage floating action menu for bulk operations
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showProjectSelectionModal, setShowProjectSelectionModal] = useState(false);

  // --- Enhanced Project Assignment Functions (MCP Context 7) ---
  // Business Rule: Improved assignment flow with comprehensive validation and feedback
  const assignEmployeesToProject = async () => {
    // --- Pre-assignment Validation (MCP Context 7) ---
    // Business Rule: Validate all requirements before starting assignment
    if (!selectedProject) {
      Toast.show({
        type: 'error',
        text1: 'Project Required',
        text2: 'Please select a project before assigning employees.',
      });
      return;
    }

    if (selectedEmployees.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Employees Required',
        text2: 'Please select at least one employee to assign to the project.',
      });
      return;
    }

    // Validate employee data integrity
    const invalidEmployees = selectedEmployees.filter(emp => !emp.id || !emp.first_name);
    if (invalidEmployees.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Employee Data',
        text2: 'Some selected employees have missing information. Please refresh and try again.',
      });
      return;
    }

    // Show comprehensive confirmation with employee details
    const employeeNames = selectedEmployees.slice(0, 3).map(emp => `${emp.first_name} ${emp.last_name}`).join(', ');
    const remainingCount = Math.max(0, selectedEmployees.length - 3);
    const employeeList = remainingCount > 0 ? `${employeeNames} and ${remainingCount} more` : employeeNames;

    Alert.alert(
      'Confirm Assignment',
      `Assign ${selectedEmployees.length} employee(s) to "${selectedProject.name}"?\n\nEmployees: ${employeeList}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Assign', onPress: () => proceedWithAssignment() }
      ]
    );
  };

  const proceedWithAssignment = async () => {
    try {
      // Initialize assignment state
      setAssignmentState({
        isAssigning: true,
        progress: 0,
        currentEmployee: null,
        successCount: 0,
        errorCount: 0,
        failedEmployees: [],
        results: null
      });

      // Show initial progress
      Toast.show({
        type: 'info',
        text1: 'Starting Assignment',
        text2: `Assigning ${selectedEmployees.length} employee(s)...`,
      });

      // Prepare assignment data with validation
      const assignmentData = {
        projectId: selectedProject.id,
        employeeIds: selectedEmployees.map(employee => employee.id)
      };

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setAssignmentState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      // Call the assignment service
      const result = await assignProjectToEmployees(assignmentData);
      
      clearInterval(progressInterval);

      // Update final state
      setAssignmentState(prev => ({
        ...prev,
        isAssigning: false,
        progress: 100,
        successCount: selectedEmployees.length,
        errorCount: 0,
        results: result
      }));

      // Success feedback with detailed information
      Toast.show({
        type: 'success',
        text1: 'Assignment Successful!',
        text2: `All ${selectedEmployees.length} employee(s) assigned to ${selectedProject.name}`,
      });

      // Clear selection after successful assignment
      setTimeout(() => {
        setSelectedEmployees([]);
        setSelectedProject(null);
        setAssignmentState({
          isAssigning: false,
          progress: 0,
          currentEmployee: null,
          successCount: 0,
          errorCount: 0,
          failedEmployees: [],
          results: null
        });
      }, 2000);

      console.log('Assignment completed successfully:', result);

    } catch (error) {
      console.error('Assignment error:', error);
      
      // Clear progress interval if it exists
      setAssignmentState(prev => ({
        ...prev,
        isAssigning: false,
        progress: 0,
        errorCount: selectedEmployees.length,
        failedEmployees: selectedEmployees,
        results: null
      }));

      // Enhanced error handling with specific messages
      let errorMessage = 'An unexpected error occurred during assignment';
      
      if (error.message.includes('Authentication')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.message.includes('company')) {
        errorMessage = 'Some employees belong to a different company and cannot be assigned.';
      } else if (error.message.includes('project')) {
        errorMessage = 'Project assignment failed. The project may not exist or you may not have permission.';
      } else if (error.message.includes('employee')) {
        errorMessage = 'Some employee records could not be found or are invalid.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Show detailed error with retry option
      Alert.alert(
        'Assignment Failed',
        `${errorMessage}\n\nWould you like to try again?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => proceedWithAssignment() }
        ]
      );

      Toast.show({
        type: 'error',
        text1: 'Assignment Failed',
        text2: errorMessage,
      });
    }
  };

  const clearProjectSelection = () => {
    setSelectedProject(null);
    setSelectedEmployees([]);
  };


  // --- Employee Card Component (MCP Context 7) ---
  // Business Rule: Display employee information in a clean card format with selection capability
  const EmployeeCard = ({ employee }) => {
    // Safety check: ensure employee object exists
    if (!employee || typeof employee !== 'object') {
      console.error('PersonalScreen - Invalid employee object:', employee);
      return null;
    }

    // Ensure we have valid string values for display
    const firstName = typeof employee.first_name === 'string' ? employee.first_name : '';
    const lastName = typeof employee.last_name === 'string' ? employee.last_name : '';
    const employeeEmail = typeof employee.email === 'string' ? employee.email : '';
    
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName = fullName || employeeEmail || 'Unknown Employee';
    const email = employeeEmail || 'No email provided';
    
    // Check if employee is selected
    const isSelected = selectedEmployees.some(emp => emp.id === employee.id);
    
    // Debug logging to see the employee object structure
    console.log('PersonalScreen - Employee object:', employee);
    console.log('PersonalScreen - Display name:', displayName);
    console.log('PersonalScreen - Email:', email);

    return (
      <TouchableOpacity
        onPress={() => toggleEmployeeSelection(employee)}
        style={{
          backgroundColor: isSelected ? '#f0f0f0' : 'white',
          borderRadius: Math.min(12, screenWidth * 0.03),
          padding: Math.min(12, screenWidth * 0.03),
          marginHorizontal: Math.min(20, screenWidth * 0.05),
          marginBottom: Math.min(8, screenHeight * 0.01),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 1,
          zIndex: 1,
          borderWidth: 0,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Person Icon - Smaller */}
          <View
            style={{
              width: Math.min(40, screenWidth * 0.1),
              height: Math.min(40, screenWidth * 0.1),
              borderRadius: Math.min(20, screenWidth * 0.05),
              backgroundColor: isSelected ? '#f0f0f0' : '#f8f9fa',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: Math.min(12, screenWidth * 0.03),
              borderWidth: 1,
              borderColor: isSelected ? '#333' : '#e9ecef',
            }}
          >
            <Ionicons
              name="person"
              size={Math.min(18, screenWidth * 0.045)}
              color={isSelected ? '#333' : '#6c757d'}
            />
          </View>

          {/* Employee Information - More Compact */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: '#1a1a1a',
                marginBottom: Math.min(2, screenHeight * 0.0025),
                letterSpacing: 0.2,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              style={{
                fontSize: Math.min(12, screenWidth * 0.03),
                color: '#6c757d',
                fontWeight: '400',
                letterSpacing: 0.1,
                marginBottom: Math.min(4, screenHeight * 0.005),
              }}
              numberOfLines={1}
            >
              {email}
            </Text>
            
            {/* Role Badge - Smaller */}
            {employee.role && typeof employee.role === 'string' && (
              <View
                style={{
                  backgroundColor: '#e3f2fd',
                  paddingHorizontal: Math.min(6, screenWidth * 0.015),
                  paddingVertical: Math.min(2, screenHeight * 0.0025),
                  borderRadius: Math.min(8, screenWidth * 0.02),
                  alignSelf: 'flex-start',
                }}
              >
                <Text
                  style={{
                    fontSize: Math.min(10, screenWidth * 0.025),
                    color: '#1976d2',
                    fontWeight: '500',
                    letterSpacing: 0.1,
                  }}
                >
                  {employee.role}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Project Dropdown Component (MCP Context 7) ---
  // Business Rule: Display project selection dropdown for employee assignment with inline assign button
  const ProjectDropdown = () => (
    <View style={{ marginBottom: Math.min(16, screenHeight * 0.02) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Math.min(8, screenWidth * 0.02),
        }}
      >
        {/* Project Dropdown */}
        <TouchableOpacity
          onPress={() => setShowProjectDropdown(!showProjectDropdown)}
          style={{
            backgroundColor: '#f8f9fa',
            borderRadius: Math.min(12, screenWidth * 0.03),
            paddingHorizontal: Math.min(16, screenWidth * 0.04),
            paddingVertical: Math.min(12, screenHeight * 0.015),
            borderWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flex: 1,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons
              name="folder"
              size={Math.min(18, screenWidth * 0.045)}
              color={selectedProject ? '#333' : '#999'}
              style={{ marginRight: Math.min(8, screenWidth * 0.02) }}
            />
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                color: selectedProject ? '#333' : '#999',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {selectedProject ? selectedProject.name : 'Choose a project...'}
            </Text>
          </View>
          
          <Ionicons
            name={showProjectDropdown ? "chevron-up" : "chevron-down"}
            size={Math.min(20, screenWidth * 0.05)}
            color="#6c757d"
          />
        </TouchableOpacity>

        {/* Assign Button */}
        {selectedProject && selectedEmployees.length > 0 && !assignmentState.isAssigning && (
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: Math.min(16, screenWidth * 0.04),
              paddingVertical: Math.min(12, screenHeight * 0.015),
              borderRadius: Math.min(12, screenWidth * 0.03),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: Math.min(80, screenWidth * 0.2),
            }}
            onPress={assignEmployeesToProject}
          >
            <Ionicons
              name="checkmark"
              size={Math.min(16, screenWidth * 0.04)}
              color="white"
              style={{ marginRight: Math.min(4, screenWidth * 0.01) }}
            />
            <Text
              style={{
                color: 'white',
                fontSize: Math.min(14, screenWidth * 0.035),
                fontWeight: '600',
              }}
            >
              Assign
            </Text>
          </TouchableOpacity>
        )}

        {/* Assignment in Progress Indicator */}
        {assignmentState.isAssigning && (
          <View style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: Math.min(16, screenWidth * 0.04),
            paddingVertical: Math.min(12, screenHeight * 0.015),
            borderRadius: Math.min(12, screenWidth * 0.03),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: Math.min(100, screenWidth * 0.25),
          }}>
            <ActivityIndicator size="small" color="white" />
            <Text
              style={{
                color: 'white',
                fontSize: Math.min(14, screenWidth * 0.035),
                fontWeight: '600',
                marginLeft: Math.min(8, screenWidth * 0.02),
              }}
            >
              Assigning...
            </Text>
          </View>
        )}
      </View>

      {/* Inline Dropdown List */}
      {showProjectDropdown && (
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: Math.min(12, screenWidth * 0.03),
            borderWidth: 1,
            borderColor: '#e9ecef',
            marginTop: Math.min(4, screenHeight * 0.005),
            maxHeight: Math.min(200, screenHeight * 0.25),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          {projectsLoading ? (
            <View style={{ padding: Math.min(20, screenWidth * 0.05), alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#1976d2" />
              <Text style={{ marginTop: Math.min(8, screenHeight * 0.01), color: '#666' }}>
                Loading projects...
              </Text>
            </View>
          ) : projects.length === 0 ? (
            <View style={{ padding: Math.min(20, screenWidth * 0.05), alignItems: 'center' }}>
              <Text style={{ color: '#999', fontSize: Math.min(14, screenWidth * 0.035) }}>
                No projects available
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: Math.min(180, screenHeight * 0.22) }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  onPress={() => {
                    setSelectedProject(project);
                    setShowProjectDropdown(false);
                  }}
                  style={{
                    paddingHorizontal: Math.min(16, screenWidth * 0.04),
                    paddingVertical: Math.min(12, screenHeight * 0.015),
                    borderBottomWidth: 1,
                    borderBottomColor: '#f0f0f0',
                    backgroundColor: selectedProject?.id === project.id ? '#e3f2fd' : 'transparent',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                      name="folder"
                      size={Math.min(16, screenWidth * 0.04)}
                      color="#333"
                      style={{ marginRight: Math.min(8, screenWidth * 0.02) }}
                    />
                    <Text
                      style={{
                        fontSize: Math.min(16, screenWidth * 0.04),
                        color: selectedProject?.id === project.id ? '#333' : '#333',
                        fontWeight: selectedProject?.id === project.id ? '600' : '400',
                      }}
                      numberOfLines={1}
                    >
                      {project.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );

  // --- Employee Search Bar Component (MCP Context 7) ---
  // Business Rule: Provide search functionality for employees
  const EmployeeSearchBar = () => (
    <View style={{ marginBottom: Math.min(16, screenHeight * 0.02) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: Math.min(12, screenWidth * 0.03),
          paddingHorizontal: Math.min(16, screenWidth * 0.04),
          paddingVertical: Math.min(12, screenHeight * 0.015),
          borderWidth: 1,
          borderColor: '#e9ecef',
        }}
      >
        <Ionicons
          name="search"
          size={Math.min(18, screenWidth * 0.045)}
          color="#6c757d"
          style={{ marginRight: Math.min(8, screenWidth * 0.02) }}
        />
        <TextInput
          style={{
            flex: 1,
            fontSize: Math.min(16, screenWidth * 0.04),
            color: '#333',
            paddingVertical: Math.min(4, screenHeight * 0.005),
          }}
          placeholder="Search by name or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons
              name="close-circle"
              size={Math.min(18, screenWidth * 0.045)}
              color="#6c757d"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );


  // --- Assignment Progress Component (MCP Context 7) ---
  // Business Rule: Show real-time progress during assignment process
  const AssignmentProgress = () => {
    if (!assignmentState.isAssigning && assignmentState.progress === 0) {
      return null;
    }

    return (
      <View
        style={{
          backgroundColor: '#f8f9fa',
          borderRadius: Math.min(12, screenWidth * 0.03),
          padding: Math.min(16, screenWidth * 0.04),
          marginBottom: Math.min(16, screenHeight * 0.02),
          borderWidth: 1,
          borderColor: assignmentState.isAssigning ? '#007AFF' : '#34C759',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Math.min(8, screenHeight * 0.01) }}>
          <ActivityIndicator 
            size="small" 
            color={assignmentState.isAssigning ? '#007AFF' : '#34C759'} 
            style={{ marginRight: Math.min(8, screenWidth * 0.02) }}
          />
          <Text
            style={{
              fontSize: Math.min(14, screenWidth * 0.035),
              fontWeight: '600',
              color: assignmentState.isAssigning ? '#007AFF' : '#34C759',
            }}
          >
            {assignmentState.isAssigning ? 'Assigning Employees...' : 'Assignment Complete!'}
          </Text>
        </View>

        {/* Progress Bar */}
        <View
          style={{
            height: Math.min(6, screenHeight * 0.0075),
            backgroundColor: '#e9ecef',
            borderRadius: Math.min(3, screenWidth * 0.0075),
            overflow: 'hidden',
            marginBottom: Math.min(8, screenHeight * 0.01),
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${assignmentState.progress}%`,
              backgroundColor: assignmentState.isAssigning ? '#007AFF' : '#34C759',
              borderRadius: Math.min(3, screenWidth * 0.0075),
            }}
          />
        </View>

        {/* Progress Text */}
        <Text
          style={{
            fontSize: Math.min(12, screenWidth * 0.03),
            color: '#666',
            textAlign: 'center',
          }}
        >
          {assignmentState.isAssigning 
            ? `${assignmentState.progress}% - Processing assignment...`
            : `Successfully assigned ${assignmentState.successCount} employee(s)`
          }
        </Text>
      </View>
    );
  };

  // --- Action Buttons Component (MCP Context 7) ---
  // Business Rule: Show assignment progress only
  const ActionButtons = () => {
    return (
      <View>
        {/* Assignment Progress */}
        <AssignmentProgress />
      </View>
    );
  };

  // --- Header Component (MCP Context 7) ---
  // Business Rule: Display screen title, project dropdown, and search functionality
  const Header = () => (
    <View
      style={{
        backgroundColor: 'white',
        paddingHorizontal: Math.min(20, screenWidth * 0.05),
        paddingVertical: Math.min(20, screenHeight * 0.025),
      }}
    >
      {/* Project Dropdown at the top */}
      <ProjectDropdown />
      
      {/* Action Buttons */}
      <ActionButtons />
      
      {/* Employee Search Bar below */}
      <EmployeeSearchBar />
    </View>
  );

  // --- Empty State Component (MCP Context 7) ---
  // Business Rule: Show appropriate message when no employees are found
  const EmptyState = () => {
    const isSearchEmpty = searchQuery.trim() !== '' && filteredEmployees.length === 0;
    const isNoEmployees = employees.length === 0;
    
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: Math.min(40, screenWidth * 0.1),
          paddingVertical: Math.min(60, screenHeight * 0.075),
        }}
      >
        <Ionicons
          name={isSearchEmpty ? "search-outline" : "people-outline"}
          size={Math.min(80, screenWidth * 0.2)}
          color="#ccc"
        />
        <Text
          style={{
            fontSize: Math.min(18, screenWidth * 0.045),
            fontWeight: '600',
            color: '#666',
            marginTop: Math.min(16, screenHeight * 0.02),
            marginBottom: Math.min(8, screenHeight * 0.01),
            textAlign: 'center',
          }}
        >
          {isSearchEmpty ? 'No Search Results' : 'No Employees Found'}
        </Text>
        <Text
          style={{
            fontSize: Math.min(14, screenWidth * 0.035),
            color: '#999',
            textAlign: 'center',
            lineHeight: Math.min(20, screenHeight * 0.025),
          }}
        >
          {isSearchEmpty 
            ? `No employees found matching "${searchQuery}". Try a different search term.`
            : error || 'No employees are currently registered in the system.'
          }
        </Text>
        
        {isSearchEmpty ? (
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: Math.min(24, screenWidth * 0.06),
              paddingVertical: Math.min(12, screenHeight * 0.015),
              borderRadius: Math.min(8, screenWidth * 0.02),
              marginTop: Math.min(16, screenHeight * 0.02),
            }}
            onPress={() => setSearchQuery('')}
          >
            <Text
              style={{
                color: 'white',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}
            >
              Clear Search
            </Text>
          </TouchableOpacity>
        ) : error ? (
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: Math.min(24, screenWidth * 0.06),
              paddingVertical: Math.min(12, screenHeight * 0.015),
              borderRadius: Math.min(8, screenWidth * 0.02),
              marginTop: Math.min(16, screenHeight * 0.02),
            }}
            onPress={() => loadEmployees()}
          >
            <Text
              style={{
                color: 'white',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  // --- Loading State (MCP Context 7) ---
  // Business Rule: Show loading indicator while fetching employees
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <Header />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Loader size="large" color="#000000" text="Loading employees..." />
        </View>
        <CustomBottomNav />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

      {/* Employee List with Header */}
      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => String(item.id || item.email || Math.random())}
        renderItem={({ item }) => <EmployeeCard employee={item} />}
        ListHeaderComponent={<Header />}
        contentContainerStyle={{
          paddingBottom: Math.min(100, screenHeight * 0.125),
        }}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />


      {/* Bottom Navigation */}
      <CustomBottomNav />
    </View>
  );
}

export default PersonalScreen;