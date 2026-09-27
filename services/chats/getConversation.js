import { apiGet, ApiRoutes } from '../api/client';

export const getUserConversations = async () => {
  return apiGet(ApiRoutes.chat.conversations);
};
