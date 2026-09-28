import { apiGet, ApiRoutes } from '../api/client';

export async function getLogsByProjectId(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  return apiGet(ApiRoutes.tasks.byProjectWithLogs(projectId));
}
