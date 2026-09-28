// @ts-nocheck
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import pusher from "../pusherClient";
import appEmitter from "../utils/appEmitter";
import { Brand } from "../constants/brandColors";

const LEFT_TABS = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    iconActive: "home",
    route: "HomeScreen",
  },
  {
    key: "profile",
    label: "Calendar",
    icon: "calendar-outline",
    iconActive: "calendar",
    route: "CalenderScreen",
  },
];

const RIGHT_TABS = [
  {
    key: "chats",
    label: "Chats",
    icon: "chatbubble-outline",
    iconActive: "chatbubble",
    route: "ChatScreen",
  },
  {
    key: "notifications",
    label: "Alerts",
    icon: "notifications-outline",
    iconActive: "notifications",
    route: "NotificationScreen",
  },
];

function tabFromRoute(routeName) {
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
      return "home";
  }
}

function NavTab({ tab, active, hasNewNotification, onPress }) {
  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View>
        <Ionicons
          name={active ? tab.iconActive : tab.icon}
          size={22}
          color={active ? Brand.ink : Brand.inkFaint}
        />
        {tab.key === "notifications" && hasNewNotification && (
          <View style={styles.dot} />
        )}
      </View>
      <Text
        style={[
          styles.label,
          { color: active ? Brand.ink : Brand.inkFaint },
          active && styles.labelActive,
        ]}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeBottomNav({
  keyboardVisible = false,
  onAddPress,
}) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { userInfo } = useAuth();
  const [activeTab, setActiveTab] = React.useState(() =>
    tabFromRoute(route.name)
  );
  const [hasNewNotification, setHasNewNotification] = React.useState(false);
  const isSubscribedRef = React.useRef(false);

  React.useEffect(() => {
    setActiveTab(tabFromRoute(route.name));
  }, [route.name]);

  React.useEffect(() => {
    const loadRedDotState = async () => {
      try {
        if (!userInfo?.id) return;
        const storageKey = `hasNewNotification:${userInfo.id}`;
        const savedState = await AsyncStorage.getItem(storageKey);
        if (savedState !== null) {
          setHasNewNotification(JSON.parse(savedState));
        }
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
        await AsyncStorage.setItem(
          `hasNewNotification:${userInfo.id}`,
          JSON.stringify(hasNewNotification)
        );
      } catch (error) {
        console.error("Error saving red dot state:", error);
      }
    };
    saveRedDotState();
  }, [hasNewNotification, userInfo?.id]);

  React.useEffect(() => {
    const currentUserId = userInfo?.id;
    if (!currentUserId) return undefined;

    const channelName = `user-notifications-${currentUserId}`;
    const onNotificationScreen = route.name === "NotificationScreen";

    if (onNotificationScreen) {
      setHasNewNotification(false);
      try {
        if (pusher.channels.channels[channelName]) {
          pusher.unsubscribe(channelName);
          isSubscribedRef.current = false;
        }
      } catch (error) {
        console.error("Error unsubscribing:", error);
      }
      return undefined;
    }

    if (!isSubscribedRef.current) {
      try {
        const channel = pusher.subscribe(channelName);
        const mark = () => setHasNewNotification(true);
        channel.bind("new-task-assignment", mark);
        channel.bind("new-project-assignment", mark);
        channel.bind("new-event-assignment", mark);
        channel.bind("new-message", mark);
        isSubscribedRef.current = true;
      } catch (error) {
        console.error("Error subscribing:", error);
      }
    }

    return undefined;
  }, [userInfo?.id, route.name]);

  React.useEffect(() => {
    const handleClearBadge = () => setHasNewNotification(false);
    appEmitter.on("clear-notification-badge", handleClearBadge);
    return () => appEmitter.off("clear-notification-badge", handleClearBadge);
  }, []);

  if (keyboardVisible) {
    return null;
  }

  const onTabPress = (tab) => {
    setActiveTab(tab.key);
    if (tab.key === "notifications") {
      setHasNewNotification(false);
    }
    navigation.navigate(tab.route);
  };

  const handleAddPress = () => {
    if (onAddPress) {
      onAddPress();
      return;
    }
    navigation.navigate("CreateProject");
  };

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {LEFT_TABS.map((tab) => (
        <NavTab
          key={tab.key}
          tab={tab}
          active={activeTab === tab.key}
          hasNewNotification={hasNewNotification}
          onPress={() => onTabPress(tab)}
        />
      ))}

      <View style={styles.fabSlot}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddPress}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={Brand.onInk} />
        </TouchableOpacity>
      </View>

      {RIGHT_TABS.map((tab) => (
        <NavTab
          key={tab.key}
          tab={tab}
          active={activeTab === tab.key}
          hasNewNotification={hasNewNotification}
          onPress={() => onTabPress(tab)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    backgroundColor: Brand.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 2,
    minHeight: 48,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
  labelActive: {
    fontWeight: "700",
  },
  fabSlot: {
    width: 64,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Brand.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    borderWidth: 4,
    borderColor: Brand.paper,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  dot: {
    position: "absolute",
    top: -2,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.danger,
    borderWidth: 1,
    borderColor: Brand.paper,
  },
});
