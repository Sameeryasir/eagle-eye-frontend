/**
 * Change Summary:
 * - What: Uses shared apiDelete + ApiRoutes.events.byId
 * - Why: Nest deletes via DELETE /events/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiDelete, ApiRoutes } from '../api/client';

const deleteEventById = async (eventId) => {
  return apiDelete(ApiRoutes.events.byId(eventId));
};

export { deleteEventById };
