import { apiPost, ApiRoutes } from '../api/client';

export const taskAssignement = async (notificationData) => {
  const payload = {
    ...notificationData,
    assignedToUserId: Number(notificationData.assignedToUserId),
  };

  return apiPost(ApiRoutes.userNotifications.task, payload);
};
