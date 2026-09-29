import { apiGet, apiPost, apiPut, apiDelete } from '../client';
import { ApiRoutes } from '../routes';
import { ApiError } from '../errors';
import { requireId, unwrapData, unwrapList } from '../normalize';
import type {
  CreateProjectPayload,
  Id,
  Project,
  ProjectDetailsResponse,
  UpdateProjectPayload,
  User,
} from '../models';
import type { Task } from '../models/task';
import type { LogEntry } from '../models/log';

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const response = await apiGet<unknown>(ApiRoutes.projects.list);
    return unwrapList<Project>(response, ['projects', 'data', 'items']);
  },

  getById: async (projectId: Id): Promise<Project> => {
    const response = await apiGet<unknown>(
      ApiRoutes.projects.byId(requireId(projectId, 'Project ID'))
    );
    return unwrapData<Project>(response);
  },

  // --- Project Details: single call used by ProjectDetailsScreen ---
  getDetails: async (projectId: Id): Promise<ProjectDetailsResponse> => {
    const response = await apiGet<unknown>(
      ApiRoutes.projects.details(requireId(projectId, 'Project ID'))
    );
    const data = unwrapData<ProjectDetailsResponse>(response);
    return {
      project: (data?.project ?? data) as Project,
      team: unwrapList<User>(data, ['team', 'employees', 'users']),
      tasks: unwrapList<Task>(data, ['tasks', 'data', 'items']),
      logs: unwrapList<LogEntry>(data, ['logs', 'data', 'items']),
    };
  },

  create: (data: CreateProjectPayload): Promise<Project> =>
    apiPost<Project, CreateProjectPayload>(ApiRoutes.projects.create, data),

  update: (id: Id, data: UpdateProjectPayload): Promise<Project> =>
    apiPut<Project, UpdateProjectPayload>(
      ApiRoutes.projects.byId(requireId(id, 'Project ID')),
      data
    ),

  remove: (projectId: Id): Promise<unknown> =>
    apiDelete(ApiRoutes.projects.byId(requireId(projectId, 'Project ID'))),

  assignToEmployees: (payload: {
    projectIds: Id[];
    employeeIds: Id[];
  }): Promise<unknown> =>
    apiPost(ApiRoutes.projects.assignToEmployees, payload),

  employeesAssigned: async (projectId: Id): Promise<User[]> => {
    const response = await apiGet<unknown>(
      ApiRoutes.projects.employeesAssigned(requireId(projectId, 'Project ID'))
    );
    return unwrapList<User>(response, ['employees', 'users', 'data', 'items']);
  },

  assignedTasks: (projectId: Id): Promise<unknown> =>
    apiGet(ApiRoutes.projects.assignedTasks(requireId(projectId, 'Project ID'))),

  files: (projectId: Id): Promise<unknown> =>
    apiGet(ApiRoutes.projects.files(requireId(projectId, 'Project ID'))),
};

export async function createProject(data: CreateProjectPayload): Promise<Project> {
  return projectsApi.create(data);
}

export async function getMyProjects(): Promise<Project[]> {
  return projectsApi.list();
}

export async function getProject(projectId: Id): Promise<Project> {
  return projectsApi.getById(projectId);
}

export const getProjectById = getProject;

export async function getProjectDetails(
  projectId: Id
): Promise<ProjectDetailsResponse> {
  return projectsApi.getDetails(projectId);
}

export async function updateProjectById(
  id: Id,
  updateData: UpdateProjectPayload
): Promise<Project> {
  return projectsApi.update(id, updateData);
}

export async function deleteProjectById(projectId: Id): Promise<unknown> {
  return projectsApi.remove(projectId);
}

export async function assignProjectToEmployees(assignData: {
  projectIds: Id[];
  employeeIds: Id[];
}): Promise<unknown> {
  return projectsApi.assignToEmployees(assignData);
}

export async function getEmployeesAssignedToProject(projectId: Id): Promise<User[]> {
  return projectsApi.employeesAssigned(projectId);
}

export async function getTaskAssignedToManager(projectId: Id): Promise<unknown> {
  const data = await projectsApi.assignedTasks(projectId);
  const tasks = unwrapList(data, ['tasks', 'data', 'items']);
  if (tasks.length === 0) {
    throw new ApiError({
      message: 'No tasks are assigned to you for this project yet.',
      status: 400,
      code: 'Bad Request',
    });
  }
  return data;
}

export async function getFilesByProjectId(projectId: Id): Promise<unknown> {
  return projectsApi.files(projectId);
}
