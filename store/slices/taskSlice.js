// Centralized state management for all task operations (CRUD)
// This slice handles loading states, error handling, and data management
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// Import individual task services from their respective files
import { createTask } from '../../services/tasks/createTask';
import { updateTask } from '../../services/tasks/updateTaskById';
import { deleteTaskById } from '../../services/tasks/deleteTaskById';
import { getTaskById } from '../../services/tasks/getTaskById';
import getAllTasks from '../../services/tasks/getAllTasks';
import getTasksByloginId from '../../services/tasks/getTasksByloginId';
import getTodaysTask from '../../services/tasks/getTodayTask';
import { assignTaskToUser } from '../../services/tasks/assignTask';
import { getTaskByProjectId } from '../../services/tasks/getTaskByProjectId';
import { getTasksAssignedToEmployees } from '../../services/tasks/getTasksAssignedToEmployees';
import { getEmployeesToAssignTasks } from '../../services/tasks/getEmployeeToAssingeTasks';
import { filterTask } from '../../services/tasks/filterTask';

// These handle API calls and automatically manage loading/error states

// Fetch all tasks for the logged-in user
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getTasksByloginId();
      // Normalize response format like project slice
      if (Array.isArray(response)) {
        return response;
      } else if (response?.tasks && Array.isArray(response.tasks)) {
        return response.tasks;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tasks');
    }
  }
);

// Fetch all tasks (admin/manager view)
export const fetchAllTasks = createAsyncThunk(
  'tasks/fetchAllTasks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAllTasks();
      // Normalize response format like project slice
      if (response?.data && Array.isArray(response.data)) {
        return response.data;
      } else if (Array.isArray(response)) {
        return response;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch all tasks');
    }
  }
);

// Fetch tasks by project ID
export const fetchTasksByProjectId = createAsyncThunk(
  'tasks/fetchTasksByProjectId',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await getTaskByProjectId(projectId);
      // Normalize response format like project slice
      if (response?.tasks && Array.isArray(response.tasks)) {
        return response.tasks;
      } else if (Array.isArray(response)) {
        return response;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching tasks by project ID:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tasks by project');
    }
  }
);

// Fetch today's tasks
export const fetchTodaysTasks = createAsyncThunk(
  'tasks/fetchTodaysTasks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getTodaysTask();
      // Normalize response format like project slice
      if (Array.isArray(response)) {
        return response;
      } else if (response?.tasks && Array.isArray(response.tasks)) {
        return response.tasks;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching today\'s tasks:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch today\'s tasks');
    }
  }
);

// Fetch a single task by ID
export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (taskId, { rejectWithValue }) => {
    try {
      const task = await getTaskById(taskId);
      return task;
    } catch (error) {
      console.error('Error fetching task by ID:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch task');
    }
  }
);

// Create a new task
export const createNewTask = createAsyncThunk(
  'tasks/createNewTask',
  async (taskData, { rejectWithValue }) => {
    try {
      const newTask = await createTask(taskData);
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to create task');
    }
  }
);

// Update an existing task
export const updateExistingTask = createAsyncThunk(
  'tasks/updateExistingTask',
  async ({ taskId, taskData }, { rejectWithValue }) => {
    try {
      const updatedTask = await updateTask(taskId, taskData);
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to update task');
    }
  }
);

// Delete a task
export const deleteExistingTask = createAsyncThunk(
  'tasks/deleteExistingTask',
  async (taskId, { rejectWithValue }) => {
    try {
      await deleteTaskById(taskId);
      return taskId; // Return the ID of the deleted task
    } catch (error) {
      console.error('Error deleting task:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete task');
    }
  }
);

// Assign task to user
export const assignTaskToUserAction = createAsyncThunk(
  'tasks/assignTaskToUserAction',
  async ({ taskId, userId }, { rejectWithValue }) => {
    try {
      const result = await assignTaskToUser(taskId, userId);
      
      console.log('🔧 assignTaskToUserAction - API Response:', result);
      
      // Validate the response structure
      if (result && typeof result === 'object') {
        // Return the complete response for Redux state update
        return { taskId, userId, result };
      } else {
        console.warn('⚠️ Unexpected API response format:', result);
        // Return minimal data if API response is unexpected
        return { taskId, userId, result: { assignedToUserId: userId } };
      }
    } catch (error) {
      console.error('❌ Error assigning task:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to assign task');
    }
  }
);

