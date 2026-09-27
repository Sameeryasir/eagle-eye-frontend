/**
 * Change Summary:
 * - What: Uses shared apiPost + ApiRoutes.tasks.filter; keeps filter DTO mapping
 * - Why: Nest filters via POST /tasks/filter
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPost, ApiRoutes } from '../api/client';

export async function filterTask(filters, projectId) {
  if (!projectId) {
    throw new Error('Project ID is required for filtering tasks');
  }

  // --- Transform Frontend Filters to Backend DTO ---
  // Business Rule: Convert FilterModal options to backend TaskFilterDto format
  const filterData = {
    projectId: parseInt(projectId, 10),
  };

  // Map date sorting — skip startTime sorts when closedTask (backend conflict)
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
    filterData.sortBy = 'createdAt';
  }

  // Map assignment filter
  if (filters.assignedTo === 'assigned-to-me') {
    filterData.assignedTo = 'me';
  } else if (filters.assignedTo === 'unassigned') {
    filterData.unassigned = true;
  } else if (filters.assignedTo === 'assigned-to-others') {
    if (filters.email) {
      filterData.email = filters.email;
    } else if (filters.selectedEmployeeId) {
      filterData.assignedTo = filters.selectedEmployeeId;
    }
  }

  if (filters.closedTask !== undefined) {
    filterData.closedTask = filters.closedTask;
  }

  if (!filterData.projectId || isNaN(filterData.projectId)) {
    throw new Error('Invalid project ID provided');
  }

  return apiPost(ApiRoutes.tasks.filter, filterData);
}
