import { apiPost, ApiRoutes } from '../api/client';

export async function createProject(data) {
  return apiPost(ApiRoutes.projects.create, data);
}
