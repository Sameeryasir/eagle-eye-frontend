import { apiGet, ApiRoutes } from '../api/client';

export async function getFilesForConversation(conversationId) {
  return apiGet(ApiRoutes.chat.conversationFiles(conversationId));
}
