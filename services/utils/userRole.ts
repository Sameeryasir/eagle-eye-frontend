import {
  getSessionUserRole,
  getSessionUserRoleSync,
  updateAuthProfile,
  clearAuthSession,
} from '../auth/session';

export const getUserRole = async (): Promise<string | null> => {
  try {
    return await getSessionUserRole();
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const getUserRoleSync = (): string | null => getSessionUserRoleSync();

export const setUserRole = async (role: string | null): Promise<boolean> => {
  try {
    await updateAuthProfile({ role });
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
};

export const clearUserRole = async (): Promise<boolean> => {
  try {
    await updateAuthProfile({ role: null });
    return true;
  } catch (error) {
    console.error('Error clearing user role:', error);
    return false;
  }
};

export { clearAuthSession };
