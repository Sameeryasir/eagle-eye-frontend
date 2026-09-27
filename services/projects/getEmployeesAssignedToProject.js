import { apiGet, ApiRoutes } from '../api/client';

export async function getEmployeesAssignedToProject(projectId) {
  return apiGet(ApiRoutes.projects.employeesAssigned(projectId));
}
