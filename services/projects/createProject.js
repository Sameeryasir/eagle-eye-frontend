/**
 * Change Summary:
 * - What: Uses shared apiPost + ApiRoutes.projects.create
 * - Why: Nest creates via POST /projects
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPost, ApiRoutes } from '../api/client';

export async function createProject(data) {
  return apiPost(ApiRoutes.projects.create, data);
}
