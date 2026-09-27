import { apiPost, ApiRoutes } from '../api/client';

export const createConversation = async (conversationData) => {
  const requestBody = {
    type: conversationData.type || 'private',
    participantIds: conversationData.participantIds,
  };

  return apiPost(ApiRoutes.chat.conversations, requestBody);
};
