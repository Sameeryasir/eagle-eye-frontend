import { apiPost, ApiRoutes } from '../api/client';

export async function projectAssignement(notificationData) {
  const payload = {
    ...notificationData,
    assignedToUserId: Number(notificationData.assignedToUserId),
  };

  return apiPost(ApiRoutes.userNotifications.project, payload);
}
