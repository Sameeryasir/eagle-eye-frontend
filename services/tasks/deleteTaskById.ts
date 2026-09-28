import { apiDelete, ApiRoutes } from '../api/client';

export async function deleteTaskById(taskId) {
  return apiDelete(ApiRoutes.tasks.byId(taskId));
}
