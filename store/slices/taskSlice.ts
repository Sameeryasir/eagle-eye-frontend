// @ts-nocheck
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
import { getErrorMessage } from '../../services/api/errors';
import { unwrapList } from '../../services/api/normalize';

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (_, { rejectWithValue }) => {
    try {
      return await getTasksByloginId();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch tasks'));
    }
  }
);
export const fetchAllTasks = createAsyncThunk(
  'tasks/fetchAllTasks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAllTasks();
      return unwrapList(response, ['data', 'tasks', 'items']);
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch all tasks'));
    }
  }
);

const TASKS_BY_PROJECT_FRESH_MS = 45 * 1000;
const EMPLOYEES_FRESH_MS = 5 * 60 * 1000;

function resolveProjectFetchArg(arg) {
  if (arg != null && typeof arg === 'object') {
    return {
      projectId: arg.projectId,
      forceRefresh: !!arg.forceRefresh,
    };
  }
  return { projectId: arg, forceRefresh: false };
}

export const fetchTasksByProjectId = createAsyncThunk(
  'tasks/fetchTasksByProjectId',
  async (arg, { rejectWithValue }) => {
    const { projectId } = resolveProjectFetchArg(arg);
    try {
      const tasks = await getTaskByProjectId(projectId);
      return { projectId, tasks };
    } catch (error) {
      console.error('Error fetching tasks by project ID:', error);
      return rejectWithValue(
        getErrorMessage(error, 'Failed to fetch tasks by project')
      );
    }
  },
  {
    condition: (arg, { getState }) => {
      const { projectId, forceRefresh } = resolveProjectFetchArg(arg);
      if (forceRefresh || projectId == null) return true;
      const state = getState().tasks;
      if (state.loading) return false; 
      const sameProject =
        state.currentProjectId != null &&
        String(state.currentProjectId) === String(projectId);
      const fresh =
        state.lastFetchTime &&
        Date.now() - state.lastFetchTime < TASKS_BY_PROJECT_FRESH_MS;
      
      if (sameProject && fresh) return false;
      return true;
    },
  }
);

export const fetchTodaysTasks = createAsyncThunk(
  'tasks/fetchTodaysTasks',
  async (_, { rejectWithValue }) => {
    try {
      return await getTodaysTask();
    } catch (error) {
      console.error("Error fetching today's tasks:", error);
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch today's tasks")
      );
    }
  }
);

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
export const createNewTask = createAsyncThunk(
  'tasks/createNewTask',
  async (taskData, { rejectWithValue }) => {
    try {
      const newTask = await createTask(taskData);
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to create task'));
    }
  }
);
export const updateExistingTask = createAsyncThunk(
  'tasks/updateExistingTask',
  async ({ taskId, taskData }, { rejectWithValue }) => {
    try {
      const updatedTask = await updateTask(taskId, taskData);
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to update task'));
    }
  }
);
export const deleteExistingTask = createAsyncThunk(
  'tasks/deleteExistingTask',
  async (taskId, { rejectWithValue }) => {
    try {
      await deleteTaskById(taskId);
      return taskId; 
    } catch (error) {
      console.error('Error deleting task:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to delete task'));
    }
  }
);
export const assignTaskToUserAction = createAsyncThunk(
  'tasks/assignTaskToUserAction',
  async ({ taskId, userId }, { rejectWithValue }) => {
    try {
      const result = await assignTaskToUser(taskId, userId);
      
      
      
      if (result && typeof result === 'object') {
        
        return { taskId, userId, result };
      } else {
        console.warn('⚠️ Unexpected API response format:', result);
        
        return { taskId, userId, result: { assignedToUserId: userId } };
      }
    } catch (error) {
      console.error('❌ Error assigning task:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to assign task'));
    }
  }
);
export const filterTasks = createAsyncThunk(
  'tasks/filterTasks',
  async ({ filters, projectId }, { rejectWithValue }) => {
    try {
      
      const backendFilteredTasks = await filterTask(filters, projectId);
      
      
      const fullyFilteredTasks = applyClientSideFilters(backendFilteredTasks || [], filters);
      
      return fullyFilteredTasks;
    } catch (error) {
      console.error('Error filtering tasks:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to filter tasks'));
    }
  }
);
export const fetchTasksAssignedToEmployees = createAsyncThunk(
  'tasks/fetchTasksAssignedToEmployees',
  async (_, { rejectWithValue }) => {
    try {
      return await getTasksAssignedToEmployees();
    } catch (error) {
      console.error('Error fetching tasks assigned to employees:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch assigned tasks'));
    }
  }
);

