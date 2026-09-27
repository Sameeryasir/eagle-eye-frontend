import { apiPut, ApiRoutes } from '../api/client';

export async function updateImageById(imageId, updateData, newFile = null) {
  void newFile;

  const isFormData = updateData instanceof FormData;
  const headers = isFormData
    ? { 'Content-Type': 'multipart/form-data' }
    : { 'Content-Type': 'application/json' };

  return apiPut(ApiRoutes.images.byId(imageId), updateData, { headers });
}
