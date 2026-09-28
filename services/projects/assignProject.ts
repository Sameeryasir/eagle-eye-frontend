import { apiPost, ApiRoutes } from '../api/client';

export async function assignProjectToEmployees(assignData) {
  return apiPost(ApiRoutes.projects.assignToEmployees, {
    projectIds: assignData.projectIds,
    employeeIds: assignData.employeeIds,
  });
}
