import { apiGet, ApiRoutes } from '../api/client';

export async function getSignaturesOfConversation(conversationId) {
  return apiGet(ApiRoutes.signature.byConversation(conversationId));
}
