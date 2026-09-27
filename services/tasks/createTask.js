import { apiPost, ApiRoutes } from '../api/client';

export async function createTask(taskData) {
  return apiPost(ApiRoutes.tasks.create, taskData);
}
