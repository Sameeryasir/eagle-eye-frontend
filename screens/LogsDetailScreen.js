import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  TouchableWithoutFeedback,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Sidebar from "../components/Sidebar";
import HomeBottomNav from "../components/HomeBottomNav";
import UpdateLogModal from "../components/UpdateLogModal";
import DeleteLogModal from "../components/DeleteLogModal";
import { getUserRole } from "../services/utils/userRole";
import { deleteLogById } from "../services/log/deleteLogById";
import { getLogById } from "../services/log/getLogById";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';

function LogsDetailScreen({ navigation, route }) {
  const { logId } = route.params || {};
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Debug: Log the received logId
  console.log("LogsDetailScreen - Received logId:", logId);
  console.log("LogsDetailScreen - logId type:", typeof logId);
  console.log("LogsDetailScreen - logId is valid:", logId && logId !== null && logId !== undefined);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  // Responsive spacing calculations
  const isLargeScreen = screenHeight > 800;
  const isMediumScreen = screenHeight > 600 && screenHeight <= 800;
  const isSmallScreen = screenHeight <= 600;
  const isTablet = screenWidth > 768; // Tablet detection

  const topSpacing = isLargeScreen ? 20 : isMediumScreen ? 16 : 12;
  const bottomSpacing = isLargeScreen ? 32 : isMediumScreen ? 24 : 16;
  const cardSpacing = isLargeScreen ? 24 : isMediumScreen ? 20 : 16;
  const horizontalMargin = isTablet ? 48 : isLargeScreen ? 28 : isMediumScreen ? 24 : 20;
  const cardPadding = isTablet ? 32 : isLargeScreen ? 28 : isMediumScreen ? 24 : 20;
  const imageHeight = isTablet ? 300 : isLargeScreen ? 250 : isMediumScreen ? 220 : 180;
  const maxWidth = isTablet ? 600 : '100%'; // Max width for tablet layout

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const role = await getUserRole();
        setUserRole(role);
      } catch (error) {
        console.error("Error loading user role:", error);
      }
    };
    loadUserRole();
  }, []);

  useEffect(() => {
    const loadLogData = async () => {
      if (!logId) {
        setError("No log ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log("LogsDetailScreen - Fetching log with ID:", logId);
        const logData = await getLogById(logId);

        console.log("LogsDetailScreen - Received log data:", logData);
        setLog(logData);
      } catch (err) {
        console.error("LogsDetailScreen - Error fetching log:", err);
        setError(err.message || "Failed to load log data");
      } finally {
        setLoading(false);
      }
    };

    loadLogData();
  }, [logId]);

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      const dateStr = date.toLocaleDateString();
      return dateStr;
    } catch (error) {
      console.error("Error formatting date:", error, "Date string:", dateString);
      return "Invalid Date";
    }
  };

  const generateLogTitleParts = () => {
    if (!log) return { firstLine: "Daily Log", secondLine: "" };

    try {
      const date = new Date(log.createdAt);
      const employeeName = log.user ? 
        `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() || 
        log.user.email || 
        'Unknown Employee' : 
        'Unknown Employee';

      // Format date as "Month Day, Year" (e.g., "December 15, 2024")
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      let projectName = '';
      if (log.tasks && log.tasks.length > 0) {
        // Get unique project names from tasks
        const projectNames = log.tasks
          .filter(task => task.project && task.project.name)
          .map(task => task.project.name);
        
        // Remove duplicates and join with comma if multiple projects
        const uniqueProjects = [...new Set(projectNames)];
        
        if (uniqueProjects.length > 0) {
          projectName = uniqueProjects.length === 1 
            ? uniqueProjects[0] 
            : `${uniqueProjects.slice(0, 2).join(', ')}${uniqueProjects.length > 2 ? ' +' + (uniqueProjects.length - 2) + ' more' : ''}`;
        }
      }

      // Build two-line title: Date-Project on first line, Employee name on second line
      const firstLine = projectName ? `${formattedDate} - ${projectName}` : formattedDate;
      const secondLine = employeeName;

      return { firstLine, secondLine };
    } catch (error) {
      console.error("Error generating log title:", error);
      return { firstLine: "Daily Log", secondLine: "" };
    }
  };

  const handleUpdate = () => {
    // Show the update modal with the current log data
    console.log("LogsDetailScreen - handleUpdate called with log:", log);
    console.log("LogsDetailScreen - log.note:", log?.note);
    console.log("LogsDetailScreen - log.description:", log?.description);
    console.log("LogsDetailScreen - log.images:", log?.images);
    console.log("LogsDetailScreen - log.createdAt:", log?.createdAt);
    console.log("LogsDetailScreen - log.tasks:", log?.tasks);
    console.log("LogsDetailScreen - log.user:", log?.user);
    setUpdateModalVisible(true);
  };

  const handleUpdateModalClose = () => {
    setUpdateModalVisible(false);
  };

  const handleUpdateSuccess = () => {
    // Refresh the log data after successful update
    if (logId) {
      getLogById(logId).then(updatedLog => {
        setLog(updatedLog);
      }).catch(err => {
        console.error("Error refreshing log data:", err);
      });
    }
    setUpdateModalVisible(false);
  };

  // Add refresh functionality
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    if (!logId) {
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    try {
      console.log("LogsDetailScreen - Starting refresh for log ID:", logId);

      // Call getLogById to refresh the log data
      const refreshedLog = await getLogById(logId);
      console.log("LogsDetailScreen - Log refreshed successfully");

      setLog(refreshedLog);
      setError(null);
    } catch (error) {
      console.error("LogsDetailScreen - Error refreshing log:", error);
      setError("Failed to refresh log data");
    } finally {
      setRefreshing(false);
    }
  }, [logId]);

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const handleDeleteModalClose = () => {
    setDeleteModalVisible(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      // Call the delete log API
      await deleteLogById(logId);

      Alert.alert(
        "Success",
        "Log deleted successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to previous screen
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting log:', error);

      let errorMessage = "Failed to delete log. Please try again.";
      if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        "Error",
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      setDeleteModalVisible(false);
    }
  };

  // Get actual uploaded images from log
  const logImages = log && log.images && log.images.length > 0
    ? log.images.map(img => ({ uri: img.imageUrl }))
    : []; // No fallback image

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === logImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const previousImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? logImages.length - 1 : prevIndex - 1
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

        <View className="flex-1 justify-center items-center">
          <Text className="text-[16px] text-[#666]">Loading log details...</Text>
        </View>

        {/* Show HomeBottomNav during loading */}
        <HomeBottomNav />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

        <View className="flex-1 justify-center items-center">
          <Text className="text-[16px] text-[#dc3545] mb-4">{error}</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: "#007AFF",
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}
          >
            <Text className="text-white text-[16px] font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>

        {/* Show HomeBottomNav during error */}
        <HomeBottomNav />
      </View>
    );
  }

  if (!log) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

        <View className="flex-1 justify-center items-center">
          <Text className="text-[16px] text-[#666]">Log not found</Text>
        </View>

        {/* Show HomeBottomNav when log not found */}
        <HomeBottomNav />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

      <ScrollView
        className="flex-1"
        style={{
          paddingBottom: bottomSpacing,
          paddingTop: topSpacing
        }}
        showsVerticalScrollIndicator={true}
        bounces={false}
        contentContainerStyle={{
          paddingBottom: isLargeScreen ? 120 : isMediumScreen ? 100 : 80,
          alignItems: isTablet ? 'center' : 'stretch'
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3155A1"]}
            tintColor="#3155A1"
          />
        }
      >
        {/* Auto-Generated Title Section */}
        <View style={{ marginHorizontal: horizontalMargin, marginBottom: cardSpacing }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: isLargeScreen ? 20 : 16,
            padding: cardPadding,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6'
          }}>
            <View className="flex-row items-start">
              <View className="w-12 h-12 rounded-xl bg-blue-100 items-center justify-center mr-4 mt-1">
                <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 leading-tight mb-1">
                  {generateLogTitleParts().firstLine}
                </Text>
                <Text className="text-base font-semibold text-gray-700 leading-tight">
                  {generateLogTitleParts().secondLine}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Log Title Card */}
        <View style={{ marginHorizontal: horizontalMargin, marginBottom: cardSpacing }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: isLargeScreen ? 20 : 16,
            padding: cardPadding,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6'
          }}>
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 rounded-xl bg-green-100 items-center justify-center mr-4">
                <Ionicons name="document-text" size={24} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-green-600 mb-1">DAILY LOG</Text>
              </View>

              <Menu rendererProps={{
                placement: 'bottom-end',
                anchorStyle: { marginRight: 0 },
                triggerStyle: { marginRight: 0 }
              }}>
                <MenuTrigger>
                  <View style={{ activeOpacity: 1 }}>
                    <Ionicons name="ellipsis-vertical" size={16} color="#374151" />
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
                  <MenuOption onSelect={handleUpdate} customStyles={{
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
                  <MenuOption onSelect={handleDelete} customStyles={{
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
            </View>

            {log && log.note && (
              <View className="pt-4 border-t border-gray-100">
                <Text className="text-sm font-bold text-gray-600 mb-2">NOTE</Text>
                <Text className="text-base text-gray-700 leading-relaxed">
                  {log.note}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Log Details Grid */}
        <View style={{ marginHorizontal: horizontalMargin, marginBottom: cardSpacing }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: isLargeScreen ? 20 : 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6',
            overflow: 'hidden'
          }}>
            {/* Created By Section */}
            {userRole !== 'Employee' && (
              <View style={{
                padding: cardPadding,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6'
              }}>
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-lg bg-blue-100 items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-600 mb-1">CREATED BY</Text>
                    <Text className="text-lg font-semibold text-gray-900">
                      {log && log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() || log.user.email : "Unknown"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Date Section */}
            <View style={{
              padding: cardPadding,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6'
            }}>
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-purple-100 items-center justify-center mr-3">
                  <Ionicons name="calendar" size={20} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-600 mb-1">DATE</Text>
                  <Text className="text-lg font-semibold text-gray-900">
                    {log && log.createdAt ? formatDateTime(log.createdAt) : "N/A"}
                  </Text>
                </View>
              </View>
            </View>

          </View>
        </View>

        {/* Related Tasks Section */}
        <View style={{ marginHorizontal: horizontalMargin, marginBottom: cardSpacing }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: isLargeScreen ? 20 : 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6',
            overflow: 'hidden'
          }}>
            {/* Section Header */}
            <View style={{
              padding: cardPadding,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6'
            }}>
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-indigo-100 items-center justify-center mr-3">
                  <Ionicons name="list" size={20} color="#6366F1" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-600 mb-1">RELATED TASKS</Text>
                  <Text className="text-lg font-semibold text-gray-900">
                    {log && log.tasks && log.tasks.length > 0 ? `${log.tasks.length} Task${log.tasks.length !== 1 ? 's' : ''}` : 'No Tasks'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actual Tasks from Log */}
            {log && log.tasks && log.tasks.length > 0 ? (
              log.tasks.map((task, index) => (
                <View key={task.id || index} style={{
                  padding: cardPadding,
                  borderBottomWidth: index < log.tasks.length - 1 ? 1 : 0,
                  borderBottomColor: '#f3f4f6'
                }}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center mb-2">
                        <View className="w-6 h-6 rounded-full bg-indigo-100 items-center justify-center mr-3">
                          <Text className="text-xs font-bold text-indigo-600">
                            {index + 1}
                          </Text>
                        </View>
                        <Text className="text-base font-semibold text-gray-900">
                          {task.title || "Untitled Task"}
                        </Text>
                      </View>

                      {task.priority && (
                        <View className="flex-row items-center ml-9">
                          <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor:
                              task.priority === 'high' ? '#EF4444' :
                                task.priority === 'medium' ? '#F59E0B' :
                                  task.priority === 'critical' ? '#DC2626' : '#10B981',
                            marginRight: 8
                          }} />

                          <Text className="text-sm text-gray-600">
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={{
                padding: cardPadding,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text className="text-sm text-gray-500 text-center">
                  No tasks associated with this log
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Attachments Section */}
        <View style={{ marginHorizontal: horizontalMargin, marginBottom: cardSpacing }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: isLargeScreen ? 20 : 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6',
            overflow: 'hidden'
          }}>
            {/* Section Header */}
            <View style={{
              padding: cardPadding,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6'
            }}>
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-orange-100 items-center justify-center mr-3">
                  <Ionicons name="attach" size={20} color="#F97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-600 mb-1">ATTACHMENTS</Text>
                  <Text className="text-lg font-semibold text-gray-900">
                    {log && logImages.length} {logImages.length === 1 ? 'File' : 'Files'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Attachment Item */}
            <View style={{
              padding: cardPadding
            }}>
              {logImages.length > 0 ? (
                <>
                  {/* Image Carousel */}
                  <View style={{
                    marginTop: 16,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: '#F3F4F6',
                    position: 'relative'
                  }}>
                    <Image
                      source={logImages[currentImageIndex]}
                      style={{
                        width: '100%',
                        height: imageHeight,
                      }}
                      contentFit="cover"
                    />

                    {/* Navigation Arrows */}
                    <TouchableOpacity
                      onPress={previousImage}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: [{ translateY: -20 }],
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={nextImage}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: [{ translateY: -20 }],
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="chevron-forward" size={24} color="white" />
                    </TouchableOpacity>

                    {/* Image Counter */}
                    <View style={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}>
                      <Text style={{
                        color: 'white',
                        fontSize: 12,
                        fontWeight: '600',
                      }}>
                        {currentImageIndex + 1} / {logImages.length}
                      </Text>
                    </View>
                  </View>
                  
                  {/* File Info */}
                  <View className="flex-row items-center justify-center" style={{ padding: 2, marginTop: 12 }}>
                    <View className="mr-3">
                      <Text className="text-sm text-gray-600">
                        2.4 MB • Added 2 hours ago
                      </Text>
                    </View>
                    <TouchableOpacity style={{ padding: 8 }}>
                      <Ionicons name="download-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                /* No Images Uploaded State */
                <View style={{
                  marginTop: 16,
                  paddingVertical: 40,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#F3F4F6',
                  borderStyle: 'dashed',
                }}>
                  <Ionicons 
                    name="image-outline" 
                    size={48} 
                    color="#9CA3AF" 
                    style={{ marginBottom: 12 }}
                  />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#6B7280',
                    marginBottom: 4,
                    textAlign: 'center',
                  }}>
                    No Images Uploaded
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#9CA3AF',
                    textAlign: 'center',
                    lineHeight: 20,
                  }}>
                    This log doesn't have any images attached
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: bottomSpacing }} />
      </ScrollView>

      {/* Sidebar */}
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      {/* Bottom Navigation */}
      <HomeBottomNav />

      {/* Update Log Modal */}
      <UpdateLogModal
        visible={updateModalVisible}
        onClose={handleUpdateModalClose}
        log={log}
        onUpdate={handleUpdateSuccess}
      />

      {/* Delete Log Modal */}
      <DeleteLogModal
        visible={deleteModalVisible}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteConfirm}
        logTitle={log?.note || "this log"}
      />
    </View>
  );
}

export default LogsDetailScreen;
