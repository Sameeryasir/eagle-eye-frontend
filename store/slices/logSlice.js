// --- Log Redux Slice (MCP Context 7) ---
// Centralized state management for logs using Redux Toolkit
// This follows MCP Context 7 best practices for clean, maintainable state management

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getLogs } from '../../services/log/getLogs';
import { getLogsForOwnerRecent } from '../../services/log/getLogsForOwnerRecent';

// --- Async Thunks for Log Operations (MCP Context 7) ---
// Business Rule: All log operations go through Redux for consistent state management

// Fetch logs for a specific project
export const fetchLogsByProjectId = createAsyncThunk(
  'logs/fetchLogsByProjectId',
  async (projectId, { rejectWithValue }) => {
    try {
      console.log('logSlice - Fetching logs for project:', projectId);
      const response = await getLogs(projectId);
      
      // Handle different response formats
      let logsArray = [];
      if (response?.logs && Array.isArray(response.logs)) {
        logsArray = response.logs;
      } else if (Array.isArray(response)) {
        logsArray = response;
      } else {
        console.log('logSlice - No logs found in response:', response);
        return [];
      }

      // Transform logs data to match the expected format
      const transformedLogs = logsArray.map(log => ({
        id: log.id,
        createdBy: log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'Unknown User',
        date: log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A',
        createdAt: log.createdAt, // Preserve original createdAt for filtering
        description: log.note || 'No description',
        images: log.images || [], // Keep all images for the log
        image: log.images && log.images.length > 0 ? { uri: log.images[0].imageUrl } : null,
      }));

      // Sort logs by date (newest first)
      const sortedLogs = transformedLogs.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      console.log('logSlice - Transformed and sorted logs:', sortedLogs.length);
      return sortedLogs;
    } catch (error) {
      console.error('logSlice - Error fetching logs:', error);
      return rejectWithValue(error.message || 'Failed to fetch logs');
    }
  }
);

// Fetch recent logs for owner
export const fetchRecentLogsForOwner = createAsyncThunk(
  'logs/fetchRecentLogsForOwner',
  async (_, { rejectWithValue }) => {
    try {
      console.log('logSlice - Fetching recent logs for owner');
      const response = await getLogsForOwnerRecent();
      
      // Handle different response formats
      let logsArray = [];
      if (response?.logs && Array.isArray(response.logs)) {
        logsArray = response.logs;
      } else if (Array.isArray(response)) {
        logsArray = response;
      } else {
        console.log('logSlice - No recent logs found in response:', response);
        return [];
      }

      // Transform logs data to match the expected format
      const transformedLogs = logsArray.map(log => ({
        id: log.id,
        createdBy: log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'Unknown User',
        date: log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A',
        createdAt: log.createdAt,
        description: log.note || 'No description',
        images: log.images || [],
        image: log.images && log.images.length > 0 ? { uri: log.images[0].imageUrl } : null,
      }));

      // Sort logs by date (newest first)
      const sortedLogs = transformedLogs.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      console.log('logSlice - Transformed and sorted recent logs:', sortedLogs.length);
      return sortedLogs;
    } catch (error) {
      console.error('logSlice - Error fetching recent logs:', error);
      return rejectWithValue(error.message || 'Failed to fetch recent logs');
    }
  }
);

// --- Initial State (MCP Context 7) ---
// Business Rule: Clear initial state for predictable behavior
const initialState = {
  logs: [],
  loading: false,
  error: null,
  currentProjectId: null,
  
  // --- Project-based Caching (MCP Context 7) ---
  // Cache logs by project ID for better performance and offline support
  logsByProject: {}, // { projectId: { logs: [], timestamp: number, isFromCache: boolean } }
};

// --- Log Slice (MCP Context 7) ---
// Business Rule: All log state changes go through Redux reducers
const logSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    // Clear logs state
    clearLogs: (state) => {
      state.logs = [];
      state.loading = false;
      state.error = null;
    },
    
    // Clear error state
    clearError: (state) => {
      state.error = null;
    },
    
    // Set current project ID
    setCurrentProjectId: (state, action) => {
      state.currentProjectId = action.payload;
    },
    
    // --- Reset Actions (MCP Context 7) ---
    // Business Rule: Reset entire logs state to initial state on logout
    resetLogsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Logs by Project ID ---
      .addCase(fetchLogsByProjectId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLogsByProjectId.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
        state.error = null;
      })
      .addCase(fetchLogsByProjectId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.logs = [];
      })
      
      // --- Fetch Recent Logs for Owner ---
      .addCase(fetchRecentLogsForOwner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentLogsForOwner.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
        state.error = null;
      })
      .addCase(fetchRecentLogsForOwner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.logs = [];
      });
  },
});

// --- Export Actions (MCP Context 7) ---
// Business Rule: Export all actions for use in components
export const { clearLogs, clearError, setCurrentProjectId, resetLogsState } = logSlice.actions;

// --- Export Selectors (MCP Context 7) ---
// Business Rule: Provide selectors for easy state access
export const selectLogState = (state) => state.logs;
export const selectLogs = (state) => state.logs.logs;
export const selectLogLoading = (state) => state.logs.loading;
export const selectLogError = (state) => state.logs.error;
export const selectCurrentProjectId = (state) => state.logs.currentProjectId;

// --- Export Reducer (MCP Context 7) ---
// Business Rule: Export reducer for store configuration
export default logSlice.reducer;
