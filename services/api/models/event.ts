import type { Id } from '../types';

export interface AppEvent {
  id: number;
  title?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string | null;
  [key: string]: unknown;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

export interface EventsListResponse {
  events?: AppEvent[];
  data?: AppEvent[];
  [key: string]: unknown;
}

export type EventId = Id;
