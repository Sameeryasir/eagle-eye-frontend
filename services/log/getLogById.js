import { apiGet, ApiRoutes } from '../api/client';

export async function getLogById(logId) {
  if (!logId) {
    throw new Error('Log ID is required');
  }

  const data = await apiGet(ApiRoutes.logs.byId(logId));

  if (!data) {
    throw new Error('No data received from server');
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error('Log not found');
    }
    return data[0];
  }

  return data;
}
