/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.tasks.assignees
 * - Why: Nest path is GET /tasks/assignees
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getEmployeesToAssignTasks() {
  return apiGet(ApiRoutes.tasks.assignees);
}
