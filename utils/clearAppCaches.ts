import { queryClient } from "../lib/queryClient";
import { clearApiCache } from "./apiCache";
import { clearAllReduxStores } from "../store/utils/clearAllReduxStores";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Full client wipe on logout / login switch so the next user
 * never sees the previous user's cached API or UI state.
 */
export async function clearAppCaches(): Promise<void> {
  try {
    queryClient.clear();
  } catch (error) {
    console.error("Error clearing React Query cache:", error);
  }

  try {
    clearApiCache();
  } catch (error) {
    console.error("Error clearing API memory cache:", error);
  }

  try {
    await clearAllReduxStores();
  } catch (error) {
    console.error("Error clearing Redux stores:", error);
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    const ephemeral = keys.filter(
      (key) =>
        key === "messageCounts" ||
        key.startsWith("messageCounts:") ||
        key.startsWith("hasNewNotification:")
    );
    if (ephemeral.length) {
      await AsyncStorage.multiRemove(ephemeral);
    }
  } catch (error) {
    console.error("Error clearing ephemeral AsyncStorage keys:", error);
  }
}
