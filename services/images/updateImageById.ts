import { apiPut, ApiRoutes, type Id } from '../api';

export async function updateImageById(
  imageId: Id,
  updateData: FormData | Record<string, unknown>,
  newFile: unknown = null
): Promise<unknown> {
  void newFile;

  const isFormData =
    typeof FormData !== 'undefined' && updateData instanceof FormData;
  const headers = isFormData
    ? { 'Content-Type': 'multipart/form-data' }
    : { 'Content-Type': 'application/json' };

  return apiPut(ApiRoutes.images.byId(imageId), updateData, { headers });
}
