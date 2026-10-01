import type { Id } from '../types';
import type { User } from './user';
import type { Task } from './task';
import type { LogEntry } from './log';

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  startDate?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
  owner?: User | null;
  assignedTo?: User | null;
  company?: { id?: number; name?: string } | null;
  tasks?: unknown[];
  [key: string]: unknown;
}

export interface ProjectDetailsResponse {
  project: Project;
  team: User[];
  tasks: Task[];
  logs: LogEntry[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  startDate?: string;
  imageUrl?: string;
  company_id?: number;
  assignedTo?: number;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export interface AssignProjectPayload {
  projectId: Id;
  employeeIds: Id[];
  [key: string]: unknown;
}

export interface ProjectsListResponse {
  projects?: Project[];
  data?: Project[];
  [key: string]: unknown;
}
