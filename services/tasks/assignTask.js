import { apiPost, ApiRoutes } from '../api/client';

export async function assignTaskToUser(taskId, userId) {
  if (!taskId) {
    throw new Error('Task ID is required');
  }
  if (!userId) {
    throw new Error('User ID is required');
  }

  return apiPost(ApiRoutes.tasks.assign(taskId), { assignedToUserId: userId });
}
