import { apiPost, ApiRoutes } from '../api/client';

export const createProjectConversation = async (projectId) => {
  return apiPost(ApiRoutes.chat.projectConversation(projectId), {});
};
