import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import refreshToken from '../utils/tokenRefresh';

export async function assignProjectToEmployees(assignData) {
  // --- Enhanced Input Validation (MCP Context 7) ---
  // Business Rule: Comprehensive validation before making API calls
  let token = await AsyncStorage.getItem('token');
  let refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }

  if (!assignData || typeof assignData !== 'object') {
    throw new Error('Invalid assignment data provided');
  }

  if (!assignData.projectId || typeof assignData.projectId !== 'number') {
    throw new Error('Valid project ID is required for assignment');
  }

  if (!assignData.employeeIds || !Array.isArray(assignData.employeeIds) || assignData.employeeIds.length === 0) {
    throw new Error('At least one employee ID is required for assignment');
  }

  // Validate employee IDs are numbers
  const invalidEmployeeIds = assignData.employeeIds.filter(id => typeof id !== 'number' || isNaN(id));
  if (invalidEmployeeIds.length > 0) {
    throw new Error('Invalid employee ID format detected');
  }

  // Limit batch size for performance
  if (assignData.employeeIds.length > 50) {
    throw new Error('Cannot assign more than 50 employees at once. Please reduce the selection.');
  }

  try {
    console.log('AssignProject - Starting assignment:', {
      projectId: assignData.projectId,
      employeeCount: assignData.employeeIds.length,
      employeeIds: assignData.employeeIds
    });

    const response = await axios.post(
      `${API_URL}/project/assign-to-employees`,
      {
        projectId: assignData.projectId,
        employeeIds: assignData.employeeIds,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    console.log('AssignProject - Assignment successful:', response.data);
    return response.data;

  } catch (err) {
    console.error('AssignProject - Assignment error:', err);

    // --- Enhanced Error Handling (MCP Context 7) ---
    // Business Rule: Provide specific error messages based on failure type
    
    if (axios.isAxiosError(err)) {
      // Handle authentication errors with token refresh
      if (err.response?.status === 401 && refreshTokenValue) {
        try {
          console.log('AssignProject - Attempting token refresh...');
          const newToken = await refreshToken(refreshTokenValue);
          
          if (!newToken) {
            throw new Error('Unable to refresh authentication token');
          }
          
          console.log('AssignProject - Retrying with new token...');
          const retryResponse = await axios.post(
            `${API_URL}/project/assign-to-employees`,
            {
              projectId: assignData.projectId,
              employeeIds: assignData.employeeIds,
            },
            {
              headers: {
                Authorization: `Bearer ${newToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            }
          );

          console.log('AssignProject - Retry successful:', retryResponse.data);
          return retryResponse.data;
        } catch (refreshError) {
          console.error('AssignProject - Token refresh failed:', refreshError);
          throw new Error('Authentication failed. Please log in again.');
        }
      }

      // Handle specific HTTP error codes with meaningful messages
      const statusCode = err.response?.status;
      const errorData = err.response?.data;
      
      switch (statusCode) {
        case 400:
          if (errorData?.message?.includes('company')) {
            throw new Error('Some employees belong to a different company and cannot be assigned to this project.');
          } else if (errorData?.message?.includes('project')) {
            throw new Error('Project assignment failed. The project may not exist or be accessible.');
          } else if (errorData?.message?.includes('employee')) {
            throw new Error('Some employee records could not be found or are invalid.');
          } else {
            throw new Error(errorData?.message || 'Invalid request. Please check your selection and try again.');
          }
        
        case 403:
          throw new Error('You do not have permission to assign employees to this project.');
        
        case 404:
          throw new Error('Project or employee records not found. Please refresh and try again.');
        
        case 409:
          throw new Error('Some employees are already assigned to this project.');
        
        case 422:
          throw new Error('Assignment validation failed. Please ensure all data is correct.');
        
        case 429:
          throw new Error('Too many requests. Please wait a moment and try again.');
        
        case 500:
          throw new Error('Server error occurred. Please try again later.');
        
        case 503:
          throw new Error('Service temporarily unavailable. Please try again later.');
        
        default:
          const message = errorData?.message || err.message || 'Assignment failed';
          throw new Error(message);
      }
    }

    // Handle network errors
    if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    }

    // Handle timeout errors
    if (err.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please try again.');
    }

    // Generic error fallback
    throw new Error(err.message || 'An unexpected error occurred during assignment');
  }
}


