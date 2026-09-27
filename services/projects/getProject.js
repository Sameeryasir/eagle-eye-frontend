/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.projects.byId
 * - Why: Nest uses GET /projects/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getProjectById(projectId) {
  return apiGet(ApiRoutes.projects.byId(projectId));
}
