import type { UserRole } from '../types';
import type { UserProfile } from '../entities/userProfile';
import { safeStorageGet, safeStorageRemove, safeStorageSet } from '../shared/storage/safeStorage';

const AUTH_SESSION_KEY = 'kurali_auth_session';
const AUTH_TOKEN_KEY = 'kurali_auth_token';
const LEGACY_USER_KEY = 'kurali_user';

const parseStoredSession = (): UserProfile | null => {
  const session = safeStorageGet(AUTH_SESSION_KEY);
  if (!session) return null;
  try {
    const parsed = JSON.parse(session) as UserProfile;
    return parsed.isSignedIn && (parsed.email || parsed.phone) ? parsed : null;
  } catch {
    return null;
  }
};

/** Read only a valid signed-in profile from browser storage. */
export const readStoredAuthSession = (): UserProfile | null => parseStoredSession();

/** Preserve the existing role restoration order: signed-in session, then saved role, then buyer. */
export const readStoredRole = (): UserRole => {
  const session = parseStoredSession();
  if (session?.role) return session.role;
  return (safeStorageGet('kurali_role') as UserRole) || 'buyer';
};

export const readAuthToken = (): string | null => safeStorageGet(AUTH_TOKEN_KEY);

export const persistAuthSession = (profile: UserProfile): void => {
  safeStorageSet(AUTH_SESSION_KEY, JSON.stringify(profile));
};

export const persistAuthToken = (token: string): void => {
  safeStorageSet(AUTH_TOKEN_KEY, token);
};

export const removeAuthToken = (): void => {
  safeStorageRemove(AUTH_TOKEN_KEY);
};

export const removeAuthSession = (): void => {
  safeStorageRemove(AUTH_SESSION_KEY);
};

export const clearStoredAuthState = (): void => {
  removeAuthToken();
  removeAuthSession();
  safeStorageRemove(LEGACY_USER_KEY);
};
