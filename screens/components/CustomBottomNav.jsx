import React from "react";
import { View, TouchableOpacity, Dimensions, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getUserRole } from "../../services/utils/userRole";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get("window");

// --- Responsive calculations for small screens ---
const isSmallScreen = width < 375; // iPhone SE and smaller
const isVerySmallScreen = width < 360; // Very small Android devices
const iconSize = isVerySmallScreen ? 20 : isSmallScreen ? 22 : 24;
const navHeight = isVerySmallScreen ? 60 : isSmallScreen ? 65 : 70;
const fabSize = isVerySmallScreen ? 55 : isSmallScreen ? 60 : 65;

export default function CustomBottomNav({
  keyboardVisible = false,
  task = false,
  projectId = null,
  managerProjectId = null,
  project = false,
  onAddPress,
  handleFabPress,
  isLoading = false,
}) {
  const navigation = useNavigation();
  const route = useRoute(); // Get current route information
  const [activeTab, setActiveTab] = React.useState("home"); // Track active tab
  const [userRole, setUserRole] = React.useState(null); // Track user role
  const insets = useSafeAreaInsets(); // Get safe area insets

  // --- Load User Role (MCP Context 7) ---
  // Business Rule: Get user role to determine FAB visibility based on current screen
  React.useEffect(() => {
    const loadUserRole = async () => {
      try {
        const role = await getUserRole();
        setUserRole(role);
        console.log(`CustomBottomNav - User role loaded: ${role} on screen: ${route.name}`);
      } catch (error) {
        console.error("CustomBottomNav - Error loading user role:", error);
      }
    };
    
    loadUserRole();
  }, []);

  // --- Check if FAB should be hidden (MCP Context 7) ---
  // Business Rule: Hide FAB for Employee users on ViewAllTasksScreen, HomeScreen, CalenderScreen, CalenderDetailScreen, and WeekView
  // Business Rule: Hide FAB for Manager users on HomeScreen, CalenderScreen, CalenderDetailScreen, and WeekView (but show on ViewAllTasksScreen)
  // Hide FAB for Owner role on ViewAllLogScreen
  // Hide FAB for Owner, Manager, and Employee roles on PersonalScreen, ProjectAssignment, and LogsDetailScreen
  // Hide FAB for all users on TaskDetailsScreen
  // Hide FAB for Manager and Employee roles on CreateLogScreen
  // ✅ SHOW FAB for Owner role on CalenderScreen, CalenderDetailScreen, and WeekView (Manager and Employee cannot see FAB)
  // Hide FAB on calendar screens until userRole is loaded to prevent flashing during navigation
  const isCalendarScreen = route.name === "CalenderScreen" || route.name === "CalenderDetailScreen" || route.name === "WeekView";
  const shouldHideFAB = (
    userRole === "Employee" && (
      route.name === "ViewAllTasksScreen" || 
      route.name === "HomeScreen" || 
      isCalendarScreen
    )
  ) || (
    userRole === "Manager" && (
      route.name === "HomeScreen" || 
      isCalendarScreen
    )
  ) || (
    // Hide FAB for Owner, Manager, and Employee roles on ViewAllLogScreen
    (userRole === "Owner" ) && route.name === "ViewAllLogScreen"
  ) || (
    // Hide FAB for Owner, Manager, and Employee roles on PersonalScreen, ProjectAssignment, and LogsDetail
    (userRole === "Owner" || userRole === "Manager" || userRole === "Employee") && (route.name === "PersonalScreen" || route.name === "ProjectAssignment" || route.name === "LogsDetail")
  ) || (
    // Hide FAB for all users on TaskDetailsScreen
    route.name === "TaskDetails"
  ) || (
    // Hide FAB for Manager and Employee roles on CreateLogScreen
    (userRole === "Manager" || userRole === "Employee") && route.name === "CreatLog"
  ) || (
    // Hide FAB for Manager and Employee roles on CalenderScreen (✅ Owner can see FAB)
    (userRole === "Manager" || userRole === "Employee") && route.name === "CalenderScreen"
  ) || (
    // Hide FAB for Manager and Employee roles on CalenderDetailScreen (✅ Owner can see FAB)
    (userRole === "Manager" || userRole === "Employee") && route.name === "CalenderDetailScreen"
  ) || (
    // Hide FAB for Manager and Employee roles on WeekView (✅ Owner can see FAB)
    (userRole === "Manager" || userRole === "Employee") && route.name === "WeekView"
  ) || (
    // Hide FAB on calendar screens until userRole is loaded to prevent flashing
    isCalendarScreen && userRole === null
  );

  // --- Route Change Detection ---
  // Update active tab based on current screen name
  // This ensures the bottom navigation highlights the correct tab based on the current screen
  React.useEffect(() => {
    const getActiveTabFromRoute = (routeName) => {
      switch (routeName) {
        case "HomeScreen":
          return "home"; // Home icon highlighted for home/dashboard screens
        case "CalenderScreen":
        case "CalenderDetailScreen":
        case "WeekView":
          return "profile"; // Calendar icon highlighted for calendar screens
   

        default:
      }
    };

    // Set active tab based on current route
    const currentTab = getActiveTabFromRoute(route.name);
    setActiveTab(currentTab);
  }, [route.name]); // Re-run when route name changes

  const handleAddPress = async () => {
    if (onAddPress) {
      onAddPress();
    } else if (task) {
      const userRole = await getUserRole();
      const navigationParams =
        userRole === "Manager"
          ? { projectId: managerProjectId }
          : { projectId: projectId };
      navigation.navigate("CreateTask", navigationParams);
    } else if (project) {
      navigation.navigate("CreateProject");
    } else if (handleFabPress) {
      handleFabPress();
    } else {
      // Default behavior - check user role and navigate accordingly
      const userRole = await getUserRole();
      if (userRole === "Employee") {
        console.log("🚨 CustomBottomNav: Employee FAB pressed without project context!");
        console.log("🚨 This should not happen - Employee needs project ID to create logs");
        // Don't navigate without project ID - this will cause the undefined error
        // navigation.navigate("CreatLog");
      } else if (userRole === "Manager" || userRole === "Owner" || userRole === "Admin") {
        // For other roles, you can add default behavior here
        // For now, we'll just do nothing or you can navigate to a default screen
        console.log("FAB pressed for role:", userRole);
      }
    }
  };

  const navigateToHome = async () => {
    const userRole = await getUserRole();

    if (userRole === "Owner" || userRole === "Admin" || userRole === "Manager" || userRole === "Employee") {
      navigation.navigate("HomeScreen");
    } else {
      // For any other roles
      navigation.navigate("WidgetScreen");
    }
  };

  const navigateToChats = () => {
    // Navigate to  screen when chats icon is pressed
  };

  const navigateToNotifications = () => {
    // No navigation - just visual indicator
    // This icon only shows which screen is active, no tap functionality
  };

  const navigateToProfile = () => {
    // Navigate to calendar screen when calendar icon is pressed
    navigation.navigate("CalenderScreen");
  };
  // Hide the bottom navigation when keyboard is visible
  if (keyboardVisible) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
        backgroundColor: 'transparent',
        // Ensure consistent positioning regardless of app state
        marginBottom: 0,
        paddingBottom: insets.bottom,
        transform: [{ translateY: 20 }], // Shift the entire nav 20px downward
      }}
    >
      {/* Bottom Nav Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: shouldHideFAB ? 'space-around' : 'space-between',
          width: '90%',
          height: navHeight,
          backgroundColor: 'black',
          borderRadius: 35,
          paddingHorizontal: 15,
          paddingBottom: 5,
          marginBottom: 20, // Keep consistent margin from bottom
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 6,
          // Ensure consistent positioning
          position: 'relative',
        }}
      >
        <TouchableOpacity
          className="items-center justify-center relative"
          style={{ 
            width: shouldHideFAB 
              ? (width * 0.9 - 30) / 4  // 4 equal sections when FAB is hidden
              : (width * 0.9 - 30) / 5   // 5 sections when FAB is visible
          }}
          onPress={navigateToHome}
        >
          <Ionicons name="home-outline" size={iconSize} color="#fff" />
          {activeTab === "home" && (
            <View className="absolute bottom-[-6px] w-5 h-[3px] bg-white rounded-[2px]" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center justify-center relative"
          style={{ 
            width: shouldHideFAB 
              ? (width * 0.9 - 30) / 4  // 4 equal sections when FAB is hidden
              : (width * 0.9 - 30) / 5   // 5 sections when FAB is visible
          }}
          onPress={navigateToProfile}
        >
          {/* Calendar icon (fixed spelling + valid icon) */}
          <Ionicons name="calendar-outline" size={iconSize} color="#fff" />

          {activeTab === "profile" && (
            <View className="absolute bottom-[-6px] w-5 h-[3px] bg-white rounded-[2px]" />
          )}
        </TouchableOpacity>

        {/* FAB Spacer - Only show when FAB is visible (MCP Context 7) */}
        {/* Business Rule: This spacer reserves space for the FAB when it's visible */}
        {!shouldHideFAB && (
          <View style={{ width: 65 }} />
        )}

        <TouchableOpacity
          className="items-center justify-center relative"
          style={{ 
            width: shouldHideFAB 
              ? (width * 0.9 - 30) / 4  // 4 equal sections when FAB is hidden
              : (width * 0.9 - 30) / 5   // 5 sections when FAB is visible
          }}
          onPress={navigateToChats}
        >
          <Ionicons name="chatbubble-outline" size={iconSize} color="#fff" />
          {activeTab === "chats" && (
            <View className="absolute bottom-[-6px] w-5 h-[3px] bg-white rounded-[2px]" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center justify-center relative"
          style={{ 
            width: shouldHideFAB 
              ? (width * 0.9 - 30) / 4  // 4 equal sections when FAB is hidden
              : (width * 0.9 - 30) / 5   // 5 sections when FAB is visible
          }}
          onPress={navigateToNotifications}
        >
          <Ionicons name="notifications-outline" size={24} color="#fff" />
          {activeTab === "notifications" && (
            <View className="absolute bottom-[-6px] w-5 h-[3px] bg-white rounded-[2px]" />
          )}
        </TouchableOpacity>
      </View>

      {/* Floating Action Button - Hide for Employee and Manager users on multiple screens (MCP Context 7) */}
      {/* Business Rule: Hide FAB for Employee users on ViewAllTasksScreen, HomeScreen, CalenderScreen, and CalenderDetailScreen */}
      {/* Business Rule: Hide FAB for Manager users on HomeScreen, CalenderScreen, and CalenderDetailScreen (but show on ViewAllTasksScreen) */}
      {!shouldHideFAB && (
        <View
          style={{
            position: 'absolute',
            bottom: 45 + insets.bottom, // Reset FAB position since container is transformed
            zIndex: 1001,
            // Ensure FAB stays in same position regardless of app state
            left: '50%',
            marginLeft: -32.5, // Half of FAB width (65/2) to center it
          }}
        >
          <TouchableOpacity
            style={{
              width: 65,
              height: 65,
              borderRadius: 32.5,
              backgroundColor: 'black',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 3,
              borderColor: 'white',
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={handleAddPress}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
