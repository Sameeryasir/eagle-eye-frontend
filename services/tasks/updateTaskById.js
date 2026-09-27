/**
 * Change Summary:
 * - What: Uses shared apiPut + ApiRoutes.tasks.byId
 * - Why: Nest updates via PUT /tasks/:id; export name stays updateTask for screens
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPut, ApiRoutes } from '../api/client';

export const updateTask = async (taskId, taskData) => {
  return apiPut(ApiRoutes.tasks.byId(taskId), taskData);
};
