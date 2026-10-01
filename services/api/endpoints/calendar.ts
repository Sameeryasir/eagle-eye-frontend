import { apiGet } from '../client';
import { ApiRoutes } from '../routes';
import { unwrapData } from '../normalize';
import type { Task } from '../models/task';
import type { AppEvent } from '../models/event';

export type CalendarFeedMeta = {
  taskLimit: number;
  eventLimit: number;
  truncatedTasks: boolean;
  truncatedEvents: boolean;
  taskCount: number;
  eventCount: number;
};

export type CalendarFeedResponse = {
  from: string;
  to: string;
  tasks: Task[];
  events: AppEvent[];
  meta?: CalendarFeedMeta;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function defaultCalendarRange(anchor = new Date()): {
  from: string;
  to: string;
} {
  const fromDate = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const toDate = new Date(anchor.getFullYear(), anchor.getMonth() + 2, 0);
  return {
    from: toDateKey(fromDate),
    to: toDateKey(toDate),
  };
}

export function calendarRangeForMonth(monthKey: string): {
  from: string;
  to: string;
} {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !month) return defaultCalendarRange();
  const fromDate = new Date(year, month - 2, 1);
  const toDate = new Date(year, month + 1, 0);
  return {
    from: toDateKey(fromDate),
    to: toDateKey(toDate),
  };
}

export function calendarRangeForWeek(weekStart: Date): {
  from: string;
  to: string;
} {
  const start = new Date(weekStart);
  start.setHours(12, 0, 0, 0);
  const fromDate = new Date(start);
  fromDate.setDate(fromDate.getDate() - 7);
  const toDate = new Date(start);
  toDate.setDate(toDate.getDate() + 20);
  return {
    from: toDateKey(fromDate),
    to: toDateKey(toDate),
  };
}

export async function getCalendarFeed(options?: {
  from?: string;
  to?: string;
}): Promise<CalendarFeedResponse> {
  const range = {
    ...defaultCalendarRange(),
    ...(options?.from ? { from: options.from } : {}),
    ...(options?.to ? { to: options.to } : {}),
  };

  const response = await apiGet<unknown>(ApiRoutes.calendar.feed, {
    params: range,
  });

  const data = unwrapData<CalendarFeedResponse>(response);
  return {
    from: data?.from || range.from,
    to: data?.to || range.to,
    tasks: Array.isArray(data?.tasks) ? data.tasks : [],
    events: Array.isArray(data?.events) ? data.events : [],
    meta: data?.meta,
  };
}

export const calendarApi = {
  feed: getCalendarFeed,
};
