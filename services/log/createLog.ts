import { apiPost, ApiRoutes } from '../api/client';

export async function createLog(data) {
  return apiPost(ApiRoutes.logs.create, data);
}