export const fetchEmployeesForTaskAssignment = createAsyncThunk(
  'tasks/fetchEmployeesForTaskAssignment',
  async (arg, { rejectWithValue }) => {
    try {
      return await getEmployeesToAssignTasks();
    } catch (error) {
      console.error('Error fetching employees for task assignment:', error);
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch employees'));
    }
  },
  {
    
    condition: (arg, { getState }) => {
      const forceRefresh =
        arg != null && typeof arg === 'object' ? !!arg.forceRefresh : false;
      if (forceRefresh) return true;
      const state = getState().tasks;
      if (state.fetchingEmployees) return false;
      const hasData =
        Array.isArray(state.employeesForAssignment) &&
        state.employeesForAssignment.length > 0;
      const fresh =
        state.employeesLastFetchTime &&
        Date.now() - state.employeesLastFetchTime < EMPLOYEES_FRESH_MS;
      if (hasData && fresh) return false;
      return true;
    },
  }
);

const initialState = {
  
  tasks: [],
  currentTask: null,
  filteredTasks: [],
  employeesForAssignment: [],
  
  
  tasksByProject: {}, 
  currentProjectId: null,
  
  
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  assigning: false,
  filtering: false,
  fetchingEmployees: false,
  
  
  error: null,
  createError: null,
  updateError: null,
  deleteError: null,
  assignError: null,
  filterError: null,
  fetchEmployeesError: null,
  
  
  lastFetchTime: null,
  employeesLastFetchTime: null,
};

function applyClientSideFilters(tasks, filters = {}) {
  if (!Array.isArray(tasks)) return [];
  return tasks;
}
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

    setTasksForProject: (state, action) => {
      const { projectId, tasks } = action.payload || {};
      const list = Array.isArray(tasks) ? tasks : [];
      state.tasks = list;
      state.loading = false;
      state.error = null;
      state.currentProjectId = projectId ?? state.currentProjectId;
      state.lastFetchTime = Date.now();
      if (projectId != null) {
        state.tasksByProject[String(projectId)] = {
          tasks: list,
          timestamp: Date.now(),
          isFromCache: false,
        };
      }
    },
  },
  
  
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
        
        const { projectId, tasks } = action.payload || {};
        state.tasks = Array.isArray(tasks) ? tasks : action.payload;
        state.currentProjectId = projectId ?? state.currentProjectId;
        if (projectId != null) {
          state.tasksByProject[String(projectId)] = {
            tasks: state.tasks,
            timestamp: Date.now(),
            isFromCache: false,
          };
        }
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
        state.tasks.unshift(action.payload); 
        if (state.currentProjectId != null) {
          const key = String(state.currentProjectId);
          const cached = state.tasksByProject[key];
          if (cached) {
            cached.tasks = state.tasks;
            cached.timestamp = Date.now();
          }
        }
        state.lastFetchTime = Date.now();
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
        
        
        state.tasks = state.tasks.filter(task => task.id !== taskId);
        
        
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
        
        
        const taskIndex = state.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          if (result && result.assignedTo) {
            
            state.tasks[taskIndex] = {
              ...state.tasks[taskIndex],
              assignedTo: result.assignedTo,
              assignedToUserId: result.assignedTo?.id || userId
            };
          } else {
            
            state.tasks[taskIndex] = {
              ...state.tasks[taskIndex],
              assignedToUserId: userId,
              assignedTo: { id: userId } 
            };
          }
          
          
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
        state.employeesLastFetchTime = Date.now();
        state.fetchEmployeesError = null;
      })
      .addCase(fetchEmployeesForTaskAssignment.rejected, (state, action) => {
        state.fetchingEmployees = false;
        state.fetchEmployeesError = action.payload;
      });
  },
});

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
  setTasksForProject,
} = taskSlice.actions;

export default taskSlice.reducer;

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

export const selectIsFromCache = (state) => state.tasks.isFromCache;
export const selectCacheExpiryTime = (state) => state.tasks.cacheExpiryTime;
export const selectIsCacheExpired = (state) => {
  const expiryTime = state.tasks.cacheExpiryTime;
  return expiryTime ? Date.now() > expiryTime : true;
};

export const selectIsRefreshing = (state) => state.tasks.refreshing;
