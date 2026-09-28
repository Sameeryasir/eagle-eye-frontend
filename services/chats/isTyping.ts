import { apiPost, ApiRoutes } from '../api/client';

export async function isTyping(conversationId, isTypingStatus) {
  return apiPost(ApiRoutes.chat.typing, {
    conversationId,
    isTyping: isTypingStatus,
  });
}
