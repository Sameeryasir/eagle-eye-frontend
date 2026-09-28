import {
  getSessionUserRole,
  getSessionUserRoleSync,
  updateAuthProfile,
  clearAuthSession,
} from "../auth/session";

export const getUserRole = async () => {
  try {
    return await getSessionUserRole();
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};

export const getUserRoleSync = () => getSessionUserRoleSync();

export const setUserRole = async (role) => {
  try {
    await updateAuthProfile({ role });
    return true;
  } catch (error) {
    console.error("Error setting user role:", error);
    return false;
  }
};

export const clearUserRole = async () => {
  try {
    await updateAuthProfile({ role: null });
    return true;
  } catch (error) {
    console.error("Error clearing user role:", error);
    return false;
  }
};

export { clearAuthSession };
