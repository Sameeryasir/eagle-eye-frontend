/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.projects.list
 * - Why: Nest lists projects for the logged-in user at GET /projects
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

// Exported as getMyProjects — screens/store already import this name
export async function getMyProjects() {
  return apiGet(ApiRoutes.projects.list);
}
