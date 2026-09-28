// This utility can be called from anywhere (including AuthContext) to ensure clean logout

import { store } from '../index';
import { resetProjectsState, clearProjectsCache } from '../slices/projectSlice';
import { resetTasksState } from '../slices/taskSlice';
import { resetLogsState } from '../slices/logSlice';

/**
 * Clear all Redux stores and caches on logout
 * This ensures no user data persists between sessions
 * 
 * @returns {Promise<void>}
 */
export const clearAllReduxStores = async () => {
  try {
    console.log('🧹 Clearing all Redux stores and caches...');
    
    // Clear all project data, errors, loading states, and caches
    store.dispatch(resetProjectsState());
    await clearProjectsCache();
    console.log('✅ Projects Redux state and cache cleared');
    
    // Clear all task data, errors, and loading states
    store.dispatch(resetTasksState());
    console.log('✅ Tasks Redux state cleared');
    
    // Reset entire logs state to initial state (clears logs, errors, loading, cache, etc.)
    store.dispatch(resetLogsState());
    console.log('✅ Logs Redux state cleared');
    
    // TODO: Add other slices here as needed (notifications, events, etc.)
    // Example:
    // store.dispatch(resetNotificationsState());
    
    console.log('✅ All Redux stores cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing Redux stores:', error);
    // Don't throw - we want logout to continue even if clearing fails
  }
};

export default clearAllReduxStores;

