// Central export point for all Redux slices

export { default as projectReducer } from './projectSlice';
export * from './projectSlice';

export { default as taskReducer } from './taskSlice';
export * from './taskSlice';

export { default as logReducer } from './logSlice';
export * from './logSlice';

// Future slices can be exported here:
// export { default as authReducer } from './authSlice';
