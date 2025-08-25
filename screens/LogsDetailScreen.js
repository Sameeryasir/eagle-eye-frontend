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
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Sidebar from "./components/Sidebar";
import CustomBottomNav from "./components/CustomBottomNav";
import { getUserRole } from "../services/utils/userRole";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';

function LogsDetailScreen({ navigation, route }) {
  const { log } = route.params || {};
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} ${timeStr}`;
  };

  const handleUpdate = () => {
    // TODO: Implement log update functionality
    Alert.alert(
      "Update Log",
      "Log update functionality will be implemented soon.",
      [{ text: "OK" }]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Log",
      "Are you sure you want to delete this log?",
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
              // TODO: Implement log deletion API call
              // await deleteLogById(log.id);
              Alert.alert(
                "Success",
                "Log deleted successfully!",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      navigation.navigate('ViewAllLogScreen');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error deleting log:', error);
              Alert.alert(
                "Error",
                "Failed to delete log. Please try again.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  };

  // Sample images for carousel
  const logImages = [
    require('../assets/robot.png'),
    require('../assets/aimaker.png'),
    require('../assets/person.jpg'),
    require('../assets/tick.png')
  ];

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

  if (!log) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-[16px] text-[#666]">Log not found</Text>
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
      >
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
              
              {userRole !== "Admin" && userRole !== "Owner" && (
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
              )}
            </View>
            
            {log.description && (
              <View className="pt-4 border-t border-gray-100">
                <Text className="text-sm font-bold text-gray-600 mb-2">DESCRIPTION</Text>
                <Text className="text-base text-gray-700 leading-relaxed">
                  {log.description}
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
                      {log.createdBy || "Unknown"}
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
                    {log.date ? formatDateTime(log.date) : "N/A"}
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
                   <Text className="text-lg font-semibold text-gray-900">3 Tasks</Text>
                 </View>
               </View>
             </View>

             {/* Dummy Tasks */}
             {[
               {
                 id: 1,
                 title: "Complete Project Documentation",
                 status: "In Progress",
                 priority: "High",
                 assignedTo: "John Doe",
                 dueDate: "2024-01-15"
               },
               {
                 id: 2,
                 title: "Review Code Changes",
                 status: "Pending",
                 priority: "Medium",
                 assignedTo: "Jane Smith",
                 dueDate: "2024-01-20"
               },
               {
                 id: 3,
                 title: "Update User Interface",
                 status: "Completed",
                 priority: "Low",
                 assignedTo: "Mike Johnson",
                 dueDate: "2024-01-10"
               }
             ].map((task, index) => (
               <View key={task.id} style={{ 
                 padding: cardPadding, 
                 borderBottomWidth: index < 2 ? 1 : 0, 
                 borderBottomColor: '#f3f4f6' 
               }}>
                 <View className="flex-row items-start justify-between mb-2">
                   <View className="flex-1 mr-3">
                     <View className="flex-row items-center mb-1">
                       <View className="w-6 h-6 rounded-full bg-indigo-100 items-center justify-center mr-3">
                         <Text className="text-xs font-bold text-indigo-600">
                           {index + 1}
                         </Text>
                       </View>
                       <Text className="text-base font-semibold text-gray-900">
                         {task.title}
                       </Text>
                     </View>
                     
                     <View className="flex-row items-center ml-9 mt-1">
                       <View style={{
                         width: 8,
                         height: 8,
                         borderRadius: 4,
                         backgroundColor: 
                           task.priority === 'High' ? '#EF4444' :
                           task.priority === 'Medium' ? '#F59E0B' : '#10B981',
                         marginRight: 8
                       }} />
                       
                       <Text className="text-sm text-gray-600">
                         {task.priority} Priority
                       </Text>
                     </View>
                   </View>
                 </View>
               </View>
             ))}
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
                      {logImages.length} {logImages.length === 1 ? 'File' : 'Files'}
                    </Text>
                  </View>
               </View>
             </View>

                           {/* Attachment Item */}
              <View style={{ 
                padding: cardPadding
              }}>
               
               
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
                      resizeMode: 'cover'
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
             </View>
                           <View className="flex-row items-center justify-center" style={{ padding: 2 }}>
                
                 <View className="mr-3">
              
                   <Text className="text-sm text-gray-600">
                     2.4 MB • Added 2 hours ago
                   </Text>
                 </View>
                 <TouchableOpacity style={{ padding: 8 }}>
                   <Ionicons name="download-outline" size={20} color="#6B7280" />
                 </TouchableOpacity>
               </View>
           </View>
         </View>



        {/* Bottom Spacing */}
        <View style={{ height: bottomSpacing }} />
      </ScrollView>

      {/* Sidebar */}
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} navigation={navigation} />
      
      {/* Bottom Navigation */}
      <CustomBottomNav navigation={navigation} />
    </View>
  );
}

export default LogsDetailScreen;
