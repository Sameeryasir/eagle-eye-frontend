type Id = string | number;

export const ApiRoutes = {
  auth: {
    health: '/auth/health',
    register: '/auth/register',
    sendOtp: '/auth/otp/send',
    verifyOtp: '/auth/otp/verify',
    refreshToken: '/auth/token/refresh',
    session: '/auth/session',
    sendInvitation: '/auth/send-invitation',
  },
  users: {
    list: '/users',
    byId: (id: Id) => `/users/${id}`,
    create: '/users',
    team: '/users/team',
    push: '/users/push-notifications',
    employeesForConversation: '/users/employees-for-conversation',
  },
  companies: {
    list: '/companies',
    create: '/companies',
    byId: (id: Id) => `/companies/${id}`,
  },
  projects: {
    list: '/projects',
    forLogs: '/projects/for-logs',
    byId: (id: Id) => `/projects/${id}`,
    details: (id: Id) => `/projects/${id}/details`,
    assignedTasks: (id: Id) => `/projects/${id}/assigned-tasks`,
    create: '/projects',
    assignToEmployees: '/project/assign-to-employees',
    employeesAssigned: (id: Id) => `/project/employeesassigned/${id}`,
    files: (id: Id) => `/project-files/${id}`,
  },
  tasks: {
    list: '/tasks',
    today: '/tasks/today',
    assignees: '/tasks/assignees',
    byId: (id: Id) => `/tasks/${id}`,
    byProject: (projectId: Id) => `/tasks/by-project/${projectId}`,
    byProjectWithLogs: (projectId: Id) =>
      `/tasks/by-project/${projectId}/with-logs`,
    filter: '/tasks/filter',
    create: '/tasks',
    assign: (id: Id) => `/tasks/${id}/assign`,
  },
  logs: {
    byProject: (projectId: Id) => `/logs/by-project/${projectId}`,
    recentByProject: (projectId: Id) => `/logs/by-project/${projectId}/recent`,
    byId: (id: Id) => `/logs/${id}`,
    create: '/logs',
  },
  events: {
    list: '/events',
    upcoming: '/events/upcoming',
    byDate: (date: string) => `/events/by-date/${date}`,
    byId: (id: Id) => `/events/${id}`,
    create: '/events',
  },
  calendar: {
    feed: '/calendar/feed',
  },
  images: {
    create: '/images',
    byId: (id: Id) => `/images/${id}`,
  },
  notifications: {
    tokens: '/notifications/tokens',
    tokenById: (id: Id) => `/notifications/tokens/${id}`,
    test: '/notifications/test',
  },
  userNotifications: {
    list: '/users-notifications/user',
    unread: '/users-notifications/unread',
    readAll: '/users-notifications/read-all',
    byId: (id: Id) => `/users-notifications/${id}`,
    message: '/users-notifications/message',
    task: '/users-notifications',
    project: '/users-notifications/project',
    event: '/users-notifications/event',
  },
  chat: {
    conversations: '/chat/conversations',
    conversationMessages: (id: Id, page: number, limit: number) =>
      `/chat/conversations/${id}/messages?page=${page}&limit=${limit}`,
    conversationFiles: (id: Id) => `/chat/conversations/${id}/files`,
    messagesNew: '/chat/conversations/messages/new',
    messages: '/chat/messages',
    typing: '/chat/typing',
    projectConversation: (projectId: Id) =>
      `/chat/project-conversations/${projectId}`,
  },
  signature: {
    messageWithSignature: '/signature/message-with-signature',
    byConversation: (conversationId: Id) =>
      `/signature/signature/${conversationId}`,
    signedUser: '/signature/signed/user',
    uploadFile: (contractId: Id) => `/signature/${contractId}/upload-file`,
  },
} as const;
