import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { getProjectDetails } from '../../services/projects/getProjectDetails';
import { getMyProjects } from '../../services/projects/getProjectsByLoginUserId';
import { createProject } from '../../services/projects/createProject';
import { updateProjectById } from '../../services/projects/updateProjectById';
import { deleteProjectById } from '../../services/projects/deleteProjectById';
import { getTaskByProjectId } from '../../services/tasks/getTaskByProjectId';
import { getTaskById } from '../../services/tasks/getTaskById';
import { getTasksByloginId } from '../../services/tasks/getTasksByloginId';
import { createTask } from '../../services/tasks/createTask';
import { updateTask } from '../../services/tasks/updateTaskById';
import { deleteTaskById } from '../../services/tasks/deleteTaskById';
import { getLogs } from '../../services/log/getLogs';
import { getEmployeesToAssignTask } from '../../services/employees/getEmployeesOfTheCompany';
import { assignTaskToUser } from '../../services/tasks/assignTask';
import {
  defaultCalendarRange,
  getCalendarFeed,
} from '../../services/api/endpoints/calendar';
import { queryKeys } from '../../services/api/queryKeys';
import { mapLogsToUi } from '../../services/api/mappers/logs';
import {
  combineTasksAndEvents,
  groupEventsByDate,
  groupTasksByDate,
} from '../../services/calendar/calendarHelpers';
import { getUserConversations } from '../../services/chats/getConversation';
import { getNotificationforCurrentUser } from '../../services/inAppNotification/getNotificationforCurrentUser';

export function useProjectsList(enabled = true) {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => getMyProjects(),
    enabled,
  });
}

export function useProjectDetails(projectId?: string | number | null) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? 'unknown'),
    queryFn: () => getProjectDetails(projectId as string | number),
    enabled: projectId != null && projectId !== '',
  });
}

export function useProjectTasks(projectId?: string | number | null) {
  return useQuery({
    queryKey: queryKeys.projects.tasks(projectId ?? 'unknown'),
    queryFn: () => getTaskByProjectId(projectId as string | number),
    enabled: projectId != null && projectId !== '',
  });
}

export function useMyTasks(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.tasks.all, 'mine'] as const,
    queryFn: () => getTasksByloginId(),
    enabled,
  });
}

export function useProjectLogs(projectId?: string | number | null) {
  return useQuery({
    queryKey: queryKeys.projects.logs(projectId ?? 'unknown'),
    queryFn: async () => {
      const logs = await getLogs(projectId as string | number);
      return mapLogsToUi(Array.isArray(logs) ? logs : []);
    },
    enabled: projectId != null && projectId !== '',
  });
}

export function useTaskDetails(taskId?: string | number | null) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId ?? 'unknown'),
    queryFn: () => getTaskById(taskId as string | number),
    enabled: taskId != null && taskId !== '',
  });
}

export function useTaskAssignees(enabled = true) {
  return useQuery({
    queryKey: queryKeys.employees.assignees(),
    queryFn: () => getEmployeesToAssignTask(),
    enabled,
    staleTime: 30_000,
  });
}

function invalidateTaskRelatedCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  options?: { taskId?: string | number; projectId?: string | number | null }
) {
  const jobs: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
  ];

  if (options?.taskId != null) {
    jobs.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(options.taskId),
      })
    );
  }

  if (options?.projectId != null && options.projectId !== '') {
    jobs.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tasks(options.projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(options.projectId),
      })
    );
  }

  return Promise.all(jobs);
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (taskData: any) => createTask(taskData),
    onSuccess: (_data, variables) => {
      const projectId = variables?.projectId ?? null;
      return invalidateTaskRelatedCaches(queryClient, { projectId });
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      taskData,
    }: {
      taskId: string | number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskData: any;
    }) => updateTask(taskId, taskData),
    onSuccess: (_data, variables) => {
      const projectId = variables.taskData?.projectId ?? null;
      return invalidateTaskRelatedCaches(queryClient, {
        taskId: variables.taskId,
        projectId,
      });
    },
  });
}

export function useAssignTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      userId,
    }: {
      taskId: string | number;
      userId: string | number;
    }) => assignTaskToUser(taskId, userId),
    onSuccess: (_data, variables) =>
      invalidateTaskRelatedCaches(queryClient, { taskId: variables.taskId }),
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string | number) => deleteTaskById(taskId),
    onSuccess: (_data, taskId) =>
      invalidateTaskRelatedCaches(queryClient, { taskId }),
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (projectData: any) => createProject(projectData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      projectData,
    }: {
      projectId: string | number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projectData: any;
    }) => updateProjectById(projectId, projectData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string | number) => deleteProjectById(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useInvalidateProject(projectId?: string | number | null) {
  const queryClient = useQueryClient();

  return async () => {
    if (projectId == null || projectId === '') return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tasks(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.logs(projectId),
      }),
    ]);
  };
}

async function fetchCalendarFeed(from?: string, to?: string) {
  const range = {
    ...defaultCalendarRange(),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  const feed = await getCalendarFeed(range);
  const tasks = feed.tasks;
  const events = feed.events;
  const tasksByDate = groupTasksByDate(tasks);
  const eventsByDate = groupEventsByDate(events);
  const combinedByDate = combineTasksAndEvents(tasksByDate, eventsByDate);

  return {
    tasks,
    events,
    tasksByDate,
    eventsByDate,
    combinedByDate,
    from: range.from,
    to: range.to,
    meta: feed.meta || null,
  };
}

export function useCalendarFeed(
  enabled = true,
  range?: { from?: string; to?: string }
) {
  const resolved = {
    ...defaultCalendarRange(),
    ...(range?.from ? { from: range.from } : {}),
    ...(range?.to ? { to: range.to } : {}),
  };

  return useQuery({
    queryKey: queryKeys.calendar.feed(resolved.from, resolved.to),
    queryFn: () => fetchCalendarFeed(resolved.from, resolved.to),
    enabled,
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useInvalidateCalendar() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
}

export function useConversationsList(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chats.conversations(),
    queryFn: () => getUserConversations(),
    enabled,
    staleTime: 60_000,
  });
}

export function useNotificationsList(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => getNotificationforCurrentUser(),
    enabled,
    staleTime: 60_000,
  });
}
