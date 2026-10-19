/** Shared API configuration and authentication headers for all independently built portals. */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  'https://kuraliupdates-bazaar.onrender.com/api/v1';

export const adminAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('kurali_auth_token');
  return { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
