import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type Method,
} from 'axios';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';
import { getAccessToken, getRefreshToken } from '../auth/session';
import { ApiError } from './errors';
import type { ApiErrorBody, ApiRequestOptions, HttpMethod } from './types';

export { API_URL };
export { ApiRoutes } from './routes';
export { ApiError, getErrorMessage } from './errors';
export type { ApiRequestOptions, Id, HttpMethod } from './types';

function isFormDataBody(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return true;
  const candidate = data as { constructor?: { name?: string }; append?: unknown; getParts?: unknown };
  return (
    candidate.constructor?.name === 'FormData' ||
    (typeof candidate.append === 'function' && typeof candidate.getParts === 'function')
  );
}

function buildUrl(path: string, params?: ApiRequestOptions['params']): string {
  const base = path.startsWith('http') ? path : `${API_URL}${path}`;
  if (!params) return base;

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    search.append(key, String(value));
  });

  const query = search.toString();
  if (!query) return base;
  return base.includes('?') ? `${base}&${query}` : `${base}?${query}`;
}

function normalizeErrorMessage(body: ApiErrorBody | null, fallback: string): string {
  const message = body?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

function toApiError(error: unknown, method: string, url: string): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    const status = axiosError.response?.status ?? null;
    const body = axiosError.response?.data ?? null;

    if (!axiosError.response) {
      return new ApiError({
        message: axiosError.message || 'Network request failed',
        status: null,
        code: 'NETWORK_ERROR',
        body: null,
        isNetworkError: true,
      });
    }

    return new ApiError({
      message: normalizeErrorMessage(
        body,
        axiosError.message || `${method.toUpperCase()} ${url} failed`
      ),
      status,
      code: body?.error ?? null,
      body,
      isNetworkError: false,
    });
  }

  return ApiError.fromUnknown(error);
}

async function apiRequest<TResponse>(
  method: HttpMethod | Method,
  path: string,
  data?: unknown,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const {
    auth = true,
    headers = {},
    timeout = 30000,
    signal,
    params,
  } = options;

  const url = buildUrl(path, params);
  const formData = isFormDataBody(data);

  const buildConfig = (token: string | null): AxiosRequestConfig => {
    const requestHeaders: Record<string, string> = {
      ...headers,
      ...(API_URL.includes('ngrok')
        ? { 'ngrok-skip-browser-warning': 'true' }
        : {}),
    };

    if (formData) {
      delete requestHeaders['Content-Type'];
    } else if (data !== undefined && requestHeaders['Content-Type'] === undefined) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (auth && token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    const config: AxiosRequestConfig = {
      method: method as Method,
      url,
      timeout,
      headers: requestHeaders,
      signal,
    };

    if (data !== undefined) {
      config.data = data;
    }

    if (formData) {
      config.transformRequest = [(payload) => payload];
    }

    return config;
  };

  let token: string | null = null;
  let refreshTokenValue: string | null = null;

  if (auth) {
    token = await getAccessToken();
    refreshTokenValue = await getRefreshToken();
  }

  try {
    const response = await axios(buildConfig(token));
    return response.data as TResponse;
  } catch (error) {
    const apiError = toApiError(error, String(method), url);

    if (auth && apiError.isUnauthorized && refreshTokenValue) {
      try {
        const newToken = await refreshToken(refreshTokenValue);
        const retry = await axios(buildConfig(newToken));
        return retry.data as TResponse;
      } catch (refreshError) {
        throw toApiError(refreshError, String(method), url);
      }
    }

    if (apiError.isNetworkError) {
      console.error('Network request failed:', {
        method,
        url,
        message: apiError.message,
        apiBase: API_URL,
      });
    }

    throw apiError;
  }
}

export const apiGet = <TResponse>(
  path: string,
  options?: ApiRequestOptions
): Promise<TResponse> => apiRequest<TResponse>('GET', path, undefined, options);

export const apiPost = <TResponse, TBody = unknown>(
  path: string,
  data?: TBody,
  options?: ApiRequestOptions
): Promise<TResponse> => apiRequest<TResponse>('POST', path, data, options);

export const apiPut = <TResponse, TBody = unknown>(
  path: string,
  data?: TBody,
  options?: ApiRequestOptions
): Promise<TResponse> => apiRequest<TResponse>('PUT', path, data, options);

export const apiPatch = <TResponse, TBody = unknown>(
  path: string,
  data?: TBody,
  options?: ApiRequestOptions
): Promise<TResponse> => apiRequest<TResponse>('PATCH', path, data, options);

export const apiDelete = <TResponse = void>(
  path: string,
  options?: ApiRequestOptions
): Promise<TResponse> => apiRequest<TResponse>('DELETE', path, undefined, options);

export const api = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
  request: apiRequest,
} as const;
