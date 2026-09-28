import { apiPut, ApiRoutes } from '../api/client';

export async function updateLogById(logId, updateData) {
  return apiPut(ApiRoutes.logs.byId(logId), updateData);
}
