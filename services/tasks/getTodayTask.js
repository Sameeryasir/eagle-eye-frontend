import { apiGet, ApiRoutes } from '../api/client';

export default async function getTodaysTask() {
  return apiGet(ApiRoutes.tasks.today);
}
