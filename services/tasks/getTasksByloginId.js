/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.tasks.list
 * - Why: Nest lists tasks for the logged-in user at GET /tasks
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export default async function getTasksByloginId() {
  return apiGet(ApiRoutes.tasks.list);
}
