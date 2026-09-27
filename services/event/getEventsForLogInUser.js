import { apiGet, ApiRoutes } from '../api/client';
import { getUserRole } from '../utils/userRole';

export async function getEventsForLogInUser() {
  const userRole = await getUserRole();
  const allowedRoles = ['Owner', 'Employee', 'Manager'];

  if (!allowedRoles.includes(userRole)) {
    throw new Error(
      'Access denied. Only Owner, Employee, and Manager roles can access events.'
    );
  }

  return apiGet(ApiRoutes.events.list);
}
