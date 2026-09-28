import type { Id } from '../types';
import type { User } from './user';
import type { Project } from './project';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  startTime?: string;
  endTime?: string | null;
  priority?: TaskPriority;
  createdAt?: string;
  project?: Project | Partial<Project> | null;
  assignedTo?: User | null;
  [key: string]: unknown;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  startTime: string;
  minStartTime?: string;
  endTime?: string;
  priority?: TaskPriority;
  projectId?: number;
  assignedToUserId?: number | null;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface AssignTaskPayload {
  assignedToUserId: Id;
}

export interface FilterTasksPayload {
  projectId: number;
  sortBy?: string;
  assignedTo?: string | number;
  unassigned?: boolean;
  email?: string;
  closedTask?: boolean;
  [key: string]: unknown;
}

export interface TasksListResponse {
  tasks?: Task[];
  data?: Task[];
  [key: string]: unknown;
}
