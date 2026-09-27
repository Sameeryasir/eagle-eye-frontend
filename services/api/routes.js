/**
 * Change Summary:
 * - What: Canonical API paths matching backend ApiPaths (plural REST)
 * - Why: One map so frontend never drifts into 404s after renames
 * Convention: plural nouns, HTTP method for create/update/delete, kebab-case
 */
export const ApiRoutes = {
  auth: {
    health: '/auth/health',
    sendOtp: '/auth/otp/send',
    verifyOtp: '/auth/otp/verify',
    refreshToken: '/auth/token/refresh',
    session: '/auth/session',
  },
  users: {
    list: '/users',
    byId: (id) => `/users/${id}`,
    create: '/users',
    push: '/users/push-notifications',
  },
  companies: {
    list: '/companies',
    create: '/companies',
    byId: (id) => `/companies/${id}`,
  },
  projects: {
    list: '/projects',
    forLogs: '/projects/for-logs',
    byId: (id) => `/projects/${id}`,
    assignedTasks: (id) => `/projects/${id}/assigned-tasks`,
    create: '/projects',
  },
  tasks: {
    list: '/tasks',
    today: '/tasks/today',
    assignees: '/tasks/assignees',
    byId: (id) => `/tasks/${id}`,
    byProject: (projectId) => `/tasks/by-project/${projectId}`,
    byProjectWithLogs: (projectId) =>
      `/tasks/by-project/${projectId}/with-logs`,
    filter: '/tasks/filter',
    create: '/tasks',
    assign: (id) => `/tasks/${id}/assign`,
  },
  logs: {
    byProject: (projectId) => `/logs/by-project/${projectId}`,
    recentByProject: (projectId) => `/logs/by-project/${projectId}/recent`,
    byId: (id) => `/logs/${id}`,
    create: '/logs',
  },
  events: {
    list: '/events',
    upcoming: '/events/upcoming',
    byDate: (date) => `/events/by-date/${date}`,
    byId: (id) => `/events/${id}`,
    create: '/events',
  },
  images: {
    create: '/images',
    byId: (id) => `/images/${id}`,
  },
  notifications: {
    tokens: '/notifications/tokens',
    tokenById: (id) => `/notifications/tokens/${id}`,
    test: '/notifications/test',
  },
};
