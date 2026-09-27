/**
 * Change Summary:
 * - What: Uses shared apiPut + ApiRoutes.users.byId
 * - Why: Nest uses PUT /users/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPut, ApiRoutes } from '../api/client';

export async function updateUserById(userId, userData) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  if (!userData) {
    throw new Error('User data is required');
  }

  return apiPut(ApiRoutes.users.byId(userId), userData);
}
