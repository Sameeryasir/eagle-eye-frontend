/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.tasks.today
 * - Why: Nest path is GET /tasks/today
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export default async function getTodaysTask() {
  return apiGet(ApiRoutes.tasks.today);
}
