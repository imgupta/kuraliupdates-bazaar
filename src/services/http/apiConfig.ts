/** Shared API configuration for all independently built first-party portals.
 *
 * Production traffic must use the same-origin Vercel rewrite. This keeps browser
 * cookies first-party and prevents a VITE_API_BASE_URL value from silently
 * bypassing the security proxy. Local development may opt into a direct backend.
 */
const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '');

export const API_BASE_URL = import.meta.env.DEV
  ? (configuredApiBase || 'http://localhost:8080/api/v1')
  : '/api/v1';

export const adminAuthHeaders = (): Record<string, string> => {
  // Authentication is moving to same-origin HttpOnly cookies. Do not construct
  // JavaScript-readable bearer credentials in this shared helper.
  return { Accept: 'application/json' };
};
