/**
 * Change Summary:
 * - What: Uses shared apiPost + ApiRoutes.tasks.assign
 * - Why: Nest assigns via POST /tasks/:id/assign with { assignedToUserId }
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPost, ApiRoutes } from '../api/client';

export async function assignTaskToUser(taskId, userId) {
  if (!taskId) {
    throw new Error('Task ID is required');
  }
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Business Rule: backend expects assignedToUserId in the body
  return apiPost(ApiRoutes.tasks.assign(taskId), { assignedToUserId: userId });
}
