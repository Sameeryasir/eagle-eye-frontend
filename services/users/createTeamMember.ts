import { apiPost, ApiRoutes } from '../api/client';

export async function createTeamMember({
  firstName,
  lastName,
  email,
  phone,
  roleName = 'Employee',
}) {
  return apiPost(ApiRoutes.users.team, {
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || undefined,
    roleName,
  });
}

export default createTeamMember;
