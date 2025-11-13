import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getNotificationforCurrentUser } from '../services/inAppNotification/getNotificationforCurrentUser';
import { markAllRead } from '../services/inAppNotification/markAllRead';
import { deleteNotificationById } from '../services/inAppNotification/deleteNotificationById';
import { useAuth } from '../context/AuthContext';
import pusher from '../pusherClient';
import CustomBottomNav from '../components/CustomBottomNav';
import Toast from 'react-native-toast-message';

export default function NotificationScreen() {
  const [apiNotifications, setApiNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const navigation = useNavigation();
  
  // Get current user info for Pusher channel
  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;
  
  // Fetch notifications from API and mark all as read
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await getNotificationforCurrentUser();
      console.log('🔔 NOTIFICATIONS RESPONSE:', response);
      console.log('🔍 RESPONSE TYPE:', typeof response);
      console.log('🔍 RESPONSE KEYS:', Object.keys(response || {}));
      
      // Handle different response structures
      let notificationsData = [];
      
      if (response && typeof response === 'object') {
        // Check if response has success/data structure
        if (response.success && response.data) {
          notificationsData = response.data;
        }
        // Check if response has data array directly
        else if (Array.isArray(response.data)) {
          notificationsData = response.data;
        }
        // Check if response is an array directly
        else if (Array.isArray(response)) {
          notificationsData = response;
        }
        // Check if response has notifications array
        else if (Array.isArray(response.notifications)) {
          notificationsData = response.notifications;
        }
      }
      
      console.log('📋 PROCESSED NOTIFICATIONS:', notificationsData);
      console.log('📊 NOTIFICATIONS COUNT:', notificationsData.length);
      
      setApiNotifications(notificationsData);
      console.log('✅ NOTIFICATIONS LOADED:', notificationsData.length);
      
      // --- Auto Mark All as Read (MCP Context 7) ---
      // Business Rule: Automatically mark all notifications as read when user opens screen
      if (notificationsData.length > 0) {
        try {
          console.log('🔔 AUTO CALLING API TO MARK ALL NOTIFICATIONS AS READ');
          await markAllRead();
          console.log('✅ ALL NOTIFICATIONS AUTO-MARKED AS READ');
        } catch (markError) {
          console.error('❌ Error auto-marking notifications as read:', markError);
          // Don't throw error - notifications were loaded successfully
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      setApiNotifications([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // --- Mark All Notifications as Read (MCP Context 7) ---
  // Business Rule: Mark all notifications as read for current user
  const handleMarkAllRead = async () => {
    if (apiNotifications.length === 0) {
      console.log('📝 No notifications to mark as read');
      return;
    }

    setMarkingAllRead(true);
    try {
      console.log('🔔 CALLING API TO MARK ALL NOTIFICATIONS AS READ');
      const result = await markAllRead();
      console.log('✅ ALL NOTIFICATIONS MARKED AS READ:', result);
      
      // Refresh notifications to get updated read status
      await fetchNotifications();
      
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  // --- Delete Notification Handler (MCP Context 7) ---
  // Business Rule: Delete a specific notification when user taps bin icon
  const handleDeleteNotification = async (notificationId) => {
    try {
      console.log('🗑️ DELETING NOTIFICATION:', notificationId);
      
      // Call API to delete notification
      await deleteNotificationById(notificationId);
      
      // Remove notification from local state
      setApiNotifications(prevNotifications => 
        prevNotifications.filter(notif => notif.id !== notificationId)
      );
      
      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Notification Deleted',
        text2: 'The notification has been removed',
        visibilityTime: 2000,
        autoHide: true,
        topOffset: 80,
      });
      
      console.log('✅ NOTIFICATION DELETED SUCCESSFULLY');
      
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      
      // Show error toast
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Failed to delete notification. Please try again.',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  // --- Handle Notification Card Tap (MCP Context 7) ---
  // Business Rule: Navigate to appropriate screen based on notification type
  const handleNotificationTap = (notification) => {
    console.log('🔔 Notification tapped:', notification);
    
    // Navigate to TaskDetailsScreen if task notification
    if (notification.taskId) {
      console.log('📋 Navigating to TaskDetailsScreen with taskId:', notification.taskId);
      navigation.navigate('TaskDetails', { taskId: notification.taskId });
    }
    // Navigate to HomeScreen if project notification
    else if (notification.projectId) {
      console.log('📁 Navigating to HomeScreen');
      navigation.navigate('HomeScreen');
    }
    // Navigate to CalenderScreen if event notification
    else if (notification.eventId) {
      console.log('📅 Navigating to CalenderScreen from event notification');
      navigation.navigate('CalenderScreen');
    }
    // Navigate to UserChatScreen if message notification
    else if (notification.conversationId) {
      console.log('💬 Navigating to UserChatScreen from message notification with conversationId:', notification.conversationId);
      const conversationType = notification.conversationType || notification.type || 'private'; // NOTE: Ensure chat screen knows if this is group vs private.
      navigation.navigate('UserChatScreen', {
        conversationId: notification.conversationId,
        userName: notification.fromUserName || 'User',
        type: conversationType,
      });
    }
  };
  
  // Load notifications when screen opens
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Hide red dot when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔔 NotificationScreen focused - hiding red dot');
      // The red dot will be hidden automatically when user navigates to notifications
      // This is handled in CustomBottomNav's navigateToNotifications function
    }, [])
  );

  // --- Pusher Real-time Notification Listener (MCP Context 7) ---
  // Business Rule: Listen for new task assignment notifications
  useEffect(() => {
    if (!currentUserId) {
      console.log('⚠️ No user ID available for Pusher channel');
      return;
    }

    // Create channel name matching backend: `user-notifications-${assignedToUserId}`
    const channelName = `user-notifications-${currentUserId}`;
    console.log('🔔 Setting up Pusher listener for channel:', channelName);
     console.log('🔌 Pusher connection state:', pusher.connection.state);
    console.log('✅ Pusher is connected:', pusher.connection.state === 'connected');
    
    // Subscribe to user-specific notification channel
    const channel = pusher.subscribe(channelName);
    
    // Unified listener for all assignment types (task, project, event, message)
    const handleNewAssignment = async (data, assignmentType) => {
      console.log(`🔔 NEW ${assignmentType.toUpperCase()} ASSIGNMENT NOTIFICATION RECEIVED:`, data);
      
      // Fix: Handle array format from Pusher - extract first item if array
      let notificationData = data;
      if (Array.isArray(data) && data.length > 0) {
        notificationData = data[0];
        console.log('📦 Data was array, extracted object:', notificationData);
      }
      
      // Add new notification to the list
      setApiNotifications(prevNotifications => {
        // Check if notification already exists to avoid duplicates
        const exists = prevNotifications.some(notif => notif.id === notificationData.id);
        
        if (exists) {
          console.log(`📝 ${assignmentType} notification already exists (ID: ${notificationData.id}), skipping duplicate`);
          return prevNotifications;
        }
        
        // Add new notification to the beginning of the list
        const newNotifications = [notificationData, ...prevNotifications];
        console.log(`✅ New ${assignmentType} notification added to list:`, newNotifications.length);
        return newNotifications;
      });
      
      // Auto-mark all notifications as read when new notification arrives
      try {
        console.log('🔔 AUTO CALLING API TO MARK ALL NOTIFICATIONS AS READ (from Pusher)');
        await markAllRead();
        console.log('✅ ALL NOTIFICATIONS AUTO-MARKED AS READ (from Pusher)');
      } catch (markError) {
        console.error('❌ Error auto-marking notifications as read (from Pusher):', markError);
        // Don't throw error - notification was added successfully
      }
    };

    // Listen for new task assignment events
    channel.bind('new-task-assignment', (data) => handleNewAssignment(data, 'task'));

    // Listen for new project assignment events
    channel.bind('new-project-assignment', (data) => handleNewAssignment(data, 'project'));

    // Listen for new event assignment events
    channel.bind('new-event-assignment', (data) => handleNewAssignment(data, 'event'));
    
    // Listen for new message events
    channel.bind('new-message', (data) => handleNewAssignment(data, 'message'));

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      console.log('🧹 Unsubscribing from Pusher channel:', channelName);
      pusher.unsubscribe(channelName);
    };
  }, [currentUserId]);
  
  // Console logs
  console.log('API Notifications:', apiNotifications);

  return (
    <View className="flex-1 bg-white">
      {loading ? (
        <View className="flex-1 justify-center items-center p-5 min-h-[100px]">
          <Text className="text-base text-gray-500 font-medium">Loading notifications...</Text>
        </View>
      ) : apiNotifications.length === 0 ? (
        <View className="flex-1 justify-center items-center px-10">
          <Text className="text-6xl mb-4">🔔</Text>
          <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">No Notifications</Text>
          <Text className="text-base text-gray-500 text-center leading-6">You're all caught up!</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        >
            {apiNotifications.map((notification) => (
            <TouchableOpacity key={notification.id} onPress={() => handleNotificationTap(notification)} activeOpacity={0.7}>
              <View className="bg-white p-5 mt-2 mb-4 rounded-2xl shadow-lg border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-full bg-black justify-center items-center mr-4">
                  <Text className="text-white text-lg font-bold">
                    {notification.fromUserName ? notification.fromUserName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800 mb-1">{notification.fromUserName}</Text>
                  {notification.projectName && (
                    <Text className="text-sm text-gray-500 font-medium">Project: {notification.projectName}</Text>
                  )}
                </View>
                {/* Delete Icon */}
                <TouchableOpacity 
                  className="p-2"
                  onPress={() => handleDeleteNotification(notification.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              {/* Title Section */}
              {notification.title && (
                <Text className="text-xl font-bold text-gray-900 mb-2">{notification.title}</Text>
              )}
              <Text className="text-base text-gray-700 leading-6 mb-4 font-normal">{notification.message}</Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-gray-400 font-medium">
                  {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Just now'}
                </Text>
              </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      {/* Custom Bottom Navigation */}
      <CustomBottomNav 
        hideFAB={true}
      />
    </View>
  );
}

