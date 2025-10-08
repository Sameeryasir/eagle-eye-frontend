// --- Redux Store Configuration (MCP Context 7) ---
// Centralized state management using Redux Toolkit for better performance and developer experience
import { configureStore } from '@reduxjs/toolkit';
import projectReducer from './slices/projectSlice';
import taskReducer from './slices/taskSlice';
import logReducer from './slices/logSlice';

// Configure the Redux store with all reducers
// This follows MCP Context 7 best practices for clean, maintainable state management
export const store = configureStore({
  reducer: {
    // Project management slice for all CRUD operations
    projects: projectReducer,
    
    // Task management slice for all CRUD operations
    tasks: taskReducer,
    
    // Log management slice for all CRUD operations
    logs: logReducer,
    
    // Event management slice for all CRUD operations
    
    // Future slices can be added here:
    // auth: authReducer,
  },
  
  // Middleware configuration for better debugging and async operations
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check (common with async operations)
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
    
  // Enable Redux DevTools in development
  devTools: process.env.NODE_ENV !== 'production',
});

// Export store as default for App.js import
export default store;
