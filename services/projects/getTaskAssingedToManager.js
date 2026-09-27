/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.projects.assignedTasks
 * - Why: Nest path is /projects/:id/assigned-tasks
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getTaskAssignedToManager(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  // --- Fetch manager-assigned tasks for this project ---
  const data = await apiGet(ApiRoutes.projects.assignedTasks(projectId));

  // Business Rule: empty list is treated as a soft error for the create-log UI
  if (data?.tasks && data.tasks.length === 0) {
    const error = new Error('No tasks are assigned to you for this project yet.');
    error.statusCode = 400;
    error.error = 'Bad Request';
    throw error;
  }

  return data;
}
