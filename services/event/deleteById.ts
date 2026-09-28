import { apiDelete, ApiRoutes } from '../api/client';

const deleteEventById = async (eventId) => {
  return apiDelete(ApiRoutes.events.byId(eventId));
};

export { deleteEventById };
