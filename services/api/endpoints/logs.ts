import { apiGet, apiPost, apiPut, apiDelete } from '../client';
import { ApiRoutes } from '../routes';
import { requireId, unwrapList } from '../normalize';
import type {
  CreateLogPayload,
  Id,
  LogEntry,
  UpdateLogPayload,
} from '../models';

export const logsApi = {
  byProject: async (projectId: Id): Promise<LogEntry[]> => {
    const response = await apiGet<unknown>(
      ApiRoutes.logs.byProject(requireId(projectId, 'Project ID'))
    );
    return unwrapList<LogEntry>(response, ['logs', 'data', 'items']);
  },

  recentByProject: async (projectId: Id): Promise<LogEntry[]> => {
    const response = await apiGet<unknown>(
      ApiRoutes.logs.recentByProject(requireId(projectId, 'Project ID'))
    );
    return unwrapList<LogEntry>(response, ['logs', 'data', 'items']);
  },

  getById: (logId: Id): Promise<LogEntry> =>
    apiGet<LogEntry>(ApiRoutes.logs.byId(requireId(logId, 'Log ID'))),

  create: (data: CreateLogPayload): Promise<LogEntry> =>
    apiPost<LogEntry, CreateLogPayload>(ApiRoutes.logs.create, data),

  update: (logId: Id, data: UpdateLogPayload): Promise<LogEntry> =>
    apiPut<LogEntry, UpdateLogPayload>(
      ApiRoutes.logs.byId(requireId(logId, 'Log ID')),
      data
    ),

  remove: (logId: Id): Promise<unknown> =>
    apiDelete(ApiRoutes.logs.byId(requireId(logId, 'Log ID'))),

  byProjectWithLogs: (projectId: Id): Promise<unknown> =>
    apiGet(ApiRoutes.tasks.byProjectWithLogs(requireId(projectId, 'Project ID'))),
};

export async function createLog(data: CreateLogPayload): Promise<LogEntry> {
  return logsApi.create(data);
}

export async function getLogs(projectId: Id): Promise<LogEntry[]> {
  return logsApi.byProject(projectId);
}

export async function getLogsByProjectId(projectId: Id): Promise<unknown> {
  return logsApi.byProjectWithLogs(projectId);
}

export async function getLogById(logId: Id): Promise<LogEntry> {
  return logsApi.getById(logId);
}

export async function getLogsForOwnerRecent(projectId: Id): Promise<LogEntry[]> {
  return logsApi.recentByProject(projectId);
}

export async function updateLogById(
  logId: Id,
  updateData: UpdateLogPayload
): Promise<LogEntry> {
  return logsApi.update(logId, updateData);
}

export async function deleteLogById(logId: Id): Promise<unknown> {
  return logsApi.remove(logId);
}
