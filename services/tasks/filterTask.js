import { apiPost, ApiRoutes } from '../api/client';

export async function filterTask(filters, projectId) {
  if (!projectId) {
    throw new Error('Project ID is required for filtering tasks');
  }

  const filterData = {
    projectId: parseInt(projectId, 10),
  };

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
