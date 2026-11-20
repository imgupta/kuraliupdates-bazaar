/** Shared API configuration for all independently built first-party portals.
 *
 * Production traffic must use the same-origin Vercel rewrite. This keeps browser
 * API traffic first-party; local development may opt into a direct backend.
 */
const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '');

export const API_BASE_URL = import.meta.env.DEV
  ? (configuredApiBase || 'http://localhost:8080/api/v1')
  : '/api/v1';

export const adminAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('kurali_auth_token');
  return { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
