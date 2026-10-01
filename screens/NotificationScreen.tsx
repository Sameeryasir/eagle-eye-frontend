// @ts-nocheck
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getNotificationforCurrentUser } from "../services/inAppNotification/getNotificationforCurrentUser";
import { markAllRead } from "../services/inAppNotification/markAllRead";
import { deleteNotificationById } from "../services/inAppNotification/deleteNotificationById";
import { useAuth } from "../context/AuthContext";
import pusher from "../pusherClient";
import HomeBottomNav from "../components/HomeBottomNav";
import Toast from "react-native-toast-message";

export default function NotificationScreen() {
  const [apiNotifications, setApiNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const navigation = useNavigation();

  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  const fetchNotifications = async () => {
    setLoading(true);
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

      if (notificationsData.length > 0) {
        try {
          await markAllRead();
        } catch (markError) {
          console.error(
            "❌ Error auto-marking notifications as read:",
            markError
          );
        }
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      setApiNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (apiNotifications.length === 0) {
      return;
    }

    setMarkingAllRead(true);
    try {
      const result = await markAllRead();

      await fetchNotifications();
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {

      await deleteNotificationById(notificationId);

      setApiNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif.id !== notificationId)
      );

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
      navigation.navigate("HomeScreen");
    } else if (notification.eventId) {
      navigation.navigate("CalenderScreen");
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
    fetchNotifications();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
    }, [])
  );

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const channelName = `user-notifications-${currentUserId}`;

    const channel = pusher.subscribe(channelName);

    const handleNewAssignment = async (data, assignmentType) => {

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

        const newNotifications = [notificationData, ...prevNotifications];
        return newNotifications;
      });

      try {
        await markAllRead();
      } catch (markError) {
        console.error(
          "❌ Error auto-marking notifications as read (from Pusher):",
          markError
        );
      }
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

    channel.bind("new-message", (data) => handleNewAssignment(data, "message"));

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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
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

      <HomeBottomNav />
    </View>
  );
}
