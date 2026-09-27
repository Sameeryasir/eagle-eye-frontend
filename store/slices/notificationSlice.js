// Redux slice for managing in-app notifications

import { createSlice, createSelector } from '@reduxjs/toolkit';

const initialState = {
  notifications: [], // Array of all notifications
  isLoading: false,  // Loading state for future API calls
  error: null,       // Error state
  lastUpdated: null  // Timestamp of last update
};

const generateId = () => {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const newNotification = {
        id: action.payload.id || generateId(),
        type: action.payload.type || 'general',
        title: action.payload.title || 'Notification',
        message: action.payload.message || '',
        taskId: action.payload.taskId || null,
        projectId: action.payload.projectId || null,
        fromUserId: action.payload.fromUserId || null,
        fromUserName: action.payload.fromUserName || 'Unknown User',
        assignedToUserId: action.payload.assignedToUserId || null,
        timestamp: action.payload.timestamp || new Date().toISOString(),
        priority: action.payload.priority || 'medium',
        metadata: action.payload.metadata || {}
      };

      // Add to beginning of array (newest first)
      state.notifications.unshift(newNotification);
      
      // Update last updated timestamp
      state.lastUpdated = new Date().toISOString();
      
      // Clear any previous errors
      state.error = null;
    },

    markAsRead: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      
      if (notification) {
        // For now, just update timestamp when marked as read
        state.lastUpdated = new Date().toISOString();
      }
    },

    markAllAsRead: (state) => {
      state.lastUpdated = new Date().toISOString();
    },

    removeNotification: (state, action) => {
      const notificationId = action.payload;
      
      // Remove notification from array
      state.notifications = state.notifications.filter(n => n.id !== notificationId);
      state.lastUpdated = new Date().toISOString();
    },

    clearAllNotifications: (state) => {
      state.notifications = [];
      state.lastUpdated = new Date().toISOString();
    },

    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    fetchNotifications: (state, action) => {
      state.notifications = action.payload || [];
      state.lastUpdated = new Date().toISOString();
      state.isLoading = false;
      state.error = null;
    }
  }
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  setLoading,
  setError,
  clearError,
  fetchNotifications
} = notificationSlice.actions;

// Base selector for all notifications
const selectAllNotifications = (state) => state.notifications.notifications;

// Memoized selector for notifications by user
export const selectNotificationsForUser = createSelector(
  [selectAllNotifications, (state, userId) => userId],
  (notifications, userId) => {
    if (!userId) return [];
    return notifications.filter(n => n.assignedToUserId === userId);
  }
);

// Memoized selector for notifications by type
export const selectNotificationsByType = createSelector(
  [selectAllNotifications, (state, type) => type],
  (notifications, type) => notifications.filter(n => n.type === type)
);

// Memoized selector for user notifications by type
export const selectUserNotificationsByType = createSelector(
  [selectAllNotifications, (state, userId, type) => ({ userId, type })],
  (notifications, { userId, type }) => 
    notifications.filter(n => n.assignedToUserId === userId && n.type === type)
);

// Simple selectors (no memoization needed for primitive values)
export const selectNotificationLoading = (state) => state.notifications.isLoading;
export const selectNotificationError = (state) => state.notifications.error;
export const selectLastUpdated = (state) => state.notifications.lastUpdated;

// Export the base selector as well
export { selectAllNotifications };

export default notificationSlice.reducer;
