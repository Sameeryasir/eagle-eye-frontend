import { apiGet, ApiRoutes } from '../api/client';

export const getUnreadNotifications = async () => {
  return apiGet(ApiRoutes.userNotifications.unread);
};
