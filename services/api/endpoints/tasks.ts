import { apiGet, apiPost, apiPut, apiDelete } from '../client';
import { ApiRoutes } from '../routes';
import { ApiError } from '../errors';
import { requireId, toNumberId, unwrapList } from '../normalize';
import type {
  AssignTaskPayload,
  CreateTaskPayload,
  FilterTasksPayload,
  Id,
  Task,
  UpdateTaskPayload,
  User,
} from '../models';

export const tasksApi = {
  list: async (): Promise<Task[]> => {
    const response = await apiGet<unknown>(ApiRoutes.tasks.list);
    return unwrapList<Task>(response, ['tasks', 'data', 'items']);
  },

  today: async (): Promise<Task[]> => {
    const response = await apiGet<unknown>(ApiRoutes.tasks.today);
    return unwrapList<Task>(response, ['tasks', 'data', 'items']);
  },

  getById: (taskId: Id): Promise<Task> =>
    apiGet<Task>(ApiRoutes.tasks.byId(requireId(taskId, 'Task ID'))),

  byProject: async (projectId: Id): Promise<Task[]> => {
    const response = await apiGet<unknown>(
      ApiRoutes.tasks.byProject(requireId(projectId, 'Project ID'))
    );
    return unwrapList<Task>(response, ['tasks', 'data', 'items']);
  },

  create: (taskData: CreateTaskPayload): Promise<Task> =>
    apiPost<Task, CreateTaskPayload>(ApiRoutes.tasks.create, taskData),

  update: (taskId: Id, taskData: UpdateTaskPayload): Promise<Task> =>
    apiPut<Task, UpdateTaskPayload>(
      ApiRoutes.tasks.byId(requireId(taskId, 'Task ID')),
      taskData
    ),

  remove: (taskId: Id): Promise<unknown> =>
    apiDelete(ApiRoutes.tasks.byId(requireId(taskId, 'Task ID'))),

  assign: (taskId: Id, userId: Id): Promise<unknown> =>
    apiPost<unknown, AssignTaskPayload>(
      ApiRoutes.tasks.assign(requireId(taskId, 'Task ID')),
      { assignedToUserId: requireId(userId, 'User ID') }
    ),

  filter: async (payload: FilterTasksPayload): Promise<Task[]> => {
    const response = await apiPost<unknown, FilterTasksPayload>(
      ApiRoutes.tasks.filter,
      payload
    );
    return unwrapList<Task>(response, ['tasks', 'data', 'items']);
  },

  assignees: async (): Promise<User[]> => {
    const response = await apiGet<unknown>(ApiRoutes.tasks.assignees);
    return unwrapList<User>(response, ['users', 'employees', 'data', 'items']);
  },
};

export async function createTask(taskData: CreateTaskPayload): Promise<Task> {
  return tasksApi.create(taskData);
}

export async function updateTask(
  taskId: Id,
  taskData: UpdateTaskPayload
): Promise<Task> {
  return tasksApi.update(taskId, taskData);
}

export async function deleteTaskById(taskId: Id): Promise<unknown> {
  return tasksApi.remove(taskId);
}

export async function getTaskById(taskId: Id): Promise<Task> {
  return tasksApi.getById(taskId);
}

export async function getTaskByProjectId(projectId: Id): Promise<Task[]> {
  return tasksApi.byProject(projectId);
}

export async function getTasksByloginId(): Promise<Task[]> {
  return tasksApi.list();
}

export async function getTasksAssignedToEmployees(): Promise<Task[]> {
  return tasksApi.list();
}

export async function getTodaysTask(): Promise<Task[]> {
  return tasksApi.today();
}

export async function getEmployeesToAssignTasks(): Promise<User[]> {
  return tasksApi.assignees();
}

export async function getAllTasks(): Promise<{ success: true; data: Task[] }> {
  const data = await tasksApi.list();
  return { success: true, data };
}

export async function assignTaskToUser(taskId: Id, userId: Id): Promise<unknown> {
  return tasksApi.assign(taskId, userId);
}

export async function filterTask(
  filters: Record<string, any>,
  projectId: Id
): Promise<Task[]> {
  requireId(projectId, 'Project ID');

  const filterData: FilterTasksPayload = {
    projectId: toNumberId(projectId),
  };

  if (filters.createdAt && !filters.closedTask) {
    switch (filters.createdAt) {
      case 'created-at':
        filterData.sortBy = 'createdAt';
        break;
      case 'start-date':
        filterData.sortBy = 'startTime';
        break;
      case 'due-date':
        filterData.sortBy = 'endTime';
        break;
    }
  } else if (filters.closedTask) {
    filterData.sortBy = 'createdAt';
  }

  if (filters.assignedTo === 'assigned-to-me') {
    filterData.assignedTo = 'me';
  } else if (filters.assignedTo === 'unassigned') {
    filterData.unassigned = true;
  } else if (filters.assignedTo === 'assigned-to-others') {
    if (filters.email) {
      filterData.email = filters.email;
    } else if (filters.selectedEmployeeId) {
      filterData.assignedTo = filters.selectedEmployeeId;
    }
  }

  if (filters.closedTask !== undefined) {
    filterData.closedTask = filters.closedTask;
  }

  if (!filterData.projectId || Number.isNaN(filterData.projectId)) {
    throw new ApiError({ message: 'Invalid project ID provided', status: 400 });
  }

  return tasksApi.filter(filterData);
}
