import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getNotificationforCurrentUser } from '../services/inAppNotification/getNotificationforCurrentUser';
import { markAllRead } from '../services/inAppNotification/markAllRead';
import { useAuth } from '../context/AuthContext';
import pusher from '../pusherClient';
import CustomBottomNav from './components/CustomBottomNav';

export default function NotificationScreen() {
  const [apiNotifications, setApiNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  
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
    
    // Unified listener for all assignment types (task, project, event)
    const handleNewAssignment = (data, assignmentType) => {
      console.log(`🔔 NEW ${assignmentType.toUpperCase()} ASSIGNMENT NOTIFICATION RECEIVED:`, data);
      
      // Add new notification to the list
      setApiNotifications(prevNotifications => {
        // Check if notification already exists to avoid duplicates
        const exists = prevNotifications.some(notif => 
          notif.id === data.id || 
          (assignmentType === 'task' && notif.taskId === data.taskId && notif.fromUserId === data.fromUserId) ||
          (assignmentType === 'project' && notif.projectIds && data.projectIds && notif.projectIds.some(pid => data.projectIds.includes(pid))) ||
          (assignmentType === 'event' && notif.eventId === data.eventId && notif.fromUserId === data.fromUserId)
        );
        
        if (exists) {
          console.log(`📝 ${assignmentType} notification already exists, skipping duplicate`);
          return prevNotifications;
        }
        
        // Add new notification to the beginning of the list
        const newNotifications = [data, ...prevNotifications];
        console.log(`✅ New ${assignmentType} notification added to list:`, newNotifications.length);
        return newNotifications;
      });
    };

    // Listen for new task assignment events
    channel.bind('new-task-assignment', (data) => handleNewAssignment(data, 'task'));

    // Listen for new project assignment events
    channel.bind('new-project-assignment', (data) => handleNewAssignment(data, 'project'));

    // Listen for new event assignment events
    channel.bind('new-event-assignment', (data) => handleNewAssignment(data, 'event'));

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
            <View key={notification.id} className="bg-white p-5 mt-2 mb-4 rounded-2xl shadow-lg border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-full bg-blue-500 justify-center items-center mr-4 shadow-md">
                  <Text className="text-white text-lg font-bold">
                    {notification.fromUserName ? notification.fromUserName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800 mb-1">{notification.fromUserName}</Text>
                  {notification.projectName && (
                    <Text className="text-sm text-gray-500 font-medium">{notification.projectName}</Text>
                  )}
                </View>
              </View>
              <Text className="text-base text-gray-700 leading-6 mb-4 font-normal">{notification.message}</Text>
              <View className="flex-row justify-between items-center">
                {notification.taskName && (
                  <Text className="text-xs text-gray-400 italic font-medium">Task: {notification.taskName}</Text>
                )}
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

