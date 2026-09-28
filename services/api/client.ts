import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';
import { getAccessToken, getRefreshToken } from '../auth/session';

export { API_URL };
export { ApiRoutes } from './routes';

export interface ApiRequestOptions {
  data?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  timeout?: number;
  signal?: AbortSignal;
}

export async function apiRequest<T = any>(
  method: Method | string,
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    data,
    headers = {},
    auth = true,
    timeout = 30000,
    signal,
  } = options;

  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const isFormData =
    !!data &&
    ((typeof FormData !== 'undefined' && data instanceof FormData) ||
      (data as any)?.constructor?.name === 'FormData' ||
      (typeof (data as any).append === 'function' &&
        typeof (data as any).getParts === 'function'));

  const buildConfig = (token: string | null): AxiosRequestConfig => {
    const cfg: AxiosRequestConfig = {
      method: method as Method,
      url,
      timeout,
      headers: {
        ...headers,
        ...(API_URL.includes('ngrok')
          ? { 'ngrok-skip-browser-warning': 'true' }
          : {}),
      },
    };
    if (signal) {
      cfg.signal = signal;
    }
    if (data !== undefined) {
      cfg.data = data;
    }
    if (isFormData) {
      if (cfg.headers) {
        delete (cfg.headers as Record<string, unknown>)['Content-Type'];
      }
      cfg.transformRequest = [(payload) => payload];
    } else if (
      cfg.headers &&
      (cfg.headers as Record<string, unknown>)['Content-Type'] === undefined &&
      data !== undefined
    ) {
      (cfg.headers as Record<string, string>)['Content-Type'] =
        'application/json';
    }
    if (auth && token && cfg.headers) {
      (cfg.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return cfg;
  };

  let token: string | null = null;
  let refreshTokenValue: string | null = null;
  if (auth) {
    token = await getAccessToken();
    refreshTokenValue = await getRefreshToken();
  }

  try {
    const response = await axios(buildConfig(token));
    return response.data as T;
  } catch (err) {
    if (
      auth &&
      axios.isAxiosError(err) &&
      err.response?.status === 401 &&
      refreshTokenValue
    ) {
      const newToken = await refreshToken(refreshTokenValue);
      const response = await axios(buildConfig(newToken));
      return response.data as T;
    }
    if (axios.isAxiosError(err) && !err.response) {
      console.error('Network request failed:', {
        method,
        url,
        message: err.message,
        apiBase: API_URL,
      });
    }
    throw err;
  }
}

export const apiGet = <T = any>(path: string, options?: ApiRequestOptions) =>
  apiRequest<T>('get', path, options);

export const apiPost = <T = any>(
  path: string,
  data?: unknown,
  options: ApiRequestOptions = {}
) => apiRequest<T>('post', path, { ...options, data });

export const apiPut = <T = any>(
  path: string,
  data?: unknown,
  options: ApiRequestOptions = {}
) => apiRequest<T>('put', path, { ...options, data });

export const apiDelete = <T = any>(
  path: string,
  options?: ApiRequestOptions
) => apiRequest<T>('delete', path, options);
