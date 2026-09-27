import { apiGet, ApiRoutes } from '../api/client';

export async function getProjectById(projectId) {
  return apiGet(ApiRoutes.projects.byId(projectId));
}
