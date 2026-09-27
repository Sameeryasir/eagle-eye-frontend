/**
 * Change Summary:
 * - What: Uses shared apiPost + ApiRoutes.events.create
 * - Why: Nest creates via POST /events
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPost, ApiRoutes } from '../api/client';

export async function createEvent(data) {
  return apiPost(ApiRoutes.events.create, data);
}
