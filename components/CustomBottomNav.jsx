import React from "react";
import {
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getUserRole } from "../services/utils/userRole";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import pusher from "../pusherClient";
import appEmitter from "../utils/appEmitter";

const { width, height } = Dimensions.get("window");

const isSmallScreen = width < 375;
const isVerySmallScreen = width < 360;
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
  userRole: propUserRole = null,
  hideFAB = false,
  transparentBackground = false,
}) {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeTab, setActiveTab] = React.useState("home");
  const [userRole, setUserRole] = React.useState(propUserRole ?? null);
  const [hasNewNotification, setHasNewNotification] = React.useState(false);
  const insets = useSafeAreaInsets();
  const { userInfo } = useAuth();

  React.useEffect(() => {
    console.log(
      "🔴 CustomBottomNav: Red dot state changed to:",
      hasNewNotification
    );
  }, [hasNewNotification]);

  React.useEffect(() => {
    const loadRedDotState = async () => {
      try {
        if (!userInfo?.id) return;
        const storageKey = `hasNewNotification:${userInfo.id}`;
        const savedState = await AsyncStorage.getItem(storageKey);
        if (savedState !== null) {
          setHasNewNotification(JSON.parse(savedState));
          console.log(
            "🔴 CustomBottomNav: Restored red dot state for user:",
            userInfo.id,
            JSON.parse(savedState)
          );
        } else {
          setHasNewNotification(false);
        }

        await AsyncStorage.removeItem("hasNewNotification");
      } catch (error) {
        console.error("Error loading red dot state:", error);
      }
    };

    loadRedDotState();
  }, [userInfo?.id]);

  React.useEffect(() => {
    const saveRedDotState = async () => {
      try {
        if (!userInfo?.id) return;
        const storageKey = `hasNewNotification:${userInfo.id}`;
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify(hasNewNotification)
        );
        console.log(
          "🔴 CustomBottomNav: Saved red dot state for user:",
          userInfo.id,
          hasNewNotification
        );
      } catch (error) {
        console.error("Error saving red dot state:", error);
      }
    };

    saveRedDotState();
  }, [hasNewNotification, userInfo?.id]);

  React.useEffect(() => {
    console.log("🟢 CustomBottomNav: Component mounted on screen:", route.name);
    return () => {
      console.log(
        "🔴 CustomBottomNav: Component unmounting from screen:",
        route.name
      );
    };
  }, [route.name]);

  React.useEffect(() => {
    if (propUserRole !== null && propUserRole !== undefined) {
      setUserRole(propUserRole);
      console.log(
        `CustomBottomNav - Using prop user role: ${propUserRole} on screen: ${route.name}`
      );
    } else {
      const loadUserRole = async () => {
        try {
          const role = await getUserRole();
          setUserRole(role);
          console.log(
            `CustomBottomNav - User role loaded: ${role} on screen: ${route.name}`
          );
        } catch (error) {
          console.error("CustomBottomNav - Error loading user role:", error);
        }
      };

      loadUserRole();
    }
  }, [propUserRole]);

  const effectiveUserRole = propUserRole ?? userRole;

  const isCalendarScreen =
    route.name === "CalenderScreen" ||
    route.name === "CalenderDetailScreen" ||
    route.name === "WeekView";
  const shouldHideFAB =
    hideFAB ||
    (effectiveUserRole === "Employee" &&
      (route.name === "ViewAllTasksScreen" ||
        route.name === "HomeScreen" ||
        isCalendarScreen)) ||
    (effectiveUserRole === "Manager" &&
      (route.name === "HomeScreen" || isCalendarScreen)) ||
    (effectiveUserRole === "Owner" && route.name === "ViewAllLogScreen") ||
    ((effectiveUserRole === "Owner" ||
      effectiveUserRole === "Manager" ||
      effectiveUserRole === "Employee") &&
      (route.name === "PersonalScreen" ||
        route.name === "ProjectAssignment" ||
        route.name === "LogsDetail")) ||
    route.name === "TaskDetails" ||
    ((effectiveUserRole === "Manager" || effectiveUserRole === "Employee") &&
      route.name === "CreatLog") ||
    ((effectiveUserRole === "Manager" || effectiveUserRole === "Employee") &&
      route.name === "CalenderScreen") ||
    ((effectiveUserRole === "Manager" || effectiveUserRole === "Employee") &&
      route.name === "CalenderDetailScreen") ||
    ((effectiveUserRole === "Manager" || effectiveUserRole === "Employee") &&
      route.name === "WeekView") ||
    (isCalendarScreen &&
      effectiveUserRole === null &&
      (propUserRole === null || propUserRole === undefined)) ||
    (route.name === "HomeScreen" &&
      effectiveUserRole === null &&
      (propUserRole === null || propUserRole === undefined));

  React.useEffect(() => {
    const getActiveTabFromRoute = (routeName) => {
      switch (routeName) {
        case "HomeScreen":
          return "home";
        case "CalenderScreen":
        case "CalenderDetailScreen":
        case "WeekView":
          return "profile";
        case "ChatScreen":
          return "chats";
        case "NotificationScreen":
          return "notifications";
        default:
          return null;
      }
    };

    const currentTab = getActiveTabFromRoute(route.name);
    setActiveTab(currentTab);
  }, [route.name]);

  const isSubscribedRef = React.useRef(false);
  const previousRouteRef = React.useRef(null);

  const setupPusherSubscription = (channelName, logMessage) => {
    console.log(logMessage, channelName);
    console.log(
      "🔌 CustomBottomNav: Pusher connection state:",
      pusher.connection.state
    );
    console.log(
      "✅ CustomBottomNav: Pusher is connected:",
      pusher.connection.state === "connected"
    );

    try {
      const channel = pusher.subscribe(channelName);
      console.log("✅ CustomBottomNav: Subscribed to channel:", channelName);

      channel.bind("pusher:subscription_succeeded", () => {
        console.log(
          "✅ CustomBottomNav: Subscription succeeded for:",
          channelName
        );
      });

      channel.bind("pusher:subscription_error", (error) => {
        console.error(
          "❌ CustomBottomNav: Subscription error for:",
          channelName,
          error
        );
      });

      const handleNewAssignment = (data, assignmentType) => {
        console.log(
          `🔔 CustomBottomNav: NEW ${assignmentType.toUpperCase()} ASSIGNMENT NOTIFICATION RECEIVED:`,
          data
        );

        setHasNewNotification(true);
        console.log("🔴 CustomBottomNav: Red dot shown on bell icon");
      };

      channel.bind("new-task-assignment", (data) =>
        handleNewAssignment(data, "task")
      );

      channel.bind("new-project-assignment", (data) =>
        handleNewAssignment(data, "project")
      );

      channel.bind("new-event-assignment", (data) =>
        handleNewAssignment(data, "event")
      );

      channel.bind("new-message", (data) =>
        handleNewAssignment(data, "message")
      );

      console.log(
        "✅ CustomBottomNav: All event listeners bound successfully for:",
        channelName
      );

      isSubscribedRef.current = true;
    } catch (error) {
      console.error(
        "❌ CustomBottomNav: Error setting up Pusher subscription:",
        error
      );
    }
  };

  React.useEffect(() => {
    const currentUserId = userInfo?.id;

    if (!currentUserId) {
      console.log(
        "⚠️ CustomBottomNav: No user ID available for Pusher channel"
      );
      return;
    }

    const channelName = `user-notifications-${currentUserId}`;
    const isOnNotificationScreen = route.name === "NotificationScreen";
    const previousRoute = previousRouteRef.current;

    if (isOnNotificationScreen && previousRoute !== "NotificationScreen") {
      console.log(
        "🔔 CustomBottomNav: User navigated TO NotificationScreen - hiding red dot and unsubscribing from Pusher"
      );
      setHasNewNotification(false);

      try {
        if (pusher.channels.channels[channelName]) {
          console.log(
            "🚪 CustomBottomNav: Unsubscribing from channel:",
            channelName
          );
          pusher.unsubscribe(channelName);
          isSubscribedRef.current = false;
        }
      } catch (error) {
        console.error(
          "❌ CustomBottomNav: Error unsubscribing from channel:",
          error
        );
      }

      previousRouteRef.current = route.name;
      return;
    }

    if (
      !isOnNotificationScreen &&
      previousRoute === "NotificationScreen" &&
      !isSubscribedRef.current
    ) {
      setupPusherSubscription(
        channelName,
        "🔔 CustomBottomNav: User navigated AWAY from NotificationScreen - subscribing to Pusher channel:"
      );
      previousRouteRef.current = route.name;
      return;
    }

    if (
      !isOnNotificationScreen &&
      !isSubscribedRef.current &&
      previousRoute === null
    ) {
      setupPusherSubscription(
        channelName,
        "🔔 CustomBottomNav: Initial subscribe to Pusher channel:"
      );
      previousRouteRef.current = route.name;
    } else if (!isOnNotificationScreen) {
      previousRouteRef.current = route.name;
    }

    return () => {
      if (!userInfo?.id) {
        console.log(
          "🧹 CustomBottomNav: Cleaning up Pusher channel subscription on unmount:",
          channelName
        );
        try {
          if (pusher.channels.channels[channelName]) {
            pusher.unsubscribe(channelName);
          }
          isSubscribedRef.current = false;
        } catch (error) {
          console.error("❌ CustomBottomNav: Error during cleanup:", error);
        }
      }
    };
  }, [userInfo?.id, route.name]);

  React.useEffect(() => {
    const handleClearBadge = () => {
      setHasNewNotification(false);
      console.log("🧹 CustomBottomNav: Badge cleared via appEmitter");
    };
    if (global.appEmitter || appEmitter) {
      appEmitter.on("clear-notification-badge", handleClearBadge);
    }
    return () => {
      if (global.appEmitter || appEmitter) {
        appEmitter.off("clear-notification-badge", handleClearBadge);
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
      const userRole = await getUserRole();
      if (userRole === "Employee") {
        console.log(
          "🚨 CustomBottomNav: Employee FAB pressed without project context!"
        );
        console.log(
          "🚨 This should not happen - Employee needs project ID to create logs"
        );
      } else if (
        userRole === "Manager" ||
        userRole === "Owner" ||
        userRole === "Admin"
      ) {
        console.log("FAB pressed for role:", userRole);
      }
    }
  };

  const navigateToHome = async () => {
    const userRole = await getUserRole();

    if (
      userRole === "Owner" ||
      userRole === "Admin" ||
      userRole === "Manager" ||
      userRole === "Employee"
    ) {
      navigation.navigate("HomeScreen");
    } else {
      navigation.navigate("WidgetScreen");
    }
  };

  const navigateToChats = () => {
    navigation.navigate("ChatScreen");
  };

  const navigateToNotifications = () => {
    navigation.navigate("NotificationScreen");

    setHasNewNotification(false);
    console.log(
      "🔴 CustomBottomNav: Red dot hidden after visiting notifications"
    );
  };

  const navigateToProfile = () => {
    navigation.navigate("CalenderScreen");
  };

  if (keyboardVisible) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 1000,
        backgroundColor: "transparent",

        marginBottom: 0,
        paddingBottom: insets.bottom,
        transform: [{ translateY: 20 }],
      }}
    >
      {}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: shouldHideFAB ? "space-around" : "space-between",
          width: "90%",
          height: navHeight,
          backgroundColor: transparentBackground ? "transparent" : "black",
          borderRadius: 35,
          paddingHorizontal: 15,
          paddingBottom: 5,
          marginBottom: 20,
          shadowColor: transparentBackground ? "transparent" : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: transparentBackground ? 0 : 0.15,
          shadowRadius: 4,
          elevation: transparentBackground ? 0 : 6,

          position: "relative",
        }}
      >
        <TouchableOpacity
          className="items-center justify-center relative"
          style={{
            width: shouldHideFAB
              ? (width * 0.9 - 30) / 4
              : (width * 0.9 - 30) / 5,
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
              ? (width * 0.9 - 30) / 4
              : (width * 0.9 - 30) / 5,
          }}
          onPress={navigateToProfile}
        >
          {}
          <Ionicons name="calendar-outline" size={iconSize} color="#fff" />

          {activeTab === "profile" && (
            <View className="absolute bottom-[-6px] w-5 h-[3px] bg-white rounded-[2px]" />
          )}
        </TouchableOpacity>

        {}
        {}
        {!shouldHideFAB && <View style={{ width: 65 }} />}

        <TouchableOpacity
          className="items-center justify-center relative"
          style={{
            width: shouldHideFAB
              ? (width * 0.9 - 30) / 4
              : (width * 0.9 - 30) / 5,
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
              ? (width * 0.9 - 30) / 4
              : (width * 0.9 - 30) / 5,
          }}
          onPress={navigateToNotifications}
        >
          <Ionicons name="notifications-outline" size={24} color="#fff" />
          {}
          {hasNewNotification && (
            <View
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#FF3B30",
                borderWidth: 1,
                borderColor: "#fff",
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

      {}
      {}
      {}
      {!shouldHideFAB && (
        <View
          style={{
            position: "absolute",
            bottom: 45 + insets.bottom,
            zIndex: 1001,

            left: "50%",
            marginLeft: -32.5,
          }}
        >
          <TouchableOpacity
            style={{
              width: 65,
              height: 65,
              borderRadius: 32.5,
              backgroundColor: "black",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 3,
              borderColor: "white",
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
