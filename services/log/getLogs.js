/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.logs.byProject
 * - Why: Nest path is GET /logs/by-project/:projectId
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getLogs(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  return apiGet(ApiRoutes.logs.byProject(projectId));
}
