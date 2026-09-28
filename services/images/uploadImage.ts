import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { API_URL, ApiRoutes } from '../api/client';
import refreshToken from '../utils/tokenRefresh';
import { getAccessToken, getRefreshToken } from '../auth/session';

function toFileList(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return [files];
}

async function appendImagePart(formData, item) {
  const uri = typeof item === 'string' ? item : item?.uri;
  if (!uri) {
    throw new Error('Missing image uri');
  }

  const filename =
    (typeof item === 'object' && item?.name) ||
    uri.split('/').pop() ||
    `image_${Date.now()}.jpg`;

  try {
    formData.append('images', new File(uri), filename);
    return;
  } catch (_) {
  }

  const blob = await (await fetch(uri)).blob();
  formData.append('images', blob, filename);
}

async function postFormData(formData, token) {
  const response = await expoFetch(`${API_URL}${ApiRoutes.images.create}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(API_URL.includes('ngrok')
        ? { 'ngrok-skip-browser-warning': 'true' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  return response;
}

export async function uploadImage(files: any, options: Record<string, any> = {}) {
  const list = toFileList(files);
  if (!list.length) {
    throw new Error('No images to upload');
  }

  const formData = new FormData();
  for (const item of list) {
    await appendImagePart(formData, item);
  }

  if (options.logId != null) {
    formData.append('logId', String(options.logId));
  }

  let token = await getAccessToken();
  let response = await postFormData(formData, token);

  if (response.status === 401) {
    const refreshTokenValue = await getRefreshToken();
    if (refreshTokenValue) {
      token = await refreshToken(refreshTokenValue);
      response = await postFormData(formData, token);
    }
  }

  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }

  if (!response.ok) {
    const message =
      body?.message ||
      `Image upload failed (${response.status || 'network'})`;
    const error: any = new Error(
      Array.isArray(message) ? message.join(', ') : String(message)
    );
    error.response = { status: response.status, data: body };
    throw error;
  }

  return body;
}
