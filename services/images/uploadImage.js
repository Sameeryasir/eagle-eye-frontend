import { apiPost, ApiRoutes } from '../api/client';

export async function uploadImage(formData) {
  return apiPost(ApiRoutes.images.create, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
