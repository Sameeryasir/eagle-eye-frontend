// @ts-nocheck
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getLogs } from '../../services/log/getLogs';
import { getLogsForOwnerRecent } from '../../services/log/getLogsForOwnerRecent';
import { getErrorMessage } from '../../services/api/errors';
import { mapLogsToUi } from '../../services/api/mappers/logs';

export const fetchLogsByProjectId = createAsyncThunk(
  'logs/fetchLogsByProjectId',
  async (projectId, { rejectWithValue }) => {
    try {
      const logs = await getLogs(projectId);
      return mapLogsToUi(logs);
    } catch (error) {
      console.error('logSlice - Error fetching logs:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch logs'));
    }
  }
);

export const fetchRecentLogsForOwner = createAsyncThunk(
  'logs/fetchRecentLogsForOwner',
  async (projectId, { rejectWithValue }) => {
    try {
      const logs = await getLogsForOwnerRecent(projectId);
      return mapLogsToUi(logs);
    } catch (error) {
      console.error('logSlice - Error fetching recent logs:', error);
      return rejectWithValue(
        getErrorMessage(error, 'Failed to fetch recent logs')
      );
    }
  }
);

const initialState = {
  logs: [],
  loading: false,
  error: null,
  currentProjectId: null,
};

const logSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    clearLogs: (state) => {
      state.logs = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentProjectId: (state, action) => {
      state.currentProjectId = action.payload;
    },
    setLogsForProject: (state, action) => {
      const { projectId, logs } = action.payload || {};
      state.logs = Array.isArray(logs) ? logs : [];
      state.loading = false;
      state.error = null;
      if (projectId != null) {
        state.currentProjectId = projectId;
      }
    },
    resetLogsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogsByProjectId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLogsByProjectId.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
      })
      .addCase(fetchLogsByProjectId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchRecentLogsForOwner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentLogsForOwner.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
      })
      .addCase(fetchRecentLogsForOwner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearLogs,
  clearError,
  setCurrentProjectId,
  setLogsForProject,
  resetLogsState,
} = logSlice.actions;

export const selectLogState = (state) => state.logs;
export const selectLogs = (state) => state.logs.logs;
export const selectLogLoading = (state) => state.logs.loading;
export const selectLogError = (state) => state.logs.error;
export const selectCurrentProjectId = (state) => state.logs.currentProjectId;

export default logSlice.reducer;
