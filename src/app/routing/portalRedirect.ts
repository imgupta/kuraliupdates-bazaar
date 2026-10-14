import type { UserRole } from '../../types';
import { pathForRole } from './routeConfig';

export type PortalUrlMap = Partial<Record<UserRole, string | undefined>>;

/**
 * Build a safe cross-portal redirect for an authenticated user.
 * Only HTTPS portal URLs are accepted. Same-origin role paths are supported so
 * portals can share browser storage when routed beneath one canonical origin.
 */
export function buildPortalRedirectUrl(
  role: UserRole,
  currentUrl: string,
  portalUrls: PortalUrlMap,
): string | null {
  const configuredUrl = portalUrls[role]?.trim();
  if (!configuredUrl) return null;

  try {
    const target = new URL(configuredUrl);
    const current = new URL(currentUrl);
    if (target.protocol !== 'https:') return null;
    target.pathname = pathForRole(role);
    target.search = '';
    target.hash = '';
    if (target.origin === current.origin && target.pathname === current.pathname) return null;
    return target.toString();
  } catch {
    return null;
  }
}
