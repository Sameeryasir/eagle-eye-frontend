import { apiGet, ApiRoutes } from '../api/client';

export default async function getTasksByloginId() {
  return apiGet(ApiRoutes.tasks.list);
}
