/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.users.byId
 * - Why: Nest uses /users/:id (plural)
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';

export async function getUserById(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  return apiGet(ApiRoutes.users.byId(userId));
}
