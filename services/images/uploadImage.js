/**
 * Change Summary:
 * - What: Uses shared apiPost + ApiRoutes.images.create (multipart)
 * - Why: Nest upload path is POST /images
 * - Dependencies: services/api/client.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPost, ApiRoutes } from '../api/client';

export async function uploadImage(formData) {
  return apiPost(ApiRoutes.images.create, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
