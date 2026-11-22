/** Shared API configuration for every first-party portal.
 *
 * Browser traffic always targets the current origin. Vercel rewrites production
 * /api/v1 requests to Render; Vite proxies the same path during local development.
 */
export const API_BASE_URL = '/api/v1';

export const adminAuthHeaders = (): Record<string, string> => {
  let token: string | null = null;
  try { token = localStorage.getItem('kurali_auth_token'); } catch { /* storage may be blocked */ }
  return { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
