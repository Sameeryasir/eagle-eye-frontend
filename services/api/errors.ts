import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly body: ApiErrorBody | null;
  readonly isNetworkError: boolean;

  constructor(args: {
    message: string;
    status?: number | null;
    code?: string | null;
    body?: ApiErrorBody | null;
    isNetworkError?: boolean;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status ?? null;
    this.code = args.code ?? null;
    this.body = args.body ?? null;
    this.isNetworkError = args.isNetworkError ?? false;
  }

  static fromUnknown(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof Error) {
      return new ApiError({ message: error.message });
    }
    return new ApiError({ message: 'Unexpected API error' });
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

function readMessage(value: unknown): string | null {
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(', ').trim();
    return joined || null;
  }
  if (typeof value === 'string' && value.trim()) return value;
  return null;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) {
    return (
      readMessage(error.body?.message) ||
      error.message ||
      fallback
    );
  }

  if (error && typeof error === 'object') {
    const maybeAxios = error as {
      response?: { data?: { message?: unknown } };
      message?: unknown;
    };
    const fromResponse = readMessage(maybeAxios.response?.data?.message);
    if (fromResponse) return fromResponse;
    const fromMessage = readMessage(maybeAxios.message);
    if (fromMessage) return fromMessage;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
