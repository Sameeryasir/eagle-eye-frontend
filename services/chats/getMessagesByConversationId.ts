import { apiGet, ApiRoutes } from '../api/client';

export async function getMessagesByConversationId(
  conversationId: any,
  page = 1,
  limit = 20,
  { signal }: { signal?: AbortSignal } = {}
) {
  return apiGet(ApiRoutes.chat.conversationMessages(conversationId, page, limit), {
    signal,
  });
}
