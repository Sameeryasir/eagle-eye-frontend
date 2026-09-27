/**
 * Change Summary:
 * - What: Uses shared apiPost + ApiRoutes.logs.create
 * - Why: Nest creates via POST /logs
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPost, ApiRoutes } from '../api/client';

export async function createLog(data) {
  return apiPost(ApiRoutes.logs.create, data);
}
