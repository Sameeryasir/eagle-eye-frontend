import { apiPost, ApiRoutes } from '../api/client';

export async function markAllRead() {
  return apiPost(ApiRoutes.userNotifications.readAll, {});
}
