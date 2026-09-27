/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.tasks.list
 * - Why: Nest uses GET /tasks for assigned employee tasks
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getTasksAssignedToEmployees() {
  return apiGet(ApiRoutes.tasks.list);
}
