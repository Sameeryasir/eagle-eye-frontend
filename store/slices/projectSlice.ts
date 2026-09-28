// @ts-nocheck
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyProjects } from '../../services/projects/getProjectsByLoginUserId';
import { createProject as createProjectService } from '../../services/projects/createProject';
import { updateProjectById } from '../../services/projects/updateProjectById';
import { deleteProjectById } from '../../services/projects/deleteProjectById';
import { getSessionUserId } from '../../services/auth/session';
import { getErrorMessage } from '../../services/api/errors';

const CACHE_KEY_PREFIX = 'projects_cache_';
const CACHE_TTL = 10 * 60 * 1000;

const getCacheKey = async () => {
  try {
    const userId = await getSessionUserId();
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

const storeProjectsCache = async (projects) => {
  try {
    const cacheKey = await getCacheKey();
    if (!cacheKey) return;
    
    const cacheData = {
      data: projects,
      timestamp: Date.now(),
      userId: await getSessionUserId(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('💾 Projects cached successfully for user');
  } catch (error) {
    console.error('Error storing projects cache:', error);
  }
};

const getProjectsCache = async () => {
  try {
    const cacheKey = await getCacheKey();
    if (!cacheKey) return null;
    
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (!cachedData) return null;

    const { data, timestamp, userId } = JSON.parse(cachedData);
    
    const currentUserId = await getSessionUserId();
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

export const clearProjectsCache = async () => {
  try {
    const cacheKey = await getCacheKey();
    if (cacheKey) {
      await AsyncStorage.removeItem(cacheKey);
      console.log('🗑️ Projects cache cleared for current user');
    }
    
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

export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const cachedProjects = await getProjectsCache();
      if (cachedProjects) {
        dispatch(setCacheStatus(true));
        return cachedProjects;
      }

      console.log('🌐 Fetching projects from API...');
      const projects = await getMyProjects();
      
      await storeProjectsCache(projects);
      
      dispatch(setCacheStatus(false));
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      
      const cachedProjects = await getProjectsCache();
      if (cachedProjects) {
        console.log('📱 API failed, using cached data as fallback');
        dispatch(setCacheStatus(true));
        return cachedProjects;
      }
      
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch projects'));
    }
  }
);

export const refreshProjects = createAsyncThunk(
  'projects/refreshProjects',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Refreshing projects data...');
      
      await clearProjectsCache();
      
      const projects = await getMyProjects();
      
      await storeProjectsCache(projects);
      
      console.log('✅ Projects data refreshed successfully');
      return projects;
    } catch (error) {
      console.error('Error refreshing projects:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to refresh projects'));
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      const newProject = await createProjectService(projectData);
      
      await clearProjectsCache();
      
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to create project'));
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async (
    { projectId, projectData }: { projectId: any; projectData: any },
    { rejectWithValue }
  ) => {
    try {
      const updatedProject = await updateProjectById(projectId, projectData);
      
      await clearProjectsCache();
      
      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to update project'));
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { rejectWithValue }) => {
    try {
      await deleteProjectById(projectId);
      
      await clearProjectsCache();
      
      return projectId;
    } catch (error) {
      console.error('Error deleting project:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to delete project'));
    }
  }
);

const initialState = {
  projects: [],
  
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  refreshing: false,
  
  error: null,
  createError: null,
  updateError: null,
  deleteError: null,
  refreshError: null,
  
  isFromCache: false,
  lastFetchTime: null,
  cacheExpiryTime: null,
};

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
        state.isFromCache = false;
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
        state.projects.unshift(action.payload);
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
        
        state.projects = state.projects.filter(project => project.id !== projectId);
        
        state.deleteError = null;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
      });
  },
});

export const {
  clearError,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  clearRefreshError,
  setCacheStatus,
  resetProjectsState,
} = projectSlice.actions;

export default projectSlice.reducer;

export const selectProjectState = (state) => state.projects;
export const selectProjects = (state) => state.projects.projects;
export const selectProjectLoading = (state) => state.projects.loading;
export const selectProjectError = (state) => state.projects.error;

export const selectIsFromCache = (state) => state.projects.isFromCache;
export const selectCacheExpiryTime = (state) => state.projects.cacheExpiryTime;
export const selectIsCacheExpired = (state) => {
  const expiryTime = state.projects.cacheExpiryTime;
  return expiryTime ? Date.now() > expiryTime : true;
};

export const selectIsRefreshing = (state) => state.projects.refreshing;
export const selectIsCreating = (state) => state.projects.creating;
export const selectIsUpdating = (state) => state.projects.updating;
export const selectIsDeleting = (state) => state.projects.deleting;
