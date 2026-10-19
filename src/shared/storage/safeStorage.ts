/** Safe browser storage helpers used by the application session and UI state. */
export const safeStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeStorageJson = <T,>(key: string, fallback: T): T => {
  const raw = safeStorageGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    try {
      safeStorageRemove(key);
    } catch {
      // Ignore storage cleanup failures.
    }
    return fallback;
  }
};

export const safeStorageRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore unavailable browser storage.
  }
};

export const safeStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore unavailable/full browser storage so the UI can still render.
  }
};
