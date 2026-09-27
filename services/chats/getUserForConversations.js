import { apiGet, ApiRoutes } from '../api/client';

export async function getUserForConversations() {
  return apiGet(ApiRoutes.users.employeesForConversation);
}
