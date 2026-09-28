import { apiGet, ApiRoutes } from '../api/client';

export async function getNotificationforCurrentUser() {
  return apiGet(ApiRoutes.userNotifications.list);
}
