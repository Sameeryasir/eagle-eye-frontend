import { apiGet, apiPost, apiPut, apiDelete } from '../client';
import { ApiRoutes } from '../routes';
import { ApiError } from '../errors';
import { requireId, unwrapList } from '../normalize';
import { getUserRole } from '../../utils/userRole';
import type {
  AppEvent,
  CreateEventPayload,
  Id,
  UpdateEventPayload,
} from '../models';

export const eventsApi = {
  list: async (): Promise<AppEvent[]> => {
    const response = await apiGet<unknown>(ApiRoutes.events.list);
    return unwrapList<AppEvent>(response, ['events', 'data', 'items']);
  },

  create: (data: CreateEventPayload): Promise<AppEvent> =>
    apiPost<AppEvent, CreateEventPayload>(ApiRoutes.events.create, data),

  update: (eventId: Id, data: UpdateEventPayload): Promise<AppEvent> =>
    apiPut<AppEvent, UpdateEventPayload>(
      ApiRoutes.events.byId(requireId(eventId, 'Event ID')),
      data
    ),

  remove: (eventId: Id): Promise<unknown> =>
    apiDelete(ApiRoutes.events.byId(requireId(eventId, 'Event ID'))),
};

export async function createEvent(data: CreateEventPayload): Promise<AppEvent> {
  return eventsApi.create(data);
}

export async function updateEventById(
  eventId: Id,
  eventData: UpdateEventPayload
): Promise<AppEvent> {
  return eventsApi.update(eventId, eventData);
}

export async function deleteEventById(eventId: Id): Promise<unknown> {
  return eventsApi.remove(eventId);
}

export async function getEventsForLogInUser(): Promise<AppEvent[]> {
  const userRole = await getUserRole();
  const allowedRoles = ['Owner', 'Employee', 'Manager'];

  if (!allowedRoles.includes(userRole as string)) {
    throw new ApiError({
      message:
        'Access denied. Only Owner, Employee, and Manager roles can access events.',
      status: 403,
    });
  }

  return eventsApi.list();
}
