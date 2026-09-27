import { apiGet, ApiRoutes } from '../api/client';

export async function getTasksAssignedToEmployees() {
  return apiGet(ApiRoutes.tasks.list);
}
