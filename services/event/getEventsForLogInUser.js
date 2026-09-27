/**
 * Change Summary:
 * - What: Uses shared apiGet + ApiRoutes.events.list
 * - Why: Nest lists events at GET /events
 * - Dependencies: services/api/client.js, services/utils/userRole.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiGet, ApiRoutes } from '../api/client';
import { getUserRole } from '../utils/userRole';

export async function getEventsForLogInUser() {
  // Business Rule: Owner, Employee, and Manager can access events
  const userRole = await getUserRole();
  const allowedRoles = ['Owner', 'Employee', 'Manager'];

  if (!allowedRoles.includes(userRole)) {
    throw new Error(
      'Access denied. Only Owner, Employee, and Manager roles can access events.'
    );
  }

  return apiGet(ApiRoutes.events.list);
}
