/**
 * Change Summary:
 * - What: Uses shared apiPut + ApiRoutes.logs.byId
 * - Why: Nest updates via PUT /logs/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPut, ApiRoutes } from '../api/client';

export async function updateLogById(logId, updateData) {
  return apiPut(ApiRoutes.logs.byId(logId), updateData);
}
