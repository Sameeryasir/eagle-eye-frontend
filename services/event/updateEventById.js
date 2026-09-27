/**
 * Change Summary:
 * - What: Uses shared apiPut + ApiRoutes.events.byId
 * - Why: Nest updates via PUT /events/:id
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPut, ApiRoutes } from '../api/client';

const updateEventById = async (eventId, eventData) => {
  return apiPut(ApiRoutes.events.byId(eventId), eventData);
};

export { updateEventById };
