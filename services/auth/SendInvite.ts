import { apiPost, ApiRoutes } from '../api/client';

export async function sendInvite(email, projectId) {
  return apiPost(ApiRoutes.auth.sendInvitation, { email, projectId });
}

export default sendInvite;
