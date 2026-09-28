import { apiGet, ApiRoutes } from '../api/client';

export async function getUserById(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  return apiGet(ApiRoutes.users.byId(userId));
}
