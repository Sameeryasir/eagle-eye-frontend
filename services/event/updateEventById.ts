import { apiPut, ApiRoutes } from '../api/client';

const updateEventById = async (eventId, eventData) => {
  return apiPut(ApiRoutes.events.byId(eventId), eventData);
};

export { updateEventById };
