/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.tasks.byId
 * - Why: Nest path is GET /tasks/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getTaskById(taskId) {
  return apiGet(ApiRoutes.tasks.byId(taskId));
}
