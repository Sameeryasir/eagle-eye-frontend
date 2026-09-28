import { apiPost, ApiRoutes } from '../api/client';

export const eventAssignement = async (notificationData) => {
  const payload = {
    ...notificationData,
    assignedToUserIds: notificationData.assignedToUserIds.map((id) => Number(id)),
    eventId: Number(notificationData.eventId),
  };

  return apiPost(ApiRoutes.userNotifications.event, payload);
};
