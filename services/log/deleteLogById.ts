import { apiDelete, ApiRoutes } from '../api/client';

export async function deleteLogById(logId) {
  return apiDelete(ApiRoutes.logs.byId(logId));
}
