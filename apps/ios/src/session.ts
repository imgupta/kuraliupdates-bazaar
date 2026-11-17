import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'kurali.auth.token';
const USER_KEY = 'kurali.auth.user';

export interface MobileUser {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  locality?: string;
}

export async function saveSession(token: string, user: MobileUser) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function readSession(): Promise<{ token: string; user: MobileUser } | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return null;
  const rawUser = await SecureStore.getItemAsync(USER_KEY);
  try {
    return { token, user: rawUser ? JSON.parse(rawUser) as MobileUser : {} };
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
