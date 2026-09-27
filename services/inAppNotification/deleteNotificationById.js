import { apiDelete, ApiRoutes } from '../api/client';

export async function deleteNotificationById(notificationId) {
  return apiDelete(ApiRoutes.userNotifications.byId(notificationId));
}
