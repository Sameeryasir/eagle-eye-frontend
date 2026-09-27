import { apiGet, ApiRoutes } from '../api/client';

export async function getMyProjects() {
  return apiGet(ApiRoutes.projects.list);
}
