/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.tasks.byProjectWithLogs
 * - Why: Former logs-filter endpoint now lives under tasks with-logs
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getLogsByProjectId(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  // Nest: GET /tasks/by-project/:projectId/with-logs (was /log/logs-filter/:id)
  return apiGet(ApiRoutes.tasks.byProjectWithLogs(projectId));
}
