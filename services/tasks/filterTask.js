import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import refreshToken from '../utils/tokenRefresh';

export async function filterTask(filters, projectId) {
    let token = await AsyncStorage.getItem('token');
    let refreshTokenValue = await AsyncStorage.getItem('refreshToken');
    
    if (!token) {
        throw new Error('No token found');
    }

    if (!projectId) {
        throw new Error('Project ID is required for filtering tasks');
    }
    
    // --- Transform Frontend Filters to Backend DTO (MCP Context 7) ---
    // Business Rule: Convert FilterModal options to backend TaskFilterDto format
    const filterData = {
        projectId: parseInt(projectId), // Ensure it's a number
    };

    // Map date sorting options to backend sortBy field
    // Business Rule: Don't apply date-based startTime filters when closedTask is true (backend conflict)
    if (filters.createdAt && !filters.closedTask) {
        switch (filters.createdAt) {
            case 'created-at':
                filterData.sortBy = 'createdAt';
                break;
            case 'start-date':
                filterData.sortBy = 'startTime';
                break;
            case 'due-date':
                filterData.sortBy = 'endTime';
                break;
        }
    } else if (filters.closedTask) {
        // When closedTask is true, use createdAt sorting to avoid backend conflict
        filterData.sortBy = 'createdAt';
        console.log('🔒 Closed task filter active - using createdAt sorting to avoid backend conflict');
    }

    // Map assignment filter to backend assignedTo field
    if (filters.assignedTo === 'assigned-to-me') {
        filterData.assignedTo = 'me';
    } else if (filters.assignedTo === 'unassigned') {
        filterData.unassigned = true;
    } else if (filters.assignedTo === 'assigned-to-others') {
        if (filters.email) {
            filterData.email = filters.email; // Backend expects 'email' field, not 'assignedTo'
            console.log('📧 Using employee email for filtering:', filters.email);
        } else if (filters.selectedEmployeeId) {
            filterData.assignedTo = filters.selectedEmployeeId; // Fallback to employee ID
            console.log('🆔 Using employee ID for filtering:', filters.selectedEmployeeId);
        } else {
            console.warn('⚠️ assigned-to-others selected but no email or ID provided');
        }
    }
    
    // Map closedTask filter to backend closedTask field
    if (filters.closedTask !== undefined) {
        filterData.closedTask = filters.closedTask;
        console.log('🔒 Using closedTask filter:', filters.closedTask);
    }
    
    // Note: Backend supports 'me', 'unassigned', specific employee email options, and closedTask boolean
    
    // --- Validation and Debugging ---
    console.log('📊 Input filters received:', JSON.stringify(filters, null, 2));
    console.log('📊 Final filter data being sent to backend:', JSON.stringify(filterData, null, 2));
    
    // Validate critical fields
    if (!filterData.projectId || isNaN(filterData.projectId)) {
        console.error('❌ Invalid or missing projectId:', filterData.projectId);
        throw new Error('Invalid project ID provided');
    }
    
    try {
        const response = await axios.post(`${API_URL}/task/filter`, filterData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }); 
        return response.data;
    } catch (err) {
        // --- Enhanced Error Logging for 400 Bad Request ---
        if (axios.isAxiosError(err) && err.response?.status === 400) {
            console.error('❌ 400 Bad Request Error Details:');
            console.error('📊 Request data sent:', JSON.stringify(filterData, null, 2));
            console.error('📊 Response error:', err.response?.data);
            console.error('📊 Response status:', err.response?.status);
            console.error('📊 Response headers:', err.response?.headers);
            throw new Error(`Bad Request: ${err.response?.data?.message || 'Invalid filter parameters'}`);
        }
        
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            const newToken = await refreshToken(refreshTokenValue);
            
            const retryResponse = await axios.post(`${API_URL}/task/filter`, filterData, {
                headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return retryResponse.data;
        }
        throw err;
    }
}

// --- Client-Side Filtering Function (MCP Context 7) ---
// Business Rule: Apply additional filtering logic that backend doesn't handle
export function applyClientSideFilters(tasks, filters) {
    if (!tasks || !Array.isArray(tasks)) {
        return [];
    }

    let filteredTasks = [...tasks];

    // Apply assignment filters that backend doesn't handle
    if (filters.assignedTo) {
        switch (filters.assignedTo) {
            case 'all':
                // No filtering needed - show all tasks
                break;
            case 'assigned-to-me':
                // This is handled by backend, no additional filtering needed
                break;
            case 'assigned-to-others':
                // Filter tasks assigned to other users (not current user)
                filteredTasks = filteredTasks.filter(task => 
                    task.assignedTo && task.assignedTo !== 'current-user-id'
                );
                break;
            case 'unassigned':
                // Filter tasks that are not assigned to anyone
                filteredTasks = filteredTasks.filter(task => 
                    !task.assignedTo || task.assignedTo === null || task.assignedTo === ''
                );
                break;
        }
    }

    // Apply any additional client-side filters here if needed
    // Note: Date sorting is handled by backend via sortBy parameter

    return filteredTasks;
}

