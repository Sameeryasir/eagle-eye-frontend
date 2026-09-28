import { apiGet, ApiRoutes } from '../api/client';

export async function getFilesByProjectId(projectId) {
  return apiGet(ApiRoutes.projects.files(projectId));
}
