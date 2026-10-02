// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getNotificationforCurrentUser } from "../services/inAppNotification/getNotificationforCurrentUser";
import { markAllRead } from "../services/inAppNotification/markAllRead";
import { deleteNotificationById } from "../services/inAppNotification/deleteNotificationById";
import { useAuth } from "../context/AuthContext";
import pusher from "../pusherClient";
import Toast from "react-native-toast-message";
import {
  ApiCacheKeys,
  getApiCache,
  setApiCache,
} from "../utils/apiCache";

const NOTIFICATIONS_STALE_MS = 60_000;
let hasMarkedAllReadThisSession = false;

export default function NotificationScreen() {
  const cached = getApiCache(ApiCacheKeys.notifications, NOTIFICATIONS_STALE_MS);
  const [apiNotifications, setApiNotifications] = useState(
    () => cached ?? []
  );
  const [loading, setLoading] = useState(() => cached == null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  const fetchNotifications = useCallback(async ({ force = false } = {}) => {
    if (!force) {
      const fresh = getApiCache(
        ApiCacheKeys.notifications,
        NOTIFICATIONS_STALE_MS
      );
      if (fresh != null) {
        setApiNotifications(fresh);
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    if (!force && apiNotifications.length === 0) {
      setLoading(true);
    }

    try {
      const response = await getNotificationforCurrentUser();

      let notificationsData = [];

      if (response && typeof response === "object") {
        if (response.success && response.data) {
          notificationsData = response.data;
        } else if (Array.isArray(response.data)) {
          notificationsData = response.data;
        } else if (Array.isArray(response)) {
          notificationsData = response;
        } else if (Array.isArray(response.notifications)) {
          notificationsData = response.notifications;
        }
      }

      setApiNotifications(notificationsData);
      setApiCache(ApiCacheKeys.notifications, notificationsData);

      if (notificationsData.length > 0 && !hasMarkedAllReadThisSession) {
        hasMarkedAllReadThisSession = true;
        try {
          await markAllRead();
        } catch (markError) {
          console.error(
            "❌ Error auto-marking notifications as read:",
            markError
          );
          hasMarkedAllReadThisSession = false;
        }
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      if (apiNotifications.length === 0) {
        setApiNotifications([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiNotifications.length]);

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotificationById(notificationId);

      setApiNotifications((prevNotifications) => {
        const next = prevNotifications.filter(
          (notif) => notif.id !== notificationId
        );
        setApiCache(ApiCacheKeys.notifications, next);
        return next;
      });

      Toast.show({
        type: "success",
        text1: "Notification Deleted",
        text2: "The notification has been removed",
        visibilityTime: 2000,
        autoHide: true,
        topOffset: 80,
      });
    } catch (error) {
      console.error("❌ Error deleting notification:", error);

      Toast.show({
        type: "error",
        text1: "Delete Failed",
        text2: "Failed to delete notification. Please try again.",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  const handleNotificationTap = (notification) => {
    if (notification.taskId) {
      navigation.navigate("TaskDetails", { taskId: notification.taskId });
    } else if (notification.projectId) {
      navigation.navigate("MainTabs", { screen: "HomeScreen" });
    } else if (notification.eventId) {
      navigation.navigate("MainTabs", { screen: "CalenderScreen" });
    } else if (notification.conversationId) {
      const conversationType =
        notification.conversationType || notification.type || "private";
      navigation.navigate("UserChatScreen", {
        conversationId: notification.conversationId,
        userName: notification.fromUserName || "User",
        type: conversationType,
      });
    }
  };

  useEffect(() => {
    fetchNotifications({ force: false });
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const channelName = `user-notifications-${currentUserId}`;
    const channel = pusher.subscribe(channelName);

    const handleNewAssignment = (data) => {
      let notificationData = data;
      if (Array.isArray(data) && data.length > 0) {
        notificationData = data[0];
      }

      setApiNotifications((prevNotifications) => {
        const exists = prevNotifications.some(
          (notif) => notif.id === notificationData.id
        );
        if (exists) {
          return prevNotifications;
        }
        const next = [notificationData, ...prevNotifications];
        setApiCache(ApiCacheKeys.notifications, next);
        return next;
      });
    };

    channel.bind("new-task-assignment", handleNewAssignment);
    channel.bind("new-project-assignment", handleNewAssignment);
    channel.bind("new-event-assignment", handleNewAssignment);
    channel.bind("new-message", handleNewAssignment);

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [currentUserId]);

  return (
    <View className="flex-1 bg-white">
      {loading ? (
        <View className="flex-1 justify-center items-center p-5 min-h-[100px]">
          <Text className="text-base text-gray-500 font-medium">
            Loading notifications...
          </Text>
        </View>
      ) : apiNotifications.length === 0 ? (
        <View className="flex-1 justify-center items-center px-10">
          <Text className="text-6xl mb-4">🔔</Text>
          <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">
            No Notifications
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            You're all caught up!
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications({ force: true });
              }}
            />
          }
        >
          {apiNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              onPress={() => handleNotificationTap(notification)}
              activeOpacity={0.7}
            >
              <View className="bg-white p-5 mt-2 mb-4 rounded-2xl shadow-lg border border-gray-100">
                <View className="flex-row items-center mb-3">
                  <View className="w-12 h-12 rounded-full bg-black justify-center items-center mr-4">
                    <Text className="text-white text-lg font-bold">
                      {notification.fromUserName
                        ? notification.fromUserName.charAt(0).toUpperCase()
                        : "U"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-800 mb-1">
                      {notification.fromUserName}
                    </Text>
                    {notification.projectName && (
                      <Text className="text-sm text-gray-500 font-medium">
                        Project: {notification.projectName}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    className="p-2"
                    onPress={() => handleDeleteNotification(notification.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                {notification.title && (
                  <Text className="text-xl font-bold text-gray-900 mb-2">
                    {notification.title}
                  </Text>
                )}
                <Text className="text-base text-gray-700 leading-6 mb-4 font-normal">
                  {notification.message}
                </Text>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-gray-400 font-medium">
                    {notification.createdAt
                      ? new Date(notification.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "Just now"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
