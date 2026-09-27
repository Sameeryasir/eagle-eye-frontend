/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.logs.byId
 * - Why: Nest path is GET /logs/:id; keeps array-vs-object handling for UI
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getLogById(logId) {
  if (!logId) {
    throw new Error('Log ID is required');
  }

  const data = await apiGet(ApiRoutes.logs.byId(logId));

  if (!data) {
    throw new Error('No data received from server');
  }

  // Some backends return an array — take the first entry
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error('Log not found');
    }
    return data[0];
  }

  return data;
}
