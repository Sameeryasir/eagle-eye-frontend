import { apiGet, ApiRoutes } from '../api/client';

export async function getSignedSignatures() {
  return apiGet(ApiRoutes.signature.signedUser);
}
