import type { UserRole } from '../../types';
import { pathForRole } from './routeConfig';

export type PortalUrlMap = Partial<Record<UserRole, string | undefined>>;

/**
 * Build a safe cross-portal redirect for an authenticated user.
 * Only HTTPS portal origins are accepted, and same-origin redirects are rejected
 * to avoid loops when role URLs have not yet been configured.
 */
export function buildPortalRedirectUrl(
  role: UserRole,
  currentOrigin: string,
  portalUrls: PortalUrlMap,
): string | null {
  const configuredUrl = portalUrls[role]?.trim();
  if (!configuredUrl) return null;

  try {
    const target = new URL(configuredUrl);
    const current = new URL(currentOrigin);
    if (target.protocol !== 'https:' || target.origin === current.origin) return null;
    target.pathname = pathForRole(role);
    target.search = '';
    target.hash = '';
    return target.toString();
  } catch {
    return null;
  }
}
