import { apiDelete, ApiRoutes } from '../api/client';

export async function deleteProjectById(projectId) {
  return apiDelete(ApiRoutes.projects.byId(projectId));
}
