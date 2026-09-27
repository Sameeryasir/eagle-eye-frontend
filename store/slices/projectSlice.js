// Centralized state management for all project operations (CRUD)
// This slice handles loading states, error handling, data management, and caching
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import individual project services from their respective files
import { getMyProjects } from '../../services/projects/getProjectsByLoginUserId';
import { createProject as createProjectService } from '../../services/projects/createProject';
import { updateProjectById } from '../../services/projects/updateProjectById';
import { deleteProjectById } from '../../services/projects/deleteProjectById';

// Cache settings for offline-first approach and performance optimization
// User-specific cache to prevent data leakage between users
const CACHE_KEY_PREFIX = 'projects_cache_';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache time-to-live

// Utility functions for managing cached project data with user association

// Get user-specific cache key
const getCacheKey = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      console.warn('⚠️ No userId found, cannot create user-specific cache key');
      return null;
    }
    return `${CACHE_KEY_PREFIX}${userId}`;
  } catch (error) {
    console.error('Error getting cache key:', error);
    return null;
  }
};

// Store projects data in cache with timestamp (user-specific)
const storeProjectsCache = async (projects) => {
  try {
    const cacheKey = await getCacheKey();
    if (!cacheKey) return; // Skip caching if no user ID
    
    const cacheData = {
      data: projects,
      timestamp: Date.now(),
      userId: await AsyncStorage.getItem('userId') // Store userId for validation
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('💾 Projects cached successfully for user');
  } catch (error) {
    console.error('Error storing projects cache:', error);
  }
};

// Retrieve projects data from cache if still valid (user-specific)
const getProjectsCache = async () => {
  try {
    const cacheKey = await getCacheKey();
    if (!cacheKey) return null;
    
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (!cachedData) return null;

    const { data, timestamp, userId } = JSON.parse(cachedData);
    
    // Validate that cache belongs to current user
    const currentUserId = await AsyncStorage.getItem('userId');
    if (userId !== currentUserId) {
      console.log('⚠️ Cache belongs to different user, clearing...');
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    
    const isExpired = Date.now() - timestamp > CACHE_TTL;
    
    if (isExpired) {
      console.log('⏰ Projects cache expired, removing...');
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    console.log('📱 Using cached projects data for current user');
    return data;
  } catch (error) {
    console.error('Error retrieving projects cache:', error);
    return null;
  }
};

// Clear projects cache for current user (used when data is modified)
export const clearProjectsCache = async () => {
  try {
    const cacheKey = await getCacheKey();
    if (cacheKey) {
      await AsyncStorage.removeItem(cacheKey);
      console.log('🗑️ Projects cache cleared for current user');
    }
    
    // Also clear any old cache keys (cleanup for all users)
    // This ensures no leftover cache from previous users
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const oldCacheKeys = allKeys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      if (oldCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(oldCacheKeys);
        console.log('🗑️ Cleared old project caches:', oldCacheKeys.length);
      }
    } catch (error) {
      console.error('Error clearing old caches:', error);
    }
  } catch (error) {
    console.error('Error clearing projects cache:', error);
  }
};

// These handle API calls and automatically manage loading/error states

// Fetch all projects for the logged-in user with caching
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // First, try to get cached data
      const cachedProjects = await getProjectsCache();
      if (cachedProjects) {
        // Set cache status to true when using cached data
        dispatch(setCacheStatus(true));
        return cachedProjects;
      }

      // If no valid cache, fetch from API
      console.log('🌐 Fetching projects from API...');
      const projects = await getMyProjects();
      
      // Store in cache for future use
      await storeProjectsCache(projects);
      
      // Set cache status to false when using fresh API data
      dispatch(setCacheStatus(false));
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      
      // If API fails, try to return cached data as fallback
      const cachedProjects = await getProjectsCache();
      if (cachedProjects) {
        console.log('📱 API failed, using cached data as fallback');
        dispatch(setCacheStatus(true));
        return cachedProjects;
      }
      
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch projects');
    }
  }
);

// Refresh projects data (bypass cache and fetch fresh data)
export const refreshProjects = createAsyncThunk(
  'projects/refreshProjects',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Refreshing projects data...');
      
      // Clear cache first
      await clearProjectsCache();
      
      // Fetch fresh data from API
      const projects = await getMyProjects();
      
      // Store fresh data in cache
      await storeProjectsCache(projects);
      
      console.log('✅ Projects data refreshed successfully');
      return projects;
    } catch (error) {
      console.error('Error refreshing projects:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to refresh projects');
    }
  }
);

