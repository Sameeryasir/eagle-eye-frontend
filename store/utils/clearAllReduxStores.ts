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
    
    // Clear all project data, errors, loading states, and caches
    store.dispatch(resetProjectsState());
    await clearProjectsCache();
    
    // Clear all task data, errors, and loading states
    store.dispatch(resetTasksState());
    
    // Reset entire logs state to initial state (clears logs, errors, loading, cache, etc.)
    store.dispatch(resetLogsState());
    
    // TODO: Add other slices here as needed (notifications, events, etc.)
    // Example:
    // store.dispatch(resetNotificationsState());
    
  } catch (error) {
    console.error('❌ Error clearing Redux stores:', error);
    // Don't throw - we want logout to continue even if clearing fails
  }
};

export default clearAllReduxStores;

