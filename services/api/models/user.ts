import type { Id } from '../types';

export type UserRoleName =
  | 'owner'
  | 'manager'
  | 'employee'
  | 'admin'
  | string;

export interface Role {
  id?: number;
  name?: UserRoleName;
}

export interface User {
  id: number;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  phone?: string | null;
  dob?: string | null;
  role?: Role | null;
  company?: { id?: number; name?: string } | null;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  title?: string;
  phone?: string;
  dob?: string;
  email?: string;
  [key: string]: unknown;
}

export interface CreateTeamMemberPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  projectId?: Id;
  [key: string]: unknown;
}
