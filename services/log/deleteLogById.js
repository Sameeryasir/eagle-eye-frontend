/**
 * Change Summary:
 * - What: Uses shared apiDelete + ApiRoutes.logs.byId
 * - Why: Nest deletes via DELETE /logs/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiDelete, ApiRoutes } from '../api/client';

export async function deleteLogById(logId) {
  return apiDelete(ApiRoutes.logs.byId(logId));
}
