import { apiGet, ApiRoutes } from '../api/client';

const getAllTasks = async () => {
  const data = await apiGet(ApiRoutes.tasks.list);
  return {
    success: true,
    data: data?.tasks || data,
  };
};

export default getAllTasks;
