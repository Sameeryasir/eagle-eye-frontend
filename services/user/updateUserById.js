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
