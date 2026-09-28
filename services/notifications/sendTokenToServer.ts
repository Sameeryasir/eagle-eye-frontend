import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, apiDelete, ApiRoutes } from '../api/client';

export const getStoredExpoTokenId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('expoTokenId');
  } catch (error) {
    console.error('Error getting stored expo token ID:', error);
    return null;
  }
};

export const saveTokenToServer = async (
  expoToken: string | null | undefined
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    const payload = {
      expoPushToken: expoToken,
      platform: Platform.OS,
      deviceType: 'mobile',
    };

    const result = await apiPost(ApiRoutes.notifications.tokens, payload);
    const tokenRecord = (result as any)?.data ?? result;

    return { success: true, data: tokenRecord };
  } catch (error: any) {
    console.error('Error saving token to server:', error);
    if (error.response?.data?.message) {
      return { success: false, error: error.response.data.message };
    }
    return { success: false, error: 'Failed to save push token to server' };
  }
};

export const updateTokenOnServer = async (
  expoToken: string | null | undefined,
  userId?: string | number
) => {
  void userId;
  return saveTokenToServer(expoToken);
};

export const removeTokenFromServer = async (
  expoTokenId: string | number
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const data = await apiDelete(ApiRoutes.notifications.tokenById(expoTokenId));
    return { success: true, data };
  } catch (error: any) {
    console.error('removeTokenFromServer: Error occurred:', error);
    if (error.response?.data?.message) {
      return { success: false, error: error.response.data.message };
    }
    return { success: false, error: 'Failed to remove push token from server' };
  }
};
