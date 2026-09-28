import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_KEYS = [
  "token",
  "refreshToken",
  "userRole",
  "userFirstName",
  "userLastName",
  "userId",
  "expoPushToken",
  "expoTokenId",
  "lastVisitedScreen",
] as const;

export type AuthKey = (typeof AUTH_KEYS)[number];

export interface AuthSession {
  token: string | null;
  refreshToken: string | null;
  userRole: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userId: string | null;
  expoPushToken: string | null;
  expoTokenId: string | null;
  hydrated: boolean;
}

export interface SessionUserInfo {
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  id: string | null;
}

export interface LoginUserPayload {
  access_token?: string;
  refresh_token?: string;
  user?: {
    id?: string | number;
    first_name?: string;
    last_name?: string;
    role?: { name?: string } | null;
  } | null;
}

export type AuthListener = (snapshot: AuthSession) => void;

const emptySession = (): AuthSession => ({
  token: null,
  refreshToken: null,
  userRole: null,
  userFirstName: null,
  userLastName: null,
  userId: null,
  expoPushToken: null,
  expoTokenId: null,
  hydrated: false,
});

let cache: AuthSession = emptySession();
const listeners = new Set<AuthListener>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(getAuthSnapshot());
    } catch (error) {
      console.error("Auth session listener error:", error);
    }
  });
}

export function getAuthSnapshot(): AuthSession {
  return { ...cache };
}

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUserInfoFromSession(): SessionUserInfo | null {
  if (!cache.token || !cache.refreshToken) return null;
  return {
    firstName: cache.userFirstName,
    lastName: cache.userLastName,
    role: cache.userRole,
    id: cache.userId,
  };
}

export async function hydrateAuthSession(): Promise<AuthSession> {
  try {
    const values = await AsyncStorage.multiGet([
      "token",
      "refreshToken",
      "userRole",
      "userFirstName",
      "userLastName",
      "userId",
      "expoPushToken",
      "expoTokenId",
    ]);
    const map = Object.fromEntries(values);
    cache = {
      token: map.token || null,
      refreshToken: map.refreshToken || null,
      userRole: map.userRole || null,
      userFirstName: map.userFirstName || null,
      userLastName: map.userLastName || null,
      userId: map.userId || null,
      expoPushToken: map.expoPushToken || null,
      expoTokenId: map.expoTokenId || null,
      hydrated: true,
    };
    notify();
    return getAuthSnapshot();
  } catch (error) {
    console.error("Failed to hydrate auth session:", error);
    cache = { ...emptySession(), hydrated: true };
    notify();
    return getAuthSnapshot();
  }
}

export async function persistLoginSession(
  userData: LoginUserPayload
): Promise<AuthSession> {
  const role = userData.user?.role?.name || null;
  const firstName = userData.user?.first_name || "";
  const lastName = userData.user?.last_name || "";
  const userId =
    userData.user?.id != null ? String(userData.user.id) : null;

  await AsyncStorage.multiSet([
    ["token", userData.access_token || ""],
    ["refreshToken", userData.refresh_token || ""],
    ["userRole", role || ""],
    ["userFirstName", firstName],
    ["userLastName", lastName],
    ["userId", userId || ""],
  ]);

  cache = {
    ...cache,
    token: userData.access_token || null,
    refreshToken: userData.refresh_token || null,
    userRole: role,
    userFirstName: firstName || null,
    userLastName: lastName || null,
    userId,
    hydrated: true,
  };
  notify();
  return getAuthSnapshot();
}

export async function updateAuthTokens({
  accessToken,
  refreshToken,
}: {
  accessToken?: string;
  refreshToken?: string;
} = {}): Promise<AuthSession> {
  const writes: [string, string][] = [];
  if (accessToken) {
    writes.push(["token", accessToken]);
    cache.token = accessToken;
  }
  if (refreshToken) {
    writes.push(["refreshToken", refreshToken]);
    cache.refreshToken = refreshToken;
  }
  if (writes.length) {
    await AsyncStorage.multiSet(writes);
    cache.hydrated = true;
    notify();
  }
  return getAuthSnapshot();
}

export async function updateAuthProfile({
  firstName,
  lastName,
  role,
}: {
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
} = {}): Promise<AuthSession> {
  const writes: [string, string][] = [];
  if (firstName !== undefined) {
    writes.push(["userFirstName", firstName || ""]);
    cache.userFirstName = firstName || null;
  }
  if (lastName !== undefined) {
    writes.push(["userLastName", lastName || ""]);
    cache.userLastName = lastName || null;
  }
  if (role !== undefined) {
    writes.push(["userRole", role || ""]);
    cache.userRole = role || null;
  }
  if (writes.length) {
    await AsyncStorage.multiSet(writes);
    cache.hydrated = true;
    notify();
  }
  return getAuthSnapshot();
}

export async function updateExpoPushSession({
  token,
  tokenId,
}: {
  token?: string | null;
  tokenId?: string | number | null;
} = {}): Promise<AuthSession> {
  const writes: [string, string][] = [];
  if (token !== undefined) {
    if (token) writes.push(["expoPushToken", token]);
    else await AsyncStorage.removeItem("expoPushToken");
    cache.expoPushToken = token || null;
  }
  if (tokenId !== undefined) {
    if (tokenId != null) writes.push(["expoTokenId", String(tokenId)]);
    else await AsyncStorage.removeItem("expoTokenId");
    cache.expoTokenId = tokenId != null ? String(tokenId) : null;
  }
  if (writes.length) {
    await AsyncStorage.multiSet(writes);
  }
  cache.hydrated = true;
  notify();
  return getAuthSnapshot();
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove([...AUTH_KEYS]);
  cache = { ...emptySession(), hydrated: true };
  notify();
}

async function ensureHydrated(): Promise<void> {
  if (!cache.hydrated) {
    await hydrateAuthSession();
  }
}

export async function getAccessToken(): Promise<string | null> {
  await ensureHydrated();
  return cache.token;
}

export async function getRefreshToken(): Promise<string | null> {
  await ensureHydrated();
  return cache.refreshToken;
}

export async function getSessionUserRole(): Promise<string | null> {
  await ensureHydrated();
  return cache.userRole;
}

export async function getSessionUserId(): Promise<string | null> {
  await ensureHydrated();
  return cache.userId;
}

export function getAccessTokenSync(): string | null {
  return cache.token;
}

export function getSessionUserRoleSync(): string | null {
  return cache.userRole;
}

export function getSessionUserIdSync(): string | null {
  return cache.userId;
}

export function isSessionAuthenticated(): boolean {
  return !!(cache.token && cache.refreshToken);
}
