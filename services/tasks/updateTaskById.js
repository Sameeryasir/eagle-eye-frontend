import { apiPut, ApiRoutes } from '../api/client';

export const updateTask = async (taskId, taskData) => {
  return apiPut(ApiRoutes.tasks.byId(taskId), taskData);
};
