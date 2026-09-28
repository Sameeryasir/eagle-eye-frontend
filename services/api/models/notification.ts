import type { Id } from '../types';

export interface ExpoTokenRecord {
  id?: number | string;
  tokenId?: number | string;
  expoPushToken?: string;
  platform?: string;
  [key: string]: unknown;
}

export interface SaveExpoTokenPayload {
  expoPushToken: string;
  platform: string;
  deviceType?: string;
}

export interface UserNotification {
  id: number;
  type?: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface NotificationsListResponse {
  notifications?: UserNotification[];
  data?: UserNotification[];
  [key: string]: unknown;
}

export type NotificationId = Id;