// Filter tasks
export const filterTasks = createAsyncThunk(
  'tasks/filterTasks',
  async ({ filters, projectId }, { rejectWithValue }) => {
    try {
      // Call backend filtering service
      const backendFilteredTasks = await filterTask(filters, projectId);
      
      // Apply client-side filters
      const fullyFilteredTasks = applyClientSideFilters(backendFilteredTasks || [], filters);
      
      return fullyFilteredTasks;
    } catch (error) {
      console.error('Error filtering tasks:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to filter tasks');
    }
  }
);

// Fetch tasks assigned to employees (manager view)
export const fetchTasksAssignedToEmployees = createAsyncThunk(
  'tasks/fetchTasksAssignedToEmployees',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getTasksAssignedToEmployees();
      // Normalize response format like project slice
      if (Array.isArray(response)) {
        return response;
      } else if (response?.tasks && Array.isArray(response.tasks)) {
        return response.tasks;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching tasks assigned to employees:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch assigned tasks');
    }
  }
);

// Fetch employees available for task assignment
export const fetchEmployeesForTaskAssignment = createAsyncThunk(
  'tasks/fetchEmployeesForTaskAssignment',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getEmployeesToAssignTasks();
      // Normalize response format like project slice
      if (Array.isArray(response)) {
        return response;
      } else if (response?.employees && Array.isArray(response.employees)) {
        return response.employees;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching employees for task assignment:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees');
    }
  }
);

// Clean, well-structured initial state with clear separation of concerns
const initialState = {
  // Data
  tasks: [],
  currentTask: null,
  filteredTasks: [],
  employeesForAssignment: [],
  
  // Cache tasks by project ID for better performance and offline support
  tasksByProject: {}, // { projectId: { tasks: [], timestamp: number, isFromCache: boolean } }
  currentProjectId: null,
  
  // Loading states
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  assigning: false,
  filtering: false,
  fetchingEmployees: false,
  
  // Error handling
  error: null,
  createError: null,
  updateError: null,
  deleteError: null,
  assignError: null,
  filterError: null,
  fetchEmployeesError: null,
  
  // UI state
  lastFetchTime: null,
  currentProjectId: null,
};

// Redux slice with reducers for synchronous state updates
const taskSlice = createSlice({
  name: 'tasks',
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
    
    clearAssignError: (state) => {
      state.assignError = null;
    },
    
    clearFilterError: (state) => {
      state.filterError = null;
    },
    
    clearFetchEmployeesError: (state) => {
      state.fetchEmployeesError = null;
    },
    
    resetTasksState: () => initialState,
    
    setCurrentProjectId: (state, action) => {
      state.currentProjectId = action.payload;
    },
    
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
    
    clearFilteredTasks: (state) => {
      state.filteredTasks = [];
    },
  },
  
  // Handle all the different states of async operations (pending, fulfilled, rejected)
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
        state.error = null;
        state.lastFetchTime = Date.now();
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(fetchAllTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
        state.error = null;
        state.lastFetchTime = Date.now();
      })
      .addCase(fetchAllTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(fetchTasksByProjectId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasksByProjectId.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
        state.error = null;
        state.lastFetchTime = Date.now();
      })
      .addCase(fetchTasksByProjectId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(fetchTodaysTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodaysTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
        state.error = null;
        state.lastFetchTime = Date.now();
      })
      .addCase(fetchTodaysTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(fetchTaskById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload;
        state.error = null;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(createNewTask.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createNewTask.fulfilled, (state, action) => {
        state.creating = false;
        state.tasks.unshift(action.payload); // Add to beginning of array
        state.createError = null;
      })
      .addCase(createNewTask.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload;
      })
      
      .addCase(updateExistingTask.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateExistingTask.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.tasks.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        // Update current task if it's the same
        if (state.currentTask && state.currentTask.id === action.payload.id) {
          state.currentTask = action.payload;
        }
        state.updateError = null;
      })
      .addCase(updateExistingTask.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
      })
      
      .addCase(deleteExistingTask.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deleteExistingTask.fulfilled, (state, action) => {
        state.deleting = false;
        const taskId = action.payload;
        
        // Remove from tasks array
        state.tasks = state.tasks.filter(task => task.id !== taskId);
        
        // Clear current task if it was deleted
        if (state.currentTask && state.currentTask.id === taskId) {
          state.currentTask = null;
        }
        
        state.deleteError = null;
      })
      .addCase(deleteExistingTask.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
      })
      
      .addCase(assignTaskToUserAction.pending, (state) => {
        state.assigning = true;
        state.assignError = null;
      })
      .addCase(assignTaskToUserAction.fulfilled, (state, action) => {
        state.assigning = false;
        const { taskId, userId, result } = action.payload;
        
        // Update the task in the tasks array
        const taskIndex = state.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          if (result && result.assignedTo) {
            // API returned updated task with complete assignedTo user object
            state.tasks[taskIndex] = {
              ...state.tasks[taskIndex],
              assignedTo: result.assignedTo,
              assignedToUserId: result.assignedTo?.id || userId
            };
            console.log('✅ Task assignment updated with complete user object:', result.assignedTo);
          } else {
            // Fallback: Update with userId only if API doesn't return complete user object
            state.tasks[taskIndex] = {
              ...state.tasks[taskIndex],
              assignedToUserId: userId,
              assignedTo: { id: userId } // Minimal user object
            };
            console.log('⚠️ Task assignment updated with userId only (fallback):', userId);
          }
          
          // Update current task if it's the same task being assigned
          if (state.currentTask && state.currentTask.id === taskId) {
            state.currentTask = {
              ...state.currentTask,
              assignedTo: result?.assignedTo || { id: userId },
              assignedToUserId: result?.assignedTo?.id || userId
            };
          }
        }
        
        state.assignError = null;
      })
      .addCase(assignTaskToUserAction.rejected, (state, action) => {
        state.assigning = false;
        state.assignError = action.payload;
      })
      
      .addCase(filterTasks.pending, (state) => {
        state.filtering = true;
        state.filterError = null;
      })
      .addCase(filterTasks.fulfilled, (state, action) => {
        state.filtering = false;
        state.filteredTasks = Array.isArray(action.payload) ? action.payload : [];
        state.filterError = null;
      })
      .addCase(filterTasks.rejected, (state, action) => {
        state.filtering = false;
        state.filterError = action.payload;
      })
      
      .addCase(fetchTasksAssignedToEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasksAssignedToEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
        state.error = null;
        state.lastFetchTime = Date.now();
      })
      .addCase(fetchTasksAssignedToEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(fetchEmployeesForTaskAssignment.pending, (state) => {
        state.fetchingEmployees = true;
        state.fetchEmployeesError = null;
      })
      .addCase(fetchEmployeesForTaskAssignment.fulfilled, (state, action) => {
        state.fetchingEmployees = false;
        state.employeesForAssignment = action.payload;
        state.fetchEmployeesError = null;
      })
      .addCase(fetchEmployeesForTaskAssignment.rejected, (state, action) => {
        state.fetchingEmployees = false;
        state.fetchEmployeesError = action.payload;
      });
  },
});

