import React from "react";
import { View, TouchableOpacity, Dimensions, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getUserRole } from "../../services/utils/userRole";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import pusher from "../../pusherClient";
import appEmitter from "../../utils/appEmitter";

// === Change Summary (2025-11-07) ===
// What: Use the immediate prop-based user role when available so calendar screens hide the FAB without flicker for Managers/Employees.
// Why: Prevents a visible flash while the internal role state catches up (MCP context 7 UX smoothness).
// Dependencies: No new imports; leverages existing propUserRole flow.

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
  userRole: propUserRole = null, // Accept user role as prop to prevent FAB lag
  hideFAB = false, // Hide FAB icon
  transparentBackground = false, // Make background transparent
}) {
  const navigation = useNavigation();
  const route = useRoute(); // Get current route information
  const [activeTab, setActiveTab] = React.useState("home"); // Track active tab
  const [userRole, setUserRole] = React.useState(propUserRole ?? null); // Track user role
  const [hasNewNotification, setHasNewNotification] = React.useState(false); // Track new notifications
  const insets = useSafeAreaInsets(); // Get safe area insets
  const { userInfo } = useAuth(); // Get current user info for Pusher
  
  // Debug: Track red dot state changes
  React.useEffect(() => {
    console.log('🔴 CustomBottomNav: Red dot state changed to:', hasNewNotification);
  }, [hasNewNotification]);
  
  // Persist red dot state PER USER across component remounts
  // Uses a namespaced key so different users don't share the same badge state
  React.useEffect(() => {
    const loadRedDotState = async () => {
      try {
        if (!userInfo?.id) return; // Wait for user id
        const storageKey = `hasNewNotification:${userInfo.id}`;
        const savedState = await AsyncStorage.getItem(storageKey);
        if (savedState !== null) {
          setHasNewNotification(JSON.parse(savedState));
          console.log('🔴 CustomBottomNav: Restored red dot state for user:', userInfo.id, JSON.parse(savedState));
        } else {
          setHasNewNotification(false);
        }
        // Cleanup legacy global key if it exists
        await AsyncStorage.removeItem('hasNewNotification');
      } catch (error) {
        console.error('Error loading red dot state:', error);
      }
    };
    
    loadRedDotState();
  }, [userInfo?.id]);
  
  // Save red dot state when it changes (per-user key)
  React.useEffect(() => {
    const saveRedDotState = async () => {
      try {
        if (!userInfo?.id) return; // Don't persist without user id
        const storageKey = `hasNewNotification:${userInfo.id}`;
        await AsyncStorage.setItem(storageKey, JSON.stringify(hasNewNotification));
        console.log('🔴 CustomBottomNav: Saved red dot state for user:', userInfo.id, hasNewNotification);
      } catch (error) {
        console.error('Error saving red dot state:', error);
      }
    };
    
    saveRedDotState();
  }, [hasNewNotification, userInfo?.id]);
  
  // Debug: Track component mount/unmount
  React.useEffect(() => {
    console.log('🟢 CustomBottomNav: Component mounted on screen:', route.name);
    return () => {
      console.log('🔴 CustomBottomNav: Component unmounting from screen:', route.name);
    };
  }, [route.name]);

  // --- Load User Role (MCP Context 7) ---
  // Business Rule: Get user role to determine FAB visibility based on current screen
  // Use prop userRole if provided (prevents FAB lag on calendar screens), otherwise load internally
  React.useEffect(() => {
    if (propUserRole !== null && propUserRole !== undefined) {
      // Use provided user role (prevents FAB lag)
      setUserRole(propUserRole);
      console.log(`CustomBottomNav - Using prop user role: ${propUserRole} on screen: ${route.name}`);
    } else {
      // Load user role internally for other screens
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
    }
  }, [propUserRole]); // Re-run when prop userRole changes

  const effectiveUserRole = propUserRole ?? userRole; // NOTE: Ensures calendar screens respect prop role instantly (no FAB flash).

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
  const shouldHideFAB = hideFAB || (
    effectiveUserRole === "Employee" && (
      route.name === "ViewAllTasksScreen" || 
      route.name === "HomeScreen" || 
      isCalendarScreen
    )
  ) || (
    effectiveUserRole === "Manager" && (
      route.name === "HomeScreen" || 
      isCalendarScreen
    )
  ) || (
    // Hide FAB for Owner, Manager, and Employee roles on ViewAllLogScreen
    (effectiveUserRole === "Owner" ) && route.name === "ViewAllLogScreen"
  ) || (
    // Hide FAB for Owner, Manager, and Employee roles on PersonalScreen, ProjectAssignment, and LogsDetail
    (effectiveUserRole === "Owner" || effectiveUserRole === "Manager" || effectiveUserRole === "Employee") && (route.name === "PersonalScreen" || route.name === "ProjectAssignment" || route.name === "LogsDetail")
  ) || (
    // Hide FAB for all users on TaskDetailsScreen
    route.name === "TaskDetails"
  ) || (
    // Hide FAB for Manager and Employee roles on CreateLogScreen
    (effectiveUserRole === "Manager" || effectiveUserRole === "Employee") && route.name === "CreatLog"
  ) || (
    // Hide FAB for Manager and Employee roles on CalenderScreen (✅ Owner can see FAB)
    (effectiveUserRole === "Manager" || effectiveUserRole === "Employee") && route.name === "CalenderScreen"
  ) || (
    // Hide FAB for Manager and Employee roles on CalenderDetailScreen (✅ Owner can see FAB)
    (effectiveUserRole === "Manager" || effectiveUserRole === "Employee") && route.name === "CalenderDetailScreen"
  ) || (
    // Hide FAB for Manager and Employee roles on WeekView (✅ Owner can see FAB)
    (effectiveUserRole === "Manager" || effectiveUserRole === "Employee") && route.name === "WeekView"
  ) || (
    // Hide FAB on calendar screens until userRole is loaded to prevent flashing
    // But only if we don't have the userRole from props (prevents FAB lag)
    isCalendarScreen && effectiveUserRole === null && (propUserRole === null || propUserRole === undefined)
  ) || (
    // --- Pending Role Guard for Home Screen (MCP Context 7) ---
    // Business Rule: Prevent a temporary FAB flash on HomeScreen until the user's role is known.
    route.name === "HomeScreen" && effectiveUserRole === null && (propUserRole === null || propUserRole === undefined)
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
        case "ChatScreen":
          return "chats"; // Chat icon highlighted for chat screen
        case "NotificationScreen":
          return "notifications"; // Notification icon highlighted for notification screen
        default:
          return null; // No tab highlighted for other screens
      }
    };

    // Set active tab based on current route
    const currentTab = getActiveTabFromRoute(route.name);
    setActiveTab(currentTab);
  }, [route.name]); // Re-run when route name changes

  // --- Track Pusher Subscription State (MCP Context 7) ---
  // Business Rule: Use ref to track if we're subscribed to avoid duplicate subscriptions
  const isSubscribedRef = React.useRef(false);
  const previousRouteRef = React.useRef(null);

  // --- Helper Function to Setup Pusher Subscription (MCP Context 7) ---
  // Business Rule: Centralized function to subscribe and bind event handlers to avoid code duplication
  const setupPusherSubscription = (channelName, logMessage) => {
    console.log(logMessage, channelName);
    console.log('🔌 CustomBottomNav: Pusher connection state:', pusher.connection.state);
    console.log('✅ CustomBottomNav: Pusher is connected:', pusher.connection.state === 'connected');
    
    try {
      // Subscribe to user-specific notification channel
      const channel = pusher.subscribe(channelName);
      console.log('✅ CustomBottomNav: Subscribed to channel:', channelName);
      
      // Handle subscription success
      channel.bind('pusher:subscription_succeeded', () => {
        console.log('✅ CustomBottomNav: Subscription succeeded for:', channelName);
      });
      
      // Handle subscription errors
      channel.bind('pusher:subscription_error', (error) => {
        console.error('❌ CustomBottomNav: Subscription error for:', channelName, error);
      });
      
      // Unified handler for all assignment types (task, project, event, message)
      const handleNewAssignment = (data, assignmentType) => {
        console.log(`🔔 CustomBottomNav: NEW ${assignmentType.toUpperCase()} ASSIGNMENT NOTIFICATION RECEIVED:`, data);

        // Show red dot on bell icon
        setHasNewNotification(true);
        console.log('🔴 CustomBottomNav: Red dot shown on bell icon');
      };

      // Listen for new task assignment events
      channel.bind('new-task-assignment', (data) => handleNewAssignment(data, 'task'));

      // Listen for new project assignment events
      channel.bind('new-project-assignment', (data) => handleNewAssignment(data, 'project'));

      // Listen for new event assignment events
      channel.bind('new-event-assignment', (data) => handleNewAssignment(data, 'event'));
      
      // Listen for new message events
      channel.bind('new-message', (data) => handleNewAssignment(data, 'message'));
      
      console.log('✅ CustomBottomNav: All event listeners bound successfully for:', channelName);
      
      // Mark as subscribed
      isSubscribedRef.current = true;
    } catch (error) {
      console.error('❌ CustomBottomNav: Error setting up Pusher subscription:', error);
    }
  };

  // --- Pusher Real-time Notification Listener (MCP Context 7) ---
  // Business Rule: Listen for new notifications to show red dot on bell icon
  // Business Rule: Unsubscribe from Pusher channel ONLY when user enters NotificationScreen
  // Business Rule: Subscribe to Pusher channel ONLY ONCE when user leaves NotificationScreen
  // Business Rule: Hide red dot automatically when user navigates to NotificationScreen
  React.useEffect(() => {
    const currentUserId = userInfo?.id;
    
    if (!currentUserId) {
      console.log('⚠️ CustomBottomNav: No user ID available for Pusher channel');
      return;
    }

    // Create channel name matching backend: `user-notifications-${assignedToUserId}`
    const channelName = `user-notifications-${currentUserId}`;
    const isOnNotificationScreen = route.name === "NotificationScreen";
    const previousRoute = previousRouteRef.current;
    
    // --- Handle Navigation to NotificationScreen ---
    // Business Rule: Only unsubscribe when entering NotificationScreen (not already on it)
    if (isOnNotificationScreen && previousRoute !== "NotificationScreen") {
      console.log('🔔 CustomBottomNav: User navigated TO NotificationScreen - hiding red dot and unsubscribing from Pusher');
      setHasNewNotification(false);
      
      // Unsubscribe from Pusher channel when entering NotificationScreen
      // This saves resources since user is already viewing notifications
      try {
        if (pusher.channels.channels[channelName]) {
          console.log('🚪 CustomBottomNav: Unsubscribing from channel:', channelName);
          pusher.unsubscribe(channelName);
          isSubscribedRef.current = false;
        }
      } catch (error) {
        console.error('❌ CustomBottomNav: Error unsubscribing from channel:', error);
      }
      
      // Update previous route
      previousRouteRef.current = route.name;
      return;
    }
    
    // --- Handle Navigation Away from NotificationScreen ---
    // Business Rule: Only subscribe ONCE when leaving NotificationScreen (not already subscribed)
    if (!isOnNotificationScreen && previousRoute === "NotificationScreen" && !isSubscribedRef.current) {
      setupPusherSubscription(channelName, '🔔 CustomBottomNav: User navigated AWAY from NotificationScreen - subscribing to Pusher channel:');
      previousRouteRef.current = route.name;
      return;
    }
    
    // --- Initial Subscribe (First Time Only) ---
    // Business Rule: Subscribe on component mount if not on NotificationScreen and not already subscribed
    if (!isOnNotificationScreen && !isSubscribedRef.current && previousRoute === null) {
      setupPusherSubscription(channelName, '🔔 CustomBottomNav: Initial subscribe to Pusher channel:');
      previousRouteRef.current = route.name;
    } else if (!isOnNotificationScreen) {
      // Update previous route for non-NotificationScreen routes (but don't re-subscribe)
      previousRouteRef.current = route.name;
    }

    // Cleanup function to unsubscribe only when component unmounts (not on route changes)
    return () => {
      // Only cleanup on unmount (when userInfo changes or component unmounts)
      // Don't cleanup on route changes - we handle that above
      if (!userInfo?.id) {
        console.log('🧹 CustomBottomNav: Cleaning up Pusher channel subscription on unmount:', channelName);
        try {
          if (pusher.channels.channels[channelName]) {
            pusher.unsubscribe(channelName);
          }
          isSubscribedRef.current = false;
        } catch (error) {
          console.error('❌ CustomBottomNav: Error during cleanup:', error);
        }
      }
    };
  }, [userInfo?.id, route.name]); // Re-run when user ID or route name changes

  // Listen for external clear-badge events (from NotificationScreen focus)
  React.useEffect(() => {
    const handleClearBadge = () => {
      setHasNewNotification(false);
      console.log('🧹 CustomBottomNav: Badge cleared via appEmitter');
    };
    if (global.appEmitter || appEmitter) {
      appEmitter.on('clear-notification-badge', handleClearBadge);
    }
    return () => {
      if (global.appEmitter || appEmitter) {
        appEmitter.off('clear-notification-badge', handleClearBadge);
      }
    };
  }, []);

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
    // Navigate to ChatScreen when chats icon is pressed
    navigation.navigate("ChatScreen");
  };

  const navigateToNotifications = () => {
    // Navigate to NotificationScreen when bell icon is pressed
    navigation.navigate("NotificationScreen");
    // Hide red dot when user visits notifications
    setHasNewNotification(false);
    console.log('🔴 CustomBottomNav: Red dot hidden after visiting notifications');
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
          backgroundColor: transparentBackground ? 'transparent' : 'black',
          borderRadius: 35,
          paddingHorizontal: 15,
          paddingBottom: 5,
          marginBottom: 20, // Keep consistent margin from bottom
          shadowColor: transparentBackground ? 'transparent' : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: transparentBackground ? 0 : 0.15,
          shadowRadius: 4,
          elevation: transparentBackground ? 0 : 6,
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
          {/* Red dot for new notifications */}
          {hasNewNotification && (
            <View 
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#FF3B30',
                borderWidth: 1,
                borderColor: '#fff',
                marginTop: 2,
                marginRight: 30,
              }}
            />
          )}
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
