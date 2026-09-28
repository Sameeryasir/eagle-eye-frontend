import { apiGet, ApiRoutes } from '../api/client';

export async function getLogs(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  return apiGet(ApiRoutes.logs.byProject(projectId));
}
