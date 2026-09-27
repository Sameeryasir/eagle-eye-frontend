/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.tasks.assignees
 * - Why: Same Nest assignees endpoint as task assigner list
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getEmployeesToAssignTask() {
  return apiGet(ApiRoutes.tasks.assignees);
}
