import { apiPost, ApiRoutes } from '../api/client';

export async function getMessageAfterLastMessage(
  conversationId,
  afterMessageId,
  page = 1,
  limit = 20
) {
  return apiPost(
    `${ApiRoutes.chat.messagesNew}?page=${page}&limit=${limit}`,
    {
      conversationId: Number(conversationId),
      afterMessageId: Number(afterMessageId),
    }
  );
}
