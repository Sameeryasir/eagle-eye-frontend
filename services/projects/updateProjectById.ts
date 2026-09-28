import { apiPut, ApiRoutes } from '../api/client';

export async function updateProjectById(id, updateData) {
  return apiPut(ApiRoutes.projects.byId(id), updateData);
}
