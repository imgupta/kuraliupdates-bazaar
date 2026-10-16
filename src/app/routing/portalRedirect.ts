import type { UserRole } from '../../types';
import { pathForRole } from './routeConfig';

export type PortalUrlMap = Partial<Record<UserRole, string | undefined>>;

/**
 * Build a safe cross-portal redirect for an authenticated user.
 * Only HTTPS portal URLs are accepted. Separate portal deployments live at
 * their hostname root; role paths are only used when routing on the same origin.
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

    // Each role has its own hostname in production (for example,
    // buyer.kuraliupdates.com/). Appending /buyer there routes to a path the
    // standalone portal does not use. Keep role paths for same-origin routing.
    target.pathname = target.origin === current.origin ? pathForRole(role) : '/';
    target.search = '';
    target.hash = '';

    if (target.origin === current.origin && target.pathname === current.pathname) return null;
    return target.toString();
  } catch {
    return null;
  }
}
