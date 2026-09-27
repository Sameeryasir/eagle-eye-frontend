import { apiGet, ApiRoutes } from '../api/client';

export async function getTaskAssignedToManager(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const data = await apiGet(ApiRoutes.projects.assignedTasks(projectId));

  if (data?.tasks && data.tasks.length === 0) {
    const error = new Error('No tasks are assigned to you for this project yet.');
    error.statusCode = 400;
    error.error = 'Bad Request';
    throw error;
  }

  return data;
}
