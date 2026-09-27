/**
 * Change Summary:
 * - What: Uses shared apiDelete + ApiRoutes.projects.byId
 * - Why: Nest deletes via DELETE /projects/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiDelete, ApiRoutes } from '../api/client';

export async function deleteProjectById(projectId) {
  return apiDelete(ApiRoutes.projects.byId(projectId));
}
