/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.logs.recentByProject
 * - Why: Nest path is GET /logs/by-project/:projectId/recent
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getLogsForOwnerRecent(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  return apiGet(ApiRoutes.logs.recentByProject(projectId));
}
