/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.tasks.list
 * - Why: Nest lists tasks at GET /tasks
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 *
 * NOTE: Keeps { success, data } wrapper — CalenderScreen / taskSlice expect response.data
 */
import { apiGet, ApiRoutes } from '../api/client';

const getAllTasks = async () => {
  const data = await apiGet(ApiRoutes.tasks.list);
  return {
    success: true,
    data: data?.tasks || data,
  };
};

export default getAllTasks;
