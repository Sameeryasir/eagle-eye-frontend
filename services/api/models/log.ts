import type { Id } from '../types';
import type { User } from './user';

export interface LogImage {
  id?: number;
  imageUrl?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  id: number;
  note?: string | null;
  createdAt?: string;
  user?: User | null;
  images?: LogImage[];
  [key: string]: unknown;
}

export interface CreateLogPayload {
  note?: string;
  projectId?: Id;
  taskId?: Id;
  [key: string]: unknown;
}

export type UpdateLogPayload = Partial<CreateLogPayload>;

export interface LogsListResponse {
  logs?: LogEntry[];
  data?: LogEntry[];
  [key: string]: unknown;
}
