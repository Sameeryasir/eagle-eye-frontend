import AsyncStorage from "@react-native-async-storage/async-storage";

export const getUserRole = async () => {
  try {
    const userRole = await AsyncStorage.getItem('userRole');
    return userRole;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const setUserRole = async (role) => {
  try {
    await AsyncStorage.setItem('userRole', role);
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
};

export const clearUserRole = async () => {
  try {
    await AsyncStorage.removeItem('userRole');
    return true;
  } catch (error) {
    console.error('Error clearing user role:', error);
    return false;
  }
};
