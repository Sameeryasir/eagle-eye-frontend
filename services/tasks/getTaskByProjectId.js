/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.tasks.byProject
 * - Why: Nest path is GET /tasks/by-project/:projectId
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getTaskByProjectId(projectId) {
  return apiGet(ApiRoutes.tasks.byProject(projectId));
}
