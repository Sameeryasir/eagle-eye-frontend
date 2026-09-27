/**
 * Change Summary:
 * - What: Uses shared apiPost + ApiRoutes.tasks.create
 * - Why: Nest creates via POST /tasks
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPost, ApiRoutes } from '../api/client';

export async function createTask(taskData) {
  return apiPost(ApiRoutes.tasks.create, taskData);
}
