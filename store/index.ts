import { configureStore } from '@reduxjs/toolkit';
import projectReducer from './slices/projectSlice';
import taskReducer from './slices/taskSlice';
import logReducer from './slices/logSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    projects: projectReducer,
    tasks: taskReducer,
    logs: logReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
