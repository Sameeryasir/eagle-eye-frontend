import { apiGet, apiPost, apiPut } from '../client';
import { ApiRoutes } from '../routes';
import { ApiError } from '../errors';
import { requireId, unwrapList } from '../normalize';
import type { Id, UpdateUserPayload, User } from '../models';

export const usersApi = {
  getById: (userId: Id): Promise<User> =>
    apiGet<User>(ApiRoutes.users.byId(requireId(userId, 'User ID'))),

  update: (userId: Id, userData: UpdateUserPayload): Promise<User> => {
    if (!userData) {
      throw new ApiError({ message: 'User data is required', status: 400 });
    }
    return apiPut<User, UpdateUserPayload>(
      ApiRoutes.users.byId(requireId(userId, 'User ID')),
      userData
    );
  },

  createTeamMember: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    roleName?: string;
  }): Promise<unknown> =>
    apiPost(ApiRoutes.users.team, {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone: payload.phone || undefined,
      roleName: payload.roleName || 'Employee',
    }),

  forConversation: async (): Promise<User[]> => {
    const response = await apiGet<unknown>(ApiRoutes.users.employeesForConversation);
    return unwrapList<User>(response, ['users', 'employees', 'data', 'items']);
  },

  assignees: async (): Promise<User[]> => {
    const response = await apiGet<unknown>(ApiRoutes.tasks.assignees);
    return unwrapList<User>(response, ['users', 'employees', 'data', 'items']);
  },
};

export async function getUserById(userId: Id): Promise<User> {
  return usersApi.getById(userId);
}

export async function updateUserById(
  userId: Id,
  userData: UpdateUserPayload
): Promise<User> {
  return usersApi.update(userId, userData);
}

export async function createTeamMember(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleName?: string;
}): Promise<unknown> {
  return usersApi.createTeamMember(input);
}

export async function getUserForConversations(): Promise<User[]> {
  return usersApi.forConversation();
}

export async function getEmployeesToAssignTask(): Promise<User[]> {
  return usersApi.assignees();
}

export default createTeamMember;
