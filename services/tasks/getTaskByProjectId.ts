import { apiGet, ApiRoutes } from '../api/client';

export async function getTaskByProjectId(projectId) {
  return apiGet(ApiRoutes.tasks.byProject(projectId));
}
