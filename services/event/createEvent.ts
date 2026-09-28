import { apiPost, ApiRoutes } from '../api/client';

export async function createEvent(data) {
  return apiPost(ApiRoutes.events.create, data);
}
