import type { UserRole } from '../../types';

export type RoleRouteAccessContext = {
  isSignedIn: boolean;
  registeredRoles: readonly UserRole[];
  /** Must come from the verified application session, not the requested URL. */
  isAdmin: boolean;
};

export type RoleRouteAccessResult =
  | { allowed: true; role: UserRole }
  | {
      allowed: false;
      reason: 'authentication-required' | 'role-not-registered' | 'admin-required';
    };

/**
 * Pure client-side route policy. Backend authorization remains authoritative.
 * Callers must derive isAdmin from the authenticated session and must not infer
 * permissions from pathname, query parameters, or local role selection.
 */
export function authorizeRoleRoute(
  requestedRole: UserRole,
  context: RoleRouteAccessContext,
): RoleRouteAccessResult {
  if (!context.isSignedIn) {
    return { allowed: false, reason: 'authentication-required' };
  }

  if (requestedRole === 'admin' && !context.isAdmin) {
    return { allowed: false, reason: 'admin-required' };
  }

  if (!context.registeredRoles.includes(requestedRole)) {
    return { allowed: false, reason: 'role-not-registered' };
  }

  return { allowed: true, role: requestedRole };
}
