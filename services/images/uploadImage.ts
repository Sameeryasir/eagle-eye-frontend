import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { API_URL, ApiRoutes, ApiError, type Id } from '../api';
import refreshToken from '../utils/tokenRefresh';
import { getAccessToken, getRefreshToken } from '../auth/session';

type ImageUploadInput = string | { uri?: string; name?: string };

export interface UploadImageOptions {
  logId?: Id;
}

function toFileList(files: ImageUploadInput | ImageUploadInput[] | null | undefined): ImageUploadInput[] {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return [files];
}

async function appendImagePart(formData: FormData, item: ImageUploadInput): Promise<void> {
  const uri = typeof item === 'string' ? item : item?.uri;
  if (!uri) {
    throw new ApiError({ message: 'Missing image uri', status: 400 });
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

async function postFormData(formData: FormData, token: string | null) {
  return expoFetch(`${API_URL}${ApiRoutes.images.create}`, {
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
}

export async function uploadImage(
  files: ImageUploadInput | ImageUploadInput[],
  options: UploadImageOptions = {}
): Promise<unknown> {
  const list = toFileList(files);
  if (!list.length) {
    throw new ApiError({ message: 'No images to upload', status: 400 });
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

  let body: any = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }

  if (!response.ok) {
    const message =
      body?.message ||
      `Image upload failed (${response.status || 'network'})`;
    throw new ApiError({
      message: Array.isArray(message) ? message.join(', ') : String(message),
      status: response.status || null,
      body,
    });
  }

  return body;
}
