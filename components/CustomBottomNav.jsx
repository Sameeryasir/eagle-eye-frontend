import React from "react";
import { View, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getUserRole } from "../services/utils/userRole";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import pusher from "../pusherClient";
import appEmitter from "../utils/appEmitter";

function useBottomNavLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const scale = Math.min(Math.max(width / 390, 0.82), 1.12);
  const barWidth = Math.min(width * 0.92, 420);
  const horizontalPadding = Math.round(Math.min(Math.max(width * 0.035, 10), 18));
  const navHeight = Math.round(Math.min(Math.max(58 * scale, 54), 72));
  const iconSize = Math.round(Math.min(Math.max(22 * scale, 18), 26));
  const fabSize = Math.round(Math.min(Math.max(58 * scale, 50), 68));
  const fabIconSize = Math.round(fabSize * 0.46);
  const indicatorWidth = Math.round(Math.min(Math.max(18 * scale, 14), 24));
  const badgeSize = Math.round(Math.min(Math.max(8 * scale, 7), 10));
  const bottomGap = Math.max(insets.bottom > 0 ? 6 : 12, 8);
  const fabBottom = bottomGap + navHeight * 0.55;
  const tabCountWithFab = 5;
  const tabCountNoFab = 4;

  return {
    width,
    insets,
    barWidth,
    horizontalPadding,
    navHeight,
    iconSize,
    fabSize,
    fabIconSize,
    indicatorWidth,
    badgeSize,
    bottomGap,
    fabBottom,
    tabWidth: (hideFab) =>
      (barWidth - horizontalPadding * 2) /
      (hideFab ? tabCountNoFab : tabCountWithFab),
  };
}

const mapRouteNameToTab = (routeName) => {
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

const SHOW_BOTTOM_NAV_ON = new Set([
  "HomeScreen",
  "CalenderScreen",
  "ChatScreen",
  "NotificationScreen",
]);

export default function CustomBottomNav(props) {
  const route = useRoute();

  if (!SHOW_BOTTOM_NAV_ON.has(route.name) || props.keyboardVisible) {
    return null;
  }

  return <CustomBottomNavBar {...props} />;
}

function CustomBottomNavBar({
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
  const [activeTab, setActiveTab] = React.useState(() => {
    const initialTab = mapRouteNameToTab(route.name);
    return initialTab ?? "home";
  });
  const [userRole, setUserRole] = React.useState(propUserRole ?? null);
  const [hasNewNotification, setHasNewNotification] = React.useState(false);
  const layout = useBottomNavLayout();
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
    if (currentTab !== null) {
      setActiveTab(currentTab);
    }
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
    setActiveTab("home");
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
    setActiveTab("chats");
    navigation.navigate("ChatScreen");
  };

  const navigateToNotifications = () => {
    setActiveTab("notifications");
    navigation.navigate("NotificationScreen");

    setHasNewNotification(false);
    console.log(
      "🔴 CustomBottomNav: Red dot hidden after visiting notifications"
    );
  };

  const navigateToProfile = () => {
    setActiveTab("profile");
    navigation.navigate("CalenderScreen");
  };

  const tabWidth = layout.tabWidth(shouldHideFAB);
  const activeIndicatorStyle = {
    position: "absolute",
    bottom: -Math.round(layout.navHeight * 0.08),
    width: layout.indicatorWidth,
    height: 3,
    backgroundColor: "#ffffff",
    borderRadius: 2,
  };

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
        paddingBottom: layout.insets.bottom,
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: shouldHideFAB ? "space-around" : "space-between",
          width: layout.barWidth,
          maxWidth: "100%",
          height: layout.navHeight,
          backgroundColor: transparentBackground ? "transparent" : "black",
          borderRadius: layout.navHeight / 2,
          paddingHorizontal: layout.horizontalPadding,
          marginBottom: layout.bottomGap,
          shadowColor: transparentBackground ? "transparent" : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: transparentBackground ? 0 : 0.15,
          shadowRadius: 4,
          elevation: transparentBackground ? 0 : 6,
          position: "relative",
          overflow: "visible",
        }}
      >
        <TouchableOpacity
          className="items-center justify-center relative"
          style={{ width: tabWidth, minHeight: layout.navHeight }}
          onPress={navigateToHome}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons name="home-outline" size={layout.iconSize} color="#fff" />
          {activeTab === "home" && <View style={activeIndicatorStyle} />}
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center justify-center relative"
          style={{ width: tabWidth, minHeight: layout.navHeight }}
          onPress={navigateToProfile}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons
            name="calendar-outline"
            size={layout.iconSize}
            color="#fff"
          />
          {activeTab === "profile" && <View style={activeIndicatorStyle} />}
        </TouchableOpacity>

        {!shouldHideFAB && <View style={{ width: layout.fabSize }} />}

        <TouchableOpacity
          className="items-center justify-center relative"
          style={{ width: tabWidth, minHeight: layout.navHeight }}
          onPress={navigateToChats}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons
            name="chatbubble-outline"
            size={layout.iconSize}
            color="#fff"
          />
          {activeTab === "chats" && <View style={activeIndicatorStyle} />}
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center justify-center relative"
          style={{ width: tabWidth, minHeight: layout.navHeight }}
          onPress={navigateToNotifications}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <View>
            <Ionicons
              name="notifications-outline"
              size={layout.iconSize}
              color="#fff"
            />
            {hasNewNotification && (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: layout.badgeSize,
                  height: layout.badgeSize,
                  borderRadius: layout.badgeSize / 2,
                  backgroundColor: "#FF3B30",
                  borderWidth: 1,
                  borderColor: "#fff",
                }}
              />
            )}
          </View>
          {activeTab === "notifications" && (
            <View style={activeIndicatorStyle} />
          )}
        </TouchableOpacity>
      </View>

      {!shouldHideFAB && (
        <View
          style={{
            position: "absolute",
            bottom: layout.fabBottom + layout.insets.bottom,
            zIndex: 1001,
            left: "50%",
            marginLeft: -layout.fabSize / 2,
          }}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={{
              width: layout.fabSize,
              height: layout.fabSize,
              borderRadius: layout.fabSize / 2,
              backgroundColor: "black",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: Math.max(2, Math.round(layout.fabSize * 0.045)),
              borderColor: "white",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={handleAddPress}
          >
            <Ionicons name="add" size={layout.fabIconSize} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
