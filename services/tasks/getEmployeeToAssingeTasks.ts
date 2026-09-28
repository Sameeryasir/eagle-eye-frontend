import { apiGet, ApiRoutes } from '../api/client';

export async function getEmployeesToAssignTasks() {
  return apiGet(ApiRoutes.tasks.assignees);
}
