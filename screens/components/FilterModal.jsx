import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { filterTask } from '../../services/tasks/filterTask';
import { getEmployeesToAssignTask } from '../../services/employees/getEmployeesOfTheCompany';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FilterModal = ({
  visible,
  onClose,
  selectedFilters,
  setSelectedFilters,
  onApplyFilters,
  onClearFilters,
  userRole,
  projectId,
}) => {
  // --- Loading State for Apply Filters Button ---
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  
  // --- State for Popup Menu Management ---
  const [showEmployeePopup, setShowEmployeePopup] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- Keyboard State for Popup Positioning ---
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  

  // --- Clear Selected Employee When Modal Opens ---
  // Business Rule: Reset employee selection when modal becomes visible to avoid confusion
  useEffect(() => {
    if (visible) {
      setSelectedEmployee(null);
      setSearchQuery('');
      setShowEmployeePopup(false);
    }
  }, [visible]);

  // --- Keyboard Event Listeners for Popup Positioning ---
  // Business Rule: Track keyboard visibility to adjust popup position without changing height
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

  


  // --- Function to Fetch Employees (Same as TaskDetailsScreen) ---
  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const data = await getEmployeesToAssignTask();
      console.log('📋 Fetched employees:', data);
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // --- Search and Filter Functions (Same as TaskDetailsScreen) ---
  const filteredEmployees = employees.filter(employee => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const firstName = employee.first_name?.toLowerCase() || '';
    const lastName = employee.last_name?.toLowerCase() || '';
    const email = employee.email?.toLowerCase() || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return firstName.includes(query) ||
      lastName.includes(query) ||
      fullName.includes(query) ||
      email.includes(query);
  });

  // --- Function to Handle Employee Selection ---
  const handleEmployeeSelect = (employee) => {
    console.log('🎯 Employee selected:', employee);
    console.log('🎯 Employee email:', employee.email);
    
    setSelectedEmployee(employee);
    setShowEmployeePopup(false);
    // Update the selected filters to include the specific employee
    setSelectedFilters((prev) => ({ 
      ...prev, 
      assignedTo: 'assigned-to-others',
      selectedEmployeeId: employee.id,
      selectedEmployeeName: employee.first_name && employee.last_name
        ? `${employee.first_name} ${employee.last_name}`
        : employee.email || 'Unknown Employee',
      email: employee.email // Pass employee email to service
    }));
  };

  const handleClearFilters = () => {
    // --- Clear Local State ---
    setSelectedFilters({
      createdAt: null, // No default selection
      assignedTo: null, // No default selection
      upcoming: null, // No default selection
      status: null, // No default selection
      email: null, // Clear employee email
    });
    // --- Reset Popup Menu State ---
    setSelectedEmployee(null);
    setSearchQuery('');
    setShowEmployeePopup(false);
    
    // --- Call Parent's Clear Filters Function ---
    if (onClearFilters) {
      onClearFilters();
    }
    
    // --- Close Filter Modal (MCP Context 7) ---
    // Business Rule: Auto-close modal after clearing filters for better UX
    onClose();
  };




  const handleApplyFilters = async () => {
    console.log('Applying filters:', selectedFilters);
    
    // --- Check if any filters are actually selected ---
    const hasFilters = selectedFilters.createdAt || 
                      selectedFilters.assignedTo || 
                      selectedFilters.status;
    
    if (!hasFilters) {
      console.log('No filters selected - calling clear filters instead');
      handleClearFilters();
      return;
    }
    
    // --- Show Loading Indicator While Processing ---
    setIsApplyingFilters(true);
    
    try {
      // --- Call filterTask Service Directly from FilterModal ---
      // Business Rule: Filter tasks using backend service when filters are applied
      if (projectId) {
        // --- Prepare filters with closedTask parameter ---
        const filtersWithClosedTask = {
          ...selectedFilters,
          closedTask: selectedFilters.status === 'closed' ? true : false
        };
        
        // --- Fix Backend Conflict: Remove date filters when closedTask is true ---
        // Business Rule: Backend has conflicting logic between closedTask and date filters
        if (filtersWithClosedTask.closedTask === true) {
          // Reset date filter to avoid conflict with closedTask filter
          filtersWithClosedTask.createdAt = null; // No selection
          console.log('🔒 Closed task selected - resetting date filter to avoid backend conflict');
        }
        
        console.log('Calling filterTask service with filters:', filtersWithClosedTask);
        const filteredTasks = await filterTask(filtersWithClosedTask, projectId);
        console.log('Filtered tasks received:', filteredTasks);
        
        // Pass filtered tasks back to parent component
        onApplyFilters(filtersWithClosedTask, filteredTasks);
      } else {
        console.error('FilterModal - No projectId available for filtering');
        // Fallback to original behavior if no projectId
        onApplyFilters(selectedFilters);
      }
    } catch (error) {
      console.error('FilterModal - Error calling filterTask service:', error);
      // Fallback to original behavior on error
      onApplyFilters(selectedFilters);
    } finally {
      // --- Hide Loading Indicator ---
      setIsApplyingFilters(false);
    }
    
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: '#000',
            paddingVertical: Math.min(16, screenHeight * 0.02),
            paddingHorizontal: Math.min(20, screenWidth * 0.05),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: Math.min(18, screenWidth * 0.045),
              fontWeight: '600',
            }}
          >
            Filter Tasks
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{ padding: Math.min(8, screenWidth * 0.02) }}
          >
            <Ionicons
              name="close"
              size={Math.min(24, screenWidth * 0.06)}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {/* Filter Content */}
        <ScrollView
          style={{ flex: 1, padding: Math.min(20, screenWidth * 0.05) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 50
          }}
        >
          {/* Assigned To Filter */}
          <View style={{ 
            marginBottom: Math.min(24, screenHeight * 0.03),
            opacity: selectedFilters.status === 'closed' ? 0.5 : 1
          }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: selectedFilters.status === 'closed' ? '#9CA3AF' : '#374151',
                marginBottom: Math.min(12, screenHeight * 0.015),
              }}
            >
              Assigned To
            </Text>
            {(userRole === 'Owner'
              ? ['all', 'assigned-to-me', 'assigned-to-others', 'unassigned']
              : userRole === 'Manager'
                ? ['all', 'assigned-to-me', 'assigned-to-others', 'unassigned']
                : userRole === 'Employee'
                  ? ['all', 'assigned-to-me']
                  : ['all', 'assigned-to-me', 'unassigned']
            ).map((assignedTo) => (
              <View key={assignedTo}>
                {assignedTo === 'assigned-to-others' ? (
                  // --- Custom Popup Menu for Assigned to Others ---
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: Math.min(12, screenHeight * 0.015),
                      paddingHorizontal: Math.min(16, screenWidth * 0.04),
                      backgroundColor:
                        selectedFilters.assignedTo === assignedTo
                          ? '#F3F4F6'
                          : 'transparent',
                      borderRadius: Math.min(8, screenWidth * 0.02),
                      marginBottom: Math.min(8, screenHeight * 0.01),
                    }}
                    onPress={async () => {
                      // Don't allow assigned to selection when closed tasks is selected
                      if (selectedFilters.status === 'closed') return;
                      
                      console.log('🎯 assignedTo = others - toggling popup');
                      setSelectedFilters((prev) => ({ ...prev, assignedTo }));
                      
                      // --- Toggle Popup and Show Loading ---
                      if (!showEmployeePopup) {
                        // Show popup first with loading state
                        setShowEmployeePopup(true);
                        setLoadingEmployees(true);
                        
                        // Then fetch employees
                        if (employees.length === 0) {
                          await fetchEmployees();
                        } else {
                          setLoadingEmployees(false);
                        }
                      } else {
                        setShowEmployeePopup(false);
                      }
                    }}
                  >
                    <View
                      style={{
                        width: Math.min(20, screenWidth * 0.05),
                        height: Math.min(20, screenWidth * 0.05),
                        borderRadius: Math.min(10, screenWidth * 0.025),
                        borderWidth: 2,
                        borderColor:
                          selectedFilters.assignedTo === assignedTo
                            ? '#000'
                            : '#D1D5DB',
                        backgroundColor:
                          selectedFilters.assignedTo === assignedTo
                            ? '#000'
                            : 'transparent',
                        marginRight: Math.min(12, screenWidth * 0.03),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selectedFilters.assignedTo === assignedTo && (
                        <Ionicons
                          name="checkmark"
                          size={Math.min(12, screenWidth * 0.03)}
                          color="white"
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: Math.min(15, screenWidth * 0.038),
                        color: '#374151',
                        textTransform: 'capitalize',
                        flex: 1,
                      }}
                    >
                      {selectedEmployee 
                        ? `Assigned to ${selectedEmployee.first_name && selectedEmployee.last_name
                            ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                            : selectedEmployee.email || 'Unknown Employee'}`
                        : 'Assigned to Others'}
                    </Text>
                    
                    {/* --- Popup Menu Arrow --- */}
                    <Ionicons
                      name={showEmployeePopup ? 'chevron-up' : 'chevron-down'}
                      size={Math.min(16, screenWidth * 0.04)}
                      color="#374151"
                    />
                  </TouchableOpacity>
                ) : (
                  // --- Regular TouchableOpacity for Other Options ---
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: Math.min(12, screenHeight * 0.015),
                      paddingHorizontal: Math.min(16, screenWidth * 0.04),
                      backgroundColor:
                        selectedFilters.assignedTo === assignedTo
                          ? '#F3F4F6'
                          : 'transparent',
                      borderRadius: Math.min(8, screenWidth * 0.02),
                      marginBottom: Math.min(8, screenHeight * 0.01),
                      opacity: (userRole === 'Owner' && assignedTo === 'assigned-to-me') ? 0.5 : 1,
                    }}
                    onPress={() => {
                      // Don't allow assigned to selection when closed tasks is selected
                      if (selectedFilters.status === 'closed') return;
                      
                      // Don't allow "assigned-to-me" selection for Owner role
                      if (userRole === 'Owner' && assignedTo === 'assigned-to-me') return;
                      
                      if (assignedTo === 'assigned-to-me') {
                        console.log('assignedTo = me');
                        setSelectedFilters((prev) => ({ ...prev, assignedTo }));
                      } else if (assignedTo === 'unassigned') {
                        console.log('unassigned = true');
                        setSelectedFilters((prev) => ({ ...prev, assignedTo }));
                      } else {
                        setSelectedFilters((prev) => ({ ...prev, assignedTo }));
                      }
                    }}
                  >
                    <View
                      style={{
                        width: Math.min(20, screenWidth * 0.05),
                        height: Math.min(20, screenWidth * 0.05),
                        borderRadius: Math.min(10, screenWidth * 0.025),
                        borderWidth: 2,
                        borderColor:
                          selectedFilters.assignedTo === assignedTo
                            ? '#000'
                            : '#D1D5DB',
                        backgroundColor:
                          selectedFilters.assignedTo === assignedTo
                            ? '#000'
                            : 'transparent',
                        marginRight: Math.min(12, screenWidth * 0.03),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selectedFilters.assignedTo === assignedTo && (
                        <Ionicons
                          name="checkmark"
                          size={Math.min(12, screenWidth * 0.03)}
                          color="white"
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: Math.min(15, screenWidth * 0.038),
                        color: '#374151',
                        textTransform: 'capitalize',
                        flex: 1,
                      }}
                    >
                      {assignedTo === 'all'
                        ? 'All Tasks'
                        : assignedTo === 'assigned-to-me'
                          ? 'Assigned to Me'
                          : 'Unassigned'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Created At Filter */}
          <View style={{ 
            marginBottom: Math.min(24, screenHeight * 0.03),
            opacity: selectedFilters.status === 'closed' ? 0.5 : 1
          }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: selectedFilters.status === 'closed' ? '#9CA3AF' : '#374151',
                marginBottom: Math.min(12, screenHeight * 0.015),
              }}
            >
              Date
            </Text>
            {['created-at', 'start-date', 'due-date'].map((createdAt) => (
              <TouchableOpacity
                key={createdAt}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Math.min(12, screenHeight * 0.015),
                  paddingHorizontal: Math.min(16, screenWidth * 0.04),
                  backgroundColor:
                    selectedFilters.createdAt === createdAt
                      ? '#F3F4F6'
                      : 'transparent',
                  borderRadius: Math.min(8, screenWidth * 0.02),
                  marginBottom: Math.min(8, screenHeight * 0.01),
                }}
                onPress={() => {
                  // Don't allow date selection when closed tasks is selected
                  if (selectedFilters.status === 'closed') return;
                  
                  if (createdAt === 'created-at') {
                    console.log('createdAt');
                  } else if (createdAt === 'start-date') {
                    console.log('startTime');
                  } else if (createdAt === 'due-date') {
                    console.log('endTime');
                  }
                  setSelectedFilters((prev) => ({ ...prev, createdAt }));
                }}
              >
                <View
                  style={{
                    width: Math.min(20, screenWidth * 0.05),
                    height: Math.min(20, screenWidth * 0.05),
                    borderRadius: Math.min(10, screenWidth * 0.025),
                    borderWidth: 2,
                    borderColor:
                      selectedFilters.createdAt === createdAt
                        ? '#000'
                        : '#D1D5DB',
                    backgroundColor:
                      selectedFilters.createdAt === createdAt
                        ? '#000'
                        : 'transparent',
                    marginRight: Math.min(12, screenWidth * 0.03),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedFilters.createdAt === createdAt && (
                    <Ionicons
                      name="checkmark"
                      size={Math.min(12, screenWidth * 0.03)}
                      color="white"
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: '#374151',
                    textTransform: 'capitalize',
                  }}
                >
                  {createdAt === 'created-at'
                    ? 'Created At'
                    : createdAt === 'start-date'
                      ? 'Start Date'
                      : 'Due Date'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Task Status Filter */}
          <View style={{ marginBottom: Math.min(24, screenHeight * 0.03) }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: '#374151',
                marginBottom: Math.min(12, screenHeight * 0.015),
              }}
            >
              Task Status
            </Text>
            {['closed'].map((status) => (
              <TouchableOpacity
                key={status}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Math.min(12, screenHeight * 0.015),
                  paddingHorizontal: Math.min(16, screenWidth * 0.04),
                  backgroundColor:
                    selectedFilters.status === status
                      ? '#F3F4F6'
                      : 'transparent',
                  borderRadius: Math.min(8, screenWidth * 0.02),
                  marginBottom: Math.min(8, screenHeight * 0.01),
                }}
                onPress={() => {
                  // Toggle the status: if already selected, deselect it (set to null)
                  const newStatus = selectedFilters.status === status ? null : status;
                  
                  if (newStatus === 'closed') {
                    // If selecting closed tasks, clear date and assigned to filters
                    setSelectedFilters((prev) => ({ 
                      ...prev, 
                      status: newStatus,
                      createdAt: null, // Reset to no selection
                      assignedTo: null, // Reset to no selection
                      email: null, // Clear employee email
                      selectedEmployeeId: null,
                      selectedEmployeeName: null
                    }));
                    // Also clear the selected employee state
                    setSelectedEmployee(null);
                    setShowEmployeePopup(false);
                  } else {
                    // If deselecting closed tasks, just update status
                    setSelectedFilters((prev) => ({ ...prev, status: newStatus }));
                  }
                }}
              >
                <View
                  style={{
                    width: Math.min(20, screenWidth * 0.05),
                    height: Math.min(20, screenWidth * 0.05),
                    borderRadius: Math.min(10, screenWidth * 0.025),
                    borderWidth: 2,
                    borderColor:
                      selectedFilters.status === status
                        ? '#000'
                        : '#D1D5DB',
                    backgroundColor:
                      selectedFilters.status === status
                        ? '#000'
                        : 'transparent',
                    marginRight: Math.min(12, screenWidth * 0.03),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedFilters.status === status && (
                    <Ionicons
                      name="checkmark"
                      size={Math.min(12, screenWidth * 0.03)}
                      color="white"
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: '#374151',
                    textTransform: 'capitalize',
                  }}
                >
                  Closed Tasks
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>

        {/* Employee Popup Menu Overlay */}
        {showEmployeePopup && (
            <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: keyboardVisible ? screenHeight * 0.2 : screenHeight * 0.35, // Shift popup downward more
          }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: Math.min(12, screenWidth * 0.03),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: Math.min(4, screenHeight * 0.005) },
              shadowOpacity: 0.15,
              shadowRadius: Math.min(8, screenWidth * 0.02),
              elevation: 8,
              width: Math.min(screenWidth * 0.85, 400),
              maxHeight: Math.min(screenHeight * 0.5, 350),
              overflow: 'hidden',
              marginHorizontal: Math.min(20, screenWidth * 0.05),
            }}>
              {/* Popup Header */}
              <View style={{
                paddingHorizontal: Math.min(16, screenWidth * 0.04),
                paddingVertical: Math.min(12, screenHeight * 0.015),
                backgroundColor: '#F8FAFC',
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Text style={{
                  fontSize: Math.min(14, screenWidth * 0.035),
                  fontWeight: '600',
                  color: '#1E293B'
                }}>
                  Select Employee
                </Text>
                <TouchableOpacity onPress={() => setShowEmployeePopup(false)}>
                  <Ionicons name="close" size={Math.min(20, screenWidth * 0.05)} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={{
                paddingHorizontal: Math.min(16, screenWidth * 0.04),
                paddingVertical: Math.min(12, screenHeight * 0.015),
                backgroundColor: 'white'
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F1F5F9',
                  borderRadius: Math.min(8, screenWidth * 0.02),
                  paddingHorizontal: Math.min(12, screenWidth * 0.03),
                  paddingVertical: Math.min(8, screenHeight * 0.01),
                  borderWidth: 1,
                  borderColor: '#E2E8F0'
                }}>
                  <Ionicons name="search" size={Math.min(16, screenWidth * 0.04)} color="#64748B" style={{ marginRight: Math.min(8, screenWidth * 0.02) }} />
                <TextInput
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    flex: 1,
                      fontSize: Math.min(14, screenWidth * 0.035),
                      color: '#1E293B',
                      fontWeight: '500'
                  }}
                    placeholderTextColor="#94A3B8"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: Math.min(2, screenWidth * 0.005) }}>
                      <Ionicons name="close-circle" size={Math.min(16, screenWidth * 0.04)} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

              <ScrollView style={{ maxHeight: Math.min(200, screenHeight * 0.25) }} showsVerticalScrollIndicator={false}>
              {loadingEmployees ? (
                  <View style={{ paddingVertical: Math.min(20, screenHeight * 0.025), alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={{ color: '#64748B', marginTop: Math.min(8, screenHeight * 0.01), fontSize: Math.min(14, screenWidth * 0.035), fontWeight: '500' }}>Loading employees...</Text>
                </View>
              ) : filteredEmployees.length === 0 ? (
                  <View style={{ paddingVertical: Math.min(20, screenHeight * 0.025), alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={Math.min(24, screenWidth * 0.06)} color="#94A3B8" />
                    <Text style={{ color: '#64748B', fontSize: Math.min(14, screenWidth * 0.035), fontWeight: '500', marginTop: Math.min(8, screenHeight * 0.01), textAlign: 'center' }}>
                    {searchQuery ? 'No employees match your search' : 'No employees found'}
                  </Text>
                </View>
              ) : (
                filteredEmployees.map((employee, index) => (
                  <TouchableOpacity
                    key={employee.id || index}
                    onPress={() => handleEmployeeSelect(employee)}
                    style={{
                        paddingVertical: Math.min(10, screenHeight * 0.012),
                        paddingHorizontal: Math.min(16, screenWidth * 0.04),
                      borderBottomWidth: index < filteredEmployees.length - 1 ? 1 : 0,
                        borderBottomColor: '#F1F5F9',
                        backgroundColor: selectedEmployee?.id === employee.id ? '#EFF6FF' : 'transparent',
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}
                    >
                      <View style={{
                        width: Math.min(32, screenWidth * 0.08),
                        height: Math.min(32, screenWidth * 0.08),
                        borderRadius: Math.min(16, screenWidth * 0.04),
                        backgroundColor: selectedEmployee?.id === employee.id ? '#3B82F6' : '#DBEAFE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: Math.min(12, screenWidth * 0.03)
                      }}>
                        <Text style={{
                          fontSize: Math.min(14, screenWidth * 0.035),
                          fontWeight: '700',
                          color: selectedEmployee?.id === employee.id ? 'white' : '#1D4ED8'
                        }}>
                          {employee.first_name?.charAt(0)?.toUpperCase() || employee.email?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: Math.min(14, screenWidth * 0.035),
                          fontWeight: '600',
                          color: selectedEmployee?.id === employee.id ? '#1E40AF' : '#1E293B',
                          marginBottom: Math.min(2, screenHeight * 0.002)
                        }}>
                          {employee.first_name && employee.last_name
                            ? `${employee.first_name} ${employee.last_name}`
                            : employee.email || 'Unknown Employee'
                          }
                        </Text>
                        {employee.email && employee.first_name && (
                          <Text style={{
                            fontSize: Math.min(12, screenWidth * 0.03),
                            color: selectedEmployee?.id === employee.id ? '#3B82F6' : '#64748B',
                            fontWeight: '500'
                          }}>{employee.email}</Text>
                        )}
                      </View>
                      {selectedEmployee?.id === employee.id && (
                        <Ionicons name="checkmark-circle" size={Math.min(18, screenWidth * 0.045)} color="#3B82F6" />
                      )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
          </View>
        )}

        {/* Footer Actions */}
        <View
          style={{
            padding: Math.min(20, screenWidth * 0.05),
            backgroundColor: 'white',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: Math.min(12, screenWidth * 0.03),
          }}
        >
          {/* Clear Filters Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#F3F4F6',
              paddingVertical: Math.min(12, screenHeight * 0.015),
              paddingHorizontal: Math.min(24, screenWidth * 0.06),
              borderRadius: Math.min(8, screenWidth * 0.02),
              alignItems: 'center',
              flex: 1,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
            onPress={handleClearFilters}
          >
            <Text
              style={{
                color: '#374151',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}
            >
              Clear Filters
            </Text>
          </TouchableOpacity>

          {/* Apply Filters Button */}
          <TouchableOpacity
            style={{
              backgroundColor: isApplyingFilters ? '#666' : '#000',
              paddingVertical: Math.min(12, screenHeight * 0.015),
              paddingHorizontal: Math.min(24, screenWidth * 0.06),
              borderRadius: Math.min(8, screenWidth * 0.02),
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              flex: 1,
            }}
            onPress={handleApplyFilters}
            disabled={isApplyingFilters}
          >
            {isApplyingFilters && (
              <ActivityIndicator
                size="small"
                color="white"
                style={{ marginRight: Math.min(8, screenWidth * 0.02) }}
              />
            )}
            <Text
              style={{
                color: 'white',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}
            >
              {isApplyingFilters ? 'Applying...' : 'Apply Filters'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default FilterModal;