// Export all actions for use in components
export const {
  clearError,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  clearAssignError,
  clearFilterError,
  clearFetchEmployeesError,
  resetTasksState,
  setCurrentProjectId,
  clearCurrentTask,
  clearFilteredTasks,
} = taskSlice.actions;

// Export the reducer for store configuration
export default taskSlice.reducer;

// These provide easy access to specific parts of the state
// Usage: const { tasks, loading } = useSelector(selectTaskState);
export const selectTaskState = (state) => state.tasks;
export const selectTasks = (state) => state.tasks.tasks;
export const selectCurrentTask = (state) => state.tasks.currentTask;
export const selectFilteredTasks = (state) => state.tasks.filteredTasks;
export const selectEmployeesForAssignment = (state) => state.tasks.employeesForAssignment;
export const selectTaskLoading = (state) => state.tasks.loading;
export const selectTaskCreating = (state) => state.tasks.creating;
export const selectTaskUpdating = (state) => state.tasks.updating;
export const selectTaskDeleting = (state) => state.tasks.deleting;
export const selectTaskAssigning = (state) => state.tasks.assigning;
export const selectTaskFiltering = (state) => state.tasks.filtering;
export const selectTaskFetchingEmployees = (state) => state.tasks.fetchingEmployees;
export const selectTaskError = (state) => state.tasks.error;
export const selectTaskCreateError = (state) => state.tasks.createError;
export const selectTaskUpdateError = (state) => state.tasks.updateError;
export const selectTaskDeleteError = (state) => state.tasks.deleteError;
export const selectTaskAssignError = (state) => state.tasks.assignError;
export const selectTaskFilterError = (state) => state.tasks.filterError;
export const selectTaskFetchEmployeesError = (state) => state.tasks.fetchEmployeesError;
export const selectTaskRefreshError = (state) => state.tasks.refreshError;
export const selectCurrentProjectId = (state) => state.tasks.currentProjectId;

// Cache-related selectors
export const selectIsFromCache = (state) => state.tasks.isFromCache;
export const selectCacheExpiryTime = (state) => state.tasks.cacheExpiryTime;
export const selectIsCacheExpired = (state) => {
  const expiryTime = state.tasks.cacheExpiryTime;
  return expiryTime ? Date.now() > expiryTime : true;
};

// Loading state selectors
export const selectIsRefreshing = (state) => state.tasks.refreshing;
