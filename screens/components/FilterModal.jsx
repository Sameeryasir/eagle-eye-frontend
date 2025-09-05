import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TextInput,
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
  userRole,
  projectId,
}) => {
  // --- Loading State for Apply Filters Button ---
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  
  // --- State for Dropdown Management ---
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Clear Selected Employee When Modal Opens ---
  // Business Rule: Reset employee selection when modal becomes visible to avoid confusion
  useEffect(() => {
    if (visible) {
      setSelectedEmployee(null);
      setSearchQuery('');
      setShowEmployeeDropdown(false);
    }
  }, [visible]);
  


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
    setShowEmployeeDropdown(false);
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
    setSelectedFilters({
      createdAt: 'created-at',
      assignedTo: 'all',
      upcoming: 'all',
      status: 'all', // Default to all tasks (not closed)
      email: null, // Clear employee email
    });
    // --- Reset Dropdown State ---
    setShowEmployeeDropdown(false);
    setSelectedEmployee(null);
    setSearchQuery('');
  };



  const handleApplyFilters = async () => {
    console.log('Applying filters:', selectedFilters);
    
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
          filtersWithClosedTask.createdAt = 'created-at'; // Default to created-at
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
      presentationStyle="pageSheet"
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
        >
          {/* Created At Filter */}
          <View style={{ marginBottom: Math.min(24, screenHeight * 0.03) }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: '#374151',
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

          {/* Assigned To Filter */}
          <View style={{ marginBottom: Math.min(24, screenHeight * 0.03) }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: '#374151',
                marginBottom: Math.min(12, screenHeight * 0.015),
              }}
            >
              Assigned To
            </Text>
            {(userRole === 'Owner' || userRole === 'Manager'
              ? ['all', 'assigned-to-me', 'assigned-to-others', 'unassigned']
              : ['all', 'assigned-to-me', 'unassigned']
            ).map((assignedTo) => (
              <View key={assignedTo}>
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
                    if (assignedTo === 'assigned-to-me') {
                      console.log('assignedTo = me');
                      setSelectedFilters((prev) => ({ ...prev, assignedTo }));
                      setShowEmployeeDropdown(false);
                    } else if (assignedTo === 'assigned-to-others') {
                      console.log('🎯 assignedTo = others - showing dropdown');
                      setSelectedFilters((prev) => ({ ...prev, assignedTo }));
                      // --- Toggle Dropdown and Fetch Employees ---
                      if (employees.length === 0) {
                        await fetchEmployees();
                      }
                      setShowEmployeeDropdown(!showEmployeeDropdown);
                    } else if (assignedTo === 'unassigned') {
                      console.log('unassigned = true');
                      setSelectedFilters((prev) => ({ ...prev, assignedTo }));
                      setShowEmployeeDropdown(false);
                    } else {
                      setSelectedFilters((prev) => ({ ...prev, assignedTo }));
                      setShowEmployeeDropdown(false);
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
                        : assignedTo === 'assigned-to-others'
                          ? selectedEmployee 
                            ? `Assigned to ${selectedEmployee.first_name && selectedEmployee.last_name
                                ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                                : selectedEmployee.email || 'Unknown Employee'}`
                            : 'Assigned to Others'
                          : 'Unassigned'}
                  </Text>
                  
                  {/* --- Dropdown Arrow for Assigned to Others --- */}
                  {assignedTo === 'assigned-to-others' && (
                    <Ionicons
                      name={showEmployeeDropdown ? 'chevron-up' : 'chevron-down'}
                      size={Math.min(16, screenWidth * 0.04)}
                      color="#374151"
                    />
                  )}
                </TouchableOpacity>


              </View>
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
                  setSelectedFilters((prev) => ({ ...prev, status }));
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

        {/* Employee Dropdown Overlay - Positioned over content */}
        {showEmployeeDropdown && (
          <View style={{
            position: 'absolute',
            top: 480 + (screenHeight * 0.02), // Position slightly lower (2% more down)
            left: Math.min(40, screenWidth * 0.1), // Smaller width with more margins
            right: Math.min(40, screenWidth * 0.1),
            backgroundColor: 'white',
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
            zIndex: 1000,
            maxHeight: 250,
            borderWidth: 1,
            borderColor: '#E5E7EB'
          }}>
            {/* Search Bar */}
            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB'
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8
              }}>
                <Ionicons name="search" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    flex: 1,
                    fontSize: 12, // Reduced from 14 to 12
                    color: '#1F2937'
                  }}
                  placeholderTextColor="#9CA3AF"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={{ maxHeight: 160 }}>
              {loadingEmployees ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#374151" />
                  <Text style={{ color: '#6B7280', marginTop: 8, fontSize: 12 }}>Loading employees...</Text>
                </View>
              ) : filteredEmployees.length === 0 ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>
                    {searchQuery ? 'No employees match your search' : 'No employees found'}
                  </Text>
                </View>
              ) : (
                filteredEmployees.map((employee, index) => (
                  <TouchableOpacity
                    key={employee.id || index}
                    onPress={() => handleEmployeeSelect(employee)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderBottomWidth: index < filteredEmployees.length - 1 ? 1 : 0,
                      borderBottomColor: '#F3F4F6',
                      backgroundColor: selectedEmployee?.id === employee.id ? '#F3F4F6' : 'transparent'
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#DBEAFE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        <Text style={{
                          fontSize: 12, // Reduced from 14 to 12
                          fontWeight: '600',
                          color: '#1D4ED8'
                        }}>
                          {employee.first_name?.charAt(0)?.toUpperCase() || employee.email?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 14, // Reduced from 16 to 14
                          fontWeight: '500',
                          color: '#111827'
                        }}>
                          {employee.first_name && employee.last_name
                            ? `${employee.first_name} ${employee.last_name}`
                            : employee.email || 'Unknown Employee'
                          }
                        </Text>
                        {employee.email && employee.first_name && (
                          <Text style={{
                            fontSize: 12, // Reduced from 14 to 12
                            color: '#6B7280'
                          }}>{employee.email}</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Footer Actions */}
        <View
          style={{
            padding: Math.min(20, screenWidth * 0.05),
            backgroundColor: 'white',
    
            alignItems: 'center', // Center the button
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: isApplyingFilters ? '#666' : '#000',
              paddingVertical: Math.min(12, screenHeight * 0.015),
              paddingHorizontal: Math.min(40, screenWidth * 0.1), // Add horizontal padding for better button size
              borderRadius: Math.min(8, screenWidth * 0.02),
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
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
