export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (projectId: string | number) =>
      [...queryKeys.projects.all, 'detail', String(projectId)] as const,
    tasks: (projectId: string | number) =>
      [...queryKeys.projects.all, String(projectId), 'tasks'] as const,
    logs: (projectId: string | number) =>
      [...queryKeys.projects.all, String(projectId), 'logs'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: () => [...queryKeys.tasks.all, 'list'] as const,
    detail: (taskId: string | number) =>
      [...queryKeys.tasks.all, 'detail', String(taskId)] as const,
  },
  events: {
    all: ['events'] as const,
    list: () => [...queryKeys.events.all, 'list'] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    feed: (from?: string, to?: string) =>
      [...queryKeys.calendar.all, 'feed', from ?? 'default', to ?? 'default'] as const,
  },
  logs: {
    all: ['logs'] as const,
    detail: (logId: string | number) =>
      [...queryKeys.logs.all, 'detail', String(logId)] as const,
  },
  employees: {
    all: ['employees'] as const,
    assignees: () => [...queryKeys.employees.all, 'assignees'] as const,
  },
};
