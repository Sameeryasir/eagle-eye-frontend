import { ApiError } from './errors';
import type { Id } from './types';

type ListCarrier<T> = {
  data?: T[] | unknown;
  items?: T[];
  results?: T[];
  tasks?: T[];
  projects?: T[];
  logs?: T[];
  events?: T[];
  users?: T[];
  employees?: T[];
  notifications?: T[];
  conversations?: T[];
  messages?: T[];
  [key: string]: unknown;
};

export function requireId(value: Id | null | undefined, label = 'ID'): Id {
  if (value === null || value === undefined || value === '') {
    throw new ApiError({ message: `${label} is required`, status: 400 });
  }
  return value;
}

export function toNumberId(value: Id): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    throw new ApiError({ message: 'Invalid ID provided', status: 400 });
  }
  return parsed;
}

export function unwrapList<T = unknown>(
  payload: unknown,
  keys: Array<keyof ListCarrier<T>> = [
    'data',
    'items',
    'results',
    'tasks',
    'projects',
    'logs',
    'events',
    'users',
    'employees',
    'notifications',
    'conversations',
    'messages',
  ]
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const record = payload as ListCarrier<T>;
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }

  return [];
}

export function unwrapData<T = unknown>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in (payload as Record<string, unknown>) &&
    (payload as { data: unknown }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
