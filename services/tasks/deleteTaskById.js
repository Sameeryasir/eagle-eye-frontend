/**
 * Change Summary:
 * - What: Uses shared apiDelete + ApiRoutes.tasks.byId
 * - Why: Nest deletes via DELETE /tasks/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiDelete, ApiRoutes } from '../api/client';

export async function deleteTaskById(taskId) {
  return apiDelete(ApiRoutes.tasks.byId(taskId));
}
