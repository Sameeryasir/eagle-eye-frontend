import { apiPost, ApiRoutes } from '../api/client';

export async function registerCompany(payload) {
  return apiPost(ApiRoutes.auth.register, payload, { auth: false });
}

export default registerCompany;
