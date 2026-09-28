export type Id = string | number;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  auth?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiMessageEnvelope {
  success: true;
  message: string;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiMessageEnvelope;

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  [key: string]: unknown;
}
