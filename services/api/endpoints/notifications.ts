import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, apiDelete } from '../client';
import { ApiRoutes } from '../routes';
import { getErrorMessage } from '../errors';
import { requireId, unwrapData, unwrapList } from '../normalize';
import type {
  ExpoTokenRecord,
  Id,
  SaveExpoTokenPayload,
  UserNotification,
} from '../models';

export const notificationsApi = {
  list: async (): Promise<UserNotification[]> => {
    const response = await apiGet<unknown>(ApiRoutes.userNotifications.list);
    return unwrapList<UserNotification>(response, [
      'notifications',
      'data',
      'items',
    ]);
  },

  unread: async (): Promise<UserNotification[]> => {
    const response = await apiGet<unknown>(ApiRoutes.userNotifications.unread);
    return unwrapList<UserNotification>(response, [
      'notifications',
      'data',
      'items',
    ]);
  },

  markAllRead: (): Promise<unknown> =>
    apiPost(ApiRoutes.userNotifications.readAll, {}),

  remove: (notificationId: Id): Promise<unknown> =>
    apiDelete(
      ApiRoutes.userNotifications.byId(requireId(notificationId, 'Notification ID'))
    ),

  message: (payload: Record<string, unknown>): Promise<unknown> =>
    apiPost(ApiRoutes.userNotifications.message, payload),

  task: (payload: Record<string, unknown>): Promise<unknown> =>
    apiPost(ApiRoutes.userNotifications.task, payload),

  project: (payload: Record<string, unknown>): Promise<unknown> =>
    apiPost(ApiRoutes.userNotifications.project, payload),

  event: (payload: Record<string, unknown>): Promise<unknown> =>
    apiPost(ApiRoutes.userNotifications.event, payload),

  saveExpoToken: async (
    expoToken: string | null | undefined
  ): Promise<{ success: boolean; data?: ExpoTokenRecord; error?: string }> => {
    try {
      const payload: SaveExpoTokenPayload = {
        expoPushToken: expoToken || '',
        platform: Platform.OS,
        deviceType: 'mobile',
      };
      const result = await apiPost<unknown, SaveExpoTokenPayload>(
        ApiRoutes.notifications.tokens,
        payload
      );
      return { success: true, data: unwrapData<ExpoTokenRecord>(result) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to save push token to server'),
      };
    }
  },

  removeExpoToken: async (
    expoTokenId: Id
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    try {
      const data = await apiDelete(
        ApiRoutes.notifications.tokenById(requireId(expoTokenId, 'Token ID'))
      );
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to remove push token from server'),
      };
    }
  },
};

export async function getNotificationforCurrentUser(): Promise<UserNotification[]> {
  return notificationsApi.list();
}

export async function getUnreadNotifications(): Promise<UserNotification[]> {
  return notificationsApi.unread();
}

export async function markAllRead(): Promise<unknown> {
  return notificationsApi.markAllRead();
}

export async function deleteNotificationById(notificationId: Id): Promise<unknown> {
  return notificationsApi.remove(notificationId);
}

export async function createMessageNotification(
  notificationData: Record<string, unknown>
): Promise<unknown> {
  return notificationsApi.message(notificationData);
}

export async function taskAssignement(
  notificationData: Record<string, any>
): Promise<unknown> {
  return notificationsApi.task({
    ...notificationData,
    assignedToUserId: Number(notificationData.assignedToUserId),
  });
}

export async function projectAssignement(
  notificationData: Record<string, any>
): Promise<unknown> {
  return notificationsApi.project({
    ...notificationData,
    assignedToUserId: Number(notificationData.assignedToUserId),
  });
}

export async function eventAssignement(
  notificationData: Record<string, any>
): Promise<unknown> {
  return notificationsApi.event({
    ...notificationData,
    assignedToUserIds: notificationData.assignedToUserIds.map((id: any) =>
      Number(id)
    ),
    eventId: Number(notificationData.eventId),
  });
}

export const getStoredExpoTokenId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('expoTokenId');
  } catch (error) {
    console.error('Error getting stored expo token ID:', error);
    return null;
  }
};

export const saveTokenToServer = notificationsApi.saveExpoToken;

export const updateTokenOnServer = async (
  expoToken: string | null | undefined,
  userId?: string | number
) => {
  void userId;
  return notificationsApi.saveExpoToken(expoToken);
};

export const removeTokenFromServer = notificationsApi.removeExpoToken;
