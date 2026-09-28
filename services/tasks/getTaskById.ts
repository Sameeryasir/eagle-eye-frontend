import { apiGet, ApiRoutes } from '../api/client';

export async function getTaskById(taskId) {
  return apiGet(ApiRoutes.tasks.byId(taskId));
}
