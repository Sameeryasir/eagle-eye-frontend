/**
 * Change Summary:
 * - What: Uses shared apiPut + ApiRoutes.projects.byId
 * - Why: Nest updates via PUT /projects/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPut, ApiRoutes } from '../api/client';

export async function updateProjectById(id, updateData) {
  return apiPut(ApiRoutes.projects.byId(id), updateData);
}
