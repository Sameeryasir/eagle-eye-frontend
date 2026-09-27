/**
 * Change Summary:
 * - What: Uses shared apiPut + ApiRoutes.images.byId
 * - Why: Nest updates via PUT /images/:id (JSON or multipart)
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPut, ApiRoutes } from '../api/client';

export async function updateImageById(imageId, updateData, newFile = null) {
  // newFile kept in signature for call-site compatibility (unused by Nest body)
  void newFile;

  const isFormData = updateData instanceof FormData;
  const headers = isFormData
    ? { 'Content-Type': 'multipart/form-data' }
    : { 'Content-Type': 'application/json' };

  return apiPut(ApiRoutes.images.byId(imageId), updateData, { headers });
}
