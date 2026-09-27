import { apiGet, ApiRoutes } from '../api/client';

export async function getEmployeesToAssignTask() {
  return apiGet(ApiRoutes.tasks.assignees);
}
