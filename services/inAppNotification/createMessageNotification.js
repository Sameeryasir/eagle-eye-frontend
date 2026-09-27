import { apiPost, ApiRoutes } from '../api/client';

export const createMessageNotification = async (notificationData) => {
  return apiPost(ApiRoutes.userNotifications.message, notificationData);
};