// Create a new project
export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      const newProject = await createProjectService(projectData);
      
      // Clear cache since data has been modified
      await clearProjectsCache();
      
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to create project');
    }
  }
);

// Update an existing project
export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, projectData }, { rejectWithValue }) => {
    try {
      const updatedProject = await updateProjectById(projectId, projectData);
      
      // Clear cache since data has been modified
      await clearProjectsCache();
      
      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to update project');
    }
  }
);

// Delete a project
export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { rejectWithValue }) => {
    try {
      await deleteProjectById(projectId);
      
      // Clear cache since data has been modified
      await clearProjectsCache();
      
      return projectId; // Return the ID of the deleted project
    } catch (error) {
      console.error('Error deleting project:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete project');
    }
  }
);

// Clean, well-structured initial state with clear separation of concerns
const initialState = {
  // Data
  projects: [],
  
  // Loading states
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  refreshing: false,
  
  // Error handling
  error: null,
  createError: null,
  updateError: null,
  deleteError: null,
  refreshError: null,
  
  // Cache state
  isFromCache: false,
  lastFetchTime: null,
  cacheExpiryTime: null,
};

// Redux slice with reducers for synchronous state updates
const projectSlice = createSlice({
  name: 'projects',
  initialState,
  
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    clearCreateError: (state) => {
      state.createError = null;
    },
    
    clearUpdateError: (state) => {
      state.updateError = null;
    },
    
    clearDeleteError: (state) => {
      state.deleteError = null;
    },
    
    clearRefreshError: (state) => {
      state.refreshError = null;
    },
    
    setCacheStatus: (state, action) => {
      state.isFromCache = action.payload;
    },
    
    resetProjectsState: () => initialState,
  },
  
  // Handle all the different states of async operations (pending, fulfilled, rejected)
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
        state.error = null;
        state.lastFetchTime = Date.now();
        state.cacheExpiryTime = Date.now() + CACHE_TTL;
        // Note: isFromCache will be set by the thunk logic
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(refreshProjects.pending, (state) => {
        state.refreshing = true;
        state.refreshError = null;
      })
      .addCase(refreshProjects.fulfilled, (state, action) => {
        state.refreshing = false;
        state.projects = action.payload;
        state.refreshError = null;
        state.lastFetchTime = Date.now();
        state.cacheExpiryTime = Date.now() + CACHE_TTL;
        state.isFromCache = false; // Fresh data from API
      })
      .addCase(refreshProjects.rejected, (state, action) => {
        state.refreshing = false;
        state.refreshError = action.payload;
      })
      
      .addCase(createProject.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.creating = false;
        state.projects.unshift(action.payload); // Add to beginning of array
        state.createError = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload;
      })
      
      .addCase(updateProject.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.projects.findIndex(project => project.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        state.updateError = null;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
      })
      
      .addCase(deleteProject.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.deleting = false;
        const projectId = action.payload;
        
        // Remove from projects array
        state.projects = state.projects.filter(project => project.id !== projectId);
        
        state.deleteError = null;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
      });
  },
});

// Export all actions for use in components
export const {
  clearError,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  clearRefreshError,
  setCacheStatus,
  resetProjectsState,
} = projectSlice.actions;

// Export the reducer for store configuration
export default projectSlice.reducer;

// These provide easy access to specific parts of the state
// Usage: const { projects, loading } = useSelector(selectProjectState);
export const selectProjectState = (state) => state.projects;
export const selectProjects = (state) => state.projects.projects;
export const selectProjectLoading = (state) => state.projects.loading;
export const selectProjectError = (state) => state.projects.error;

// Cache-related selectors
export const selectIsFromCache = (state) => state.projects.isFromCache;
export const selectCacheExpiryTime = (state) => state.projects.cacheExpiryTime;
export const selectIsCacheExpired = (state) => {
  const expiryTime = state.projects.cacheExpiryTime;
  return expiryTime ? Date.now() > expiryTime : true;
};

// Loading state selectors
export const selectIsRefreshing = (state) => state.projects.refreshing;
export const selectIsCreating = (state) => state.projects.creating;
export const selectIsUpdating = (state) => state.projects.updating;
export const selectIsDeleting = (state) => state.projects.deleting;
