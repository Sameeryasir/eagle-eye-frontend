export type CalendarItemType = 'task' | 'event';

export interface CalendarTaskItem {
  id: number | string;
  title: string;
  type: 'task';
  startTime: Date | null;
  endTime: Date | null;
  startTimeFormatted: string;
  endTimeFormatted: string;
  hasEndTime: boolean;
  description: string;
  priority?: string | null;
  status?: string | null;
  assignedTo?: unknown;
}

export interface CalendarEventItem {
  id: number | string;
  title: string;
  type: 'event';
  startTime: Date | null;
  endTime: Date | null;
  startTimeFormatted: string;
  endTimeFormatted: string;
  description: string;
  priority?: string | null;
  status?: string | null;
  assignedTo?: unknown[];
  projects?: unknown[];
  isMultiDayEvent: boolean;
  originalStartDate: string;
  originalEndDate: string;
  currentDisplayDate?: string;
}

export type CalendarDayItem = CalendarTaskItem | CalendarEventItem;

export function toLocalDateKey(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr} ${timeStr}`;
}

export function formatDisplayDate(dateKey?: string | null): string {
  if (!dateKey) return 'Selected Date';
  const [year, month, day] = dateKey.split('-');
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthName = monthNames[parseInt(month, 10) - 1] || '';
  return `${monthName} ${parseInt(day, 10)}, ${year}`;
}

export function eachDateKeyInclusive(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${startKey}T12:00:00`);
  const end = new Date(`${endKey}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) {
    return startKey ? [startKey] : [];
  }
  while (cursor <= end) {
    keys.push(toLocalDateKey(cursor) as string);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function getPriorityColor(priority?: string | null): string {
  switch (String(priority || '').toLowerCase()) {
    case 'high':
    case 'urgent':
    case 'critical':
      return '#C0392B';
    case 'medium':
    case 'normal':
      return '#C05621';
    case 'low':
    case 'lowest':
      return '#1B7A4A';
    default:
      return '#6E6869';
  }
}

export function groupTasksByDate(tasksArray: any[] = []): Record<string, CalendarTaskItem[]> {
  const tasksByDate: Record<string, CalendarTaskItem[]> = {};

  (tasksArray || []).forEach((task) => {
    if (!task?.startTime) return;
    const taskDate = toLocalDateKey(task.startTime);
    if (!taskDate) return;

    if (!tasksByDate[taskDate]) tasksByDate[taskDate] = [];
    tasksByDate[taskDate].push({
      id: task.id,
      title: task.title || 'Untitled Task',
      type: 'task',
      startTime: task.startTime ? new Date(task.startTime) : null,
      endTime: task.endTime ? new Date(task.endTime) : null,
      startTimeFormatted: task.startTime ? formatDateTime(task.startTime) : 'No time set',
      endTimeFormatted: task.endTime ? formatDateTime(task.endTime) : 'No end time',
      hasEndTime: task.endTime != null,
      description: task.description || 'No description',
      priority: task.priority,
      status: task.status,
      assignedTo: task.assigned_to || task.assignedTo,
    });
  });

  return tasksByDate;
}

export function groupEventsByDate(eventsArray: any[] = []): Record<string, CalendarEventItem[]> {
  const eventsByDate: Record<string, CalendarEventItem[]> = {};

  (eventsArray || []).forEach((event) => {
    if (!event?.startTime) return;

    const startKey = toLocalDateKey(event.startTime);
    const endKey = toLocalDateKey(event.endTime || event.startTime) || startKey;
    if (!startKey || !endKey) return;

    const isMultiDayEvent = startKey !== endKey;
    const eventObject: CalendarEventItem = {
      id: event.id,
      title: event.title || 'Untitled Event',
      type: 'event',
      startTime: event.startTime ? new Date(event.startTime) : null,
      endTime: event.endTime ? new Date(event.endTime) : null,
      startTimeFormatted: event.startTime ? formatDateTime(event.startTime) : 'No time set',
      endTimeFormatted: event.endTime ? formatDateTime(event.endTime) : 'No end time',
      description: event.description || 'No description',
      priority: event.priority,
      status: event.status,
      assignedTo: event.assignedTo || [],
      projects: event.projects || [],
      isMultiDayEvent,
      originalStartDate: startKey,
      originalEndDate: endKey,
    };

    eachDateKeyInclusive(startKey, endKey).forEach((dateKey) => {
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push({
        ...eventObject,
        currentDisplayDate: dateKey,
      });
    });
  });

  return eventsByDate;
}

export function combineTasksAndEvents(
  tasksByDate: Record<string, CalendarTaskItem[]> = {},
  eventsByDate: Record<string, CalendarEventItem[]> = {}
): Record<string, CalendarDayItem[]> {
  const combined: Record<string, CalendarDayItem[]> = {};
  const allDates = new Set([
    ...Object.keys(tasksByDate),
    ...Object.keys(eventsByDate),
  ]);

  allDates.forEach((date) => {
    const dayItems = [
      ...(tasksByDate[date] || []),
      ...(eventsByDate[date] || []),
    ].sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0;
      return a.startTime.getTime() - b.startTime.getTime();
    });
    if (dayItems.length > 0) combined[date] = dayItems;
  });

  return combined;
}

export function unwrapTaskList(response: unknown): any[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.tasks)) return obj.tasks;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}

export function unwrapEventList(response: unknown): any[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.events)) return obj.events;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}
