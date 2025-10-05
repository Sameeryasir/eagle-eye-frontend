// --- Redux Slices Index (MCP Context 7) ---
// Central export point for all Redux slices
// This follows MCP Context 7 best practices for clean module organization

export { default as projectReducer } from './projectSlice';
export * from './projectSlice';

export { default as taskReducer } from './taskSlice';
export * from './taskSlice';

export { default as logReducer } from './logSlice';
export * from './logSlice';

// Future slices can be exported here:
// export { default as authReducer } from './authSlice';
