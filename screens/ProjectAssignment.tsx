// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeBottomNav from '../components/HomeBottomNav';
import { getMyProjects } from '../services/projects/getProjectsByLoginUserId';
import { assignProjectToEmployees } from '../services/projects/assignProject';
import { getUserById } from '../services/user/getUserById';
import { projectAssignement } from '../services/inAppNotification/projectAssignement';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Loader from '../services/utils/loader';

function ProjectAssignment({ navigation, route }) {
  const { employee, employeeId } = route.params || {};
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [fetchedEmployee, setFetchedEmployee] = useState(null);
  const [fetchedAssignedProjects, setFetchedAssignedProjects] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Helper functions
  const getCurrentEmployee = () => employee || fetchedEmployee;
  const getCurrentAssignedProjects = () => fetchedAssignedProjects;

  // Load data on mount
  useEffect(() => {
    if (employeeId) loadEmployeeDetails();
    loadProjects();
  }, [employeeId]);

  // Pull to refresh
  const onRefresh = React.useCallback(async () => {
    if (!employeeId) return;
    setRefreshing(true);
    try {
      await loadEmployeeDetails();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [employeeId]);

  const getFilteredProjects = () => {
    if (searchQuery.trim() === '') {
      return projects;
    } else {
      return projects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  };

  const loadEmployeeDetails = async () => {
    try {
      // Get employee data with assigned projects directly from getUserById API
      const employeeData = await getUserById(employeeId);
      setFetchedEmployee(employeeData);
      
      // Extract assigned projects directly from the API response
      if (employeeData?.assignedProjects) {
        setFetchedAssignedProjects(employeeData.assignedProjects);
      } else {
        setFetchedAssignedProjects([]);
      }
    } catch (err) {
      console.error('Error loading employee:', err);
      setFetchedEmployee(null);
      setFetchedAssignedProjects([]);
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: 'Failed to load employee details.',
      });
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await getMyProjects();
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      console.error('Error loading projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Modal functions
  const openProjectModal = () => {
    setSearchQuery('');
    setSelectedProjects([]);
    setIsModalVisible(true);
  };

  const closeProjectModal = () => {
    setIsModalVisible(false);
    setSearchQuery('');
    setSelectedProjects([]);
  };

  const toggleProjectSelection = (project) => {
    setSelectedProjects(prev => 
      prev.some(p => p.id === project.id)
        ? prev.filter(p => p.id !== project.id)
        : [...prev, project]
    );
  };

  const assignSelectedProjects = async () => {
    if (selectedProjects.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No Projects Selected',
        text2: 'Please select at least one project to assign.',
      });
      return;
    }

    const currentEmployee = getCurrentEmployee();
    if (!currentEmployee?.id && !employeeId) {
      Toast.show({
        type: 'error',
        text1: 'Employee Error',
        text2: 'Employee information is missing.',
      });
      return;
    }

    try {
      setIsAssigning(true);
      
      const assignData = {
        projectIds: selectedProjects.map(project => project.id),
        employeeIds: [currentEmployee.id || employeeId]
      };
      
      await assignProjectToEmployees(assignData);

      try {
        // Get current user info for notification
        const currentUserId = await AsyncStorage.getItem('userId');
        const currentUserFirstName = await AsyncStorage.getItem('userFirstName');
        const currentUserLastName = await AsyncStorage.getItem('userLastName');
        const currentUserName = `${currentUserFirstName || ''} ${currentUserLastName || ''}`.trim() || 'Unknown User';

        // Send separate notification for each project
        for (const project of selectedProjects) {
          const apiNotificationData = {
            title: 'New Project Assigned',
            message: `You have been assigned to a new project: ${project.name}`,
            assignedToUserId: Number(currentEmployee.id || employeeId),
            projectIds: [Number(project.id)], // Single project ID in array
            priority: 'medium',
            projectName: project.name, // Single project name
            fromUserName: currentUserName
          };
          
          await projectAssignement(apiNotificationData);
        }
      } catch (apiError) {
        console.error('❌ Error sending API notification:', apiError);
        // Don't throw error - project was already assigned successfully
      }

      // Add newly assigned projects to local state
      setFetchedAssignedProjects(prev => [...prev, ...selectedProjects]);
      
      Toast.show({
        type: 'success',
        text1: 'Projects Assigned Successfully',
        text2: `${selectedProjects.length} project(s) assigned to ${currentEmployee.first_name} ${currentEmployee.last_name}.`,
      });

      closeProjectModal();

    } catch (error) {
      console.error('Assignment error:', error);
      
      if (error.response?.status === 403) {
        Toast.show({
          type: 'error',
          text1: 'Assignment Not Allowed',
          text2: 'The project is shared. You cannot assign shared projects.',
          visibilityTime: 4000,
          autoHide: true,
          topOffset: 80,
        });
      } else if (error.response?.status === 400) {
        setShowErrorDialog(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Assignment Failed',
          text2: error.message || 'Failed to assign projects. Please try again.',
        });
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const selectAllProjects = () => setSelectedProjects([...getFilteredProjects()]);
  const unselectAllProjects = () => setSelectedProjects([]);

  const ProjectModalItem = ({ item }) => {
    const isSelected = selectedProjects.some(p => p.id === item.id);
    
    return (
      <TouchableOpacity
        onPress={() => toggleProjectSelection(item)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: isSelected ? '#f8f9fa' : 'white',
          borderRadius: 8,
          marginBottom: 8,
          marginHorizontal: 20,
          borderWidth: 1,
          borderColor: '#e9ecef',
        }}
      >
        <Ionicons 
          name="folder" 
          size={16} 
          color={isSelected ? '#000000' : '#6c757d'} 
          style={{ marginRight: 12 }} 
        />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#1a1a1a',
          }}>
            {item.name}
          </Text>
        </View>
        {isSelected ? (
          <Ionicons name="checkmark-circle" size={20} color="#000000" />
        ) : (
          <View style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: '#e9ecef',
          }} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
        <Loader size="large" color="#000000" text="Loading details..." />
        <HomeBottomNav />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          !isModalVisible ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3155A1']} // Android - matches HomeScreen
              tintColor="#3155A1" // iOS - matches HomeScreen
            />
          ) : null
        }
      >
        {/* Header Section */}
        <View style={{
          backgroundColor: 'white',
          marginHorizontal: 20,
          marginTop: 20,
          borderRadius: 16,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#f8f9fa',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="person" size={24} color="#6c757d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#1a1a1a',
                marginBottom: 4,
              }}>
                {getCurrentEmployee() ? `${getCurrentEmployee().first_name} ${getCurrentEmployee().last_name}` : 'Unknown Employee'}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6c757d',
              }}>
                {getCurrentEmployee()?.email || 'No email provided'}
              </Text>
            </View>
          </View>
          
        
        </View>

        {/* Assigned Projects Section */}
        {getCurrentAssignedProjects() && getCurrentAssignedProjects().length > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={{
              backgroundColor: 'white',
              marginHorizontal: 20,
              borderRadius: 12,
              padding: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#f8f9fa',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}>
                  <Ionicons name="folder" size={20} color="#6c757d" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#1a1a1a',
                    marginBottom: 2,
                  }}>
                    Assigned Projects
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: '#6c757d',
                  }}>
                    Projects currently assigned
                  </Text>
                </View>
              </View>

              {/* Show Assigned Projects with FlatList */}
              <View style={{ marginTop: 8, maxHeight: 150 }}>
                <FlatList
                  data={getCurrentAssignedProjects()}
                  keyExtractor={(item, index) => String(item.id || index)}
                  renderItem={({ item }) => (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#f8f9fa',
                      borderRadius: 8,
                      marginBottom: 8,
                    }}>
                      <Ionicons name="folder" size={16} color="#6c757d" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#1a1a1a',
                        }}>
                          {item.name}
                        </Text>
                        {item.description && (
                          <Text style={{
                            fontSize: 12,
                            color: '#6c757d',
                            marginTop: 2,
                          }} numberOfLines={1}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                      <View style={{
                        backgroundColor: '#e9ecef',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          color: '#6c757d',
                          fontWeight: '500',
                        }}>
                          Assigned
                        </Text>
                      </View>
                    </View>
                  )}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                />
              </View>
            </View>
          </View>
        )}

        {/* Assign New Project Card */}
        <View style={{ marginTop: 20 }}>
          <View style={{
            backgroundColor: 'white',
            marginHorizontal: 20,
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#e3f2fd',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="add-circle" size={24} color="#000000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: '#1a1a1a',
                  marginBottom: 4,
                }}>
                  Assign New Project
                </Text>
                
              </View>
            </View>

            <TouchableOpacity
              onPress={openProjectModal}
              style={{
                backgroundColor: '#000000',
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Select Project to Assign
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <HomeBottomNav />

      {/* Project Selection Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={closeProjectModal}
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
            width: '100%',
            maxHeight: '50%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          }}>
            {/* Modal Header */}
            <View style={{
              backgroundColor: 'white',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#e9ecef',
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1a1a1a',
                }}>
                  Select Project
                </Text>
                <TouchableOpacity onPress={closeProjectModal}>
                  <Ionicons name="close" size={24} color="#6c757d" />
                </TouchableOpacity>
              </View>
              
              {/* Select All / Unselect All Buttons */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <TouchableOpacity
                  onPress={selectAllProjects}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: '#000000',
                    borderRadius: 20,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    flex: 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark-circle" size={16} color="white" style={{ marginRight: 6 }} />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: 'white',
                    textAlign: 'center',
                  }}>
                    Select All
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={unselectAllProjects}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 20,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    flex: 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close-circle" size={16} color="#000000" style={{ marginRight: 6 }} />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#000000',
                    textAlign: 'center',
                  }}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Projects List with Search Bar */}
            <FlatList
              data={getFilteredProjects()}
              keyExtractor={(item, index) => String(item.id || index)}
              renderItem={ProjectModalItem}
              contentContainerStyle={{ paddingVertical: 16 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <View style={{
                  backgroundColor: 'white',
                  marginHorizontal: 20,
                  marginBottom: 16,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#e9ecef',
                }}>
                  <Ionicons
                    name="search"
                    size={18}
                    color="#6c757d"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: '#333',
                      paddingVertical: 4,
                    }}
                    placeholder="Search projects..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color="#6c757d"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 40,
                }}>
                  <Ionicons name="folder-outline" size={40} color="#ccc" />
                  <Text style={{
                    fontSize: 14,
                    color: '#666',
                    marginTop: 12,
                    textAlign: 'center',
                  }}>
                    {searchQuery ? 'No projects found matching your search' : 'No projects available'}
                  </Text>
                </View>
              )}
            />

            {/* Assign Button */}
            {selectedProjects.length > 0 && (
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderTopColor: '#e9ecef',
                backgroundColor: 'white',
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }}>
                <TouchableOpacity
                  onPress={assignSelectedProjects}
                  disabled={isAssigning}
                  style={{
                    backgroundColor: isAssigning ? '#666666' : '#000000',
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                >
                  {isAssigning && (
                    <ActivityIndicator 
                      size="small" 
                      color="white" 
                      style={{ marginRight: 8 }} 
                    />
                  )}
                  <Text style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                    {isAssigning 
                      ? 'Assigning...' 
                      : `Assign ${selectedProjects.length} Project${selectedProjects.length > 1 ? 's' : ''}`
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Error Dialog */}
      <Modal
        visible={showErrorDialog}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowErrorDialog(false)}
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
            width: '100%',
            maxWidth: 350,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          }}>
            {/* Dialog Header */}
            <View style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#e9ecef',
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#fff3cd',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="warning" size={24} color="#856404" />
                </View>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1a1a1a',
                }}>
                  Assignment Failed
                </Text>
              </View>
            </View>

            {/* Dialog Content */}
            <View style={{
              paddingHorizontal: 20,
              paddingVertical: 20,
            }}>
              <Text style={{
                fontSize: 16,
                color: '#666',
                textAlign: 'center',
                lineHeight: 22,
              }}>
                You cannot assign the user to the same project again.
              </Text>
            </View>

            {/* Dialog Button */}
            <View style={{
              paddingHorizontal: 20,
              paddingBottom: 20,
            }}>
              <TouchableOpacity
                onPress={() => setShowErrorDialog(false)}
                style={{
                  backgroundColor: '#000000',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default ProjectAssignment;
