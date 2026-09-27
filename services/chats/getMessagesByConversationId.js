import { apiGet, ApiRoutes } from '../api/client';

export async function getMessagesByConversationId(
  conversationId,
  page = 1,
  limit = 20,
  { signal } = {}
) {
  return apiGet(ApiRoutes.chat.conversationMessages(conversationId, page, limit), {
    signal,
  });
}
