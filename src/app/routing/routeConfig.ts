import type { UserRole } from '../../types';

/**
 * Keep the existing registration and account URLs stable while adding
 * canonical dashboard URLs for direct navigation and browser history.
 */
export type RegistrationRole = 'seller' | 'delivery' | 'professional';

export type AppRoute =
  | { kind: 'home' }
  | { kind: 'register'; role: RegistrationRole }
  | { kind: 'register-buyer' }
  | { kind: 'account' }
  | { kind: 'role-dashboard'; role: UserRole };

const ROUTES: Record<string, AppRoute> = {
  '/': { kind: 'home' },
  '/register/seller': { kind: 'register', role: 'seller' },
  '/register/delivery': { kind: 'register', role: 'delivery' },
  '/register/daily-help': { kind: 'register', role: 'professional' },
  '/register/buyer': { kind: 'register-buyer' },
  '/account': { kind: 'account' },
  '/buyer': { kind: 'role-dashboard', role: 'buyer' },
  '/seller': { kind: 'role-dashboard', role: 'seller' },
  '/delivery': { kind: 'role-dashboard', role: 'delivery' },
  '/daily-help': { kind: 'role-dashboard', role: 'professional' },
  '/admin': { kind: 'role-dashboard', role: 'admin' },
};

const ROLE_PATHS: Record<UserRole, string> = {
  buyer: '/buyer',
  seller: '/seller',
  delivery: '/delivery',
  professional: '/daily-help',
  admin: '/admin',
};

/** Resolve a URL path without depending on browser globals, for deterministic tests. */
export function resolveAppRoute(pathname: string): AppRoute {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return ROUTES[normalizedPath] ?? { kind: 'home' };
}

export function pathForRole(role: UserRole): string {
  return ROLE_PATHS[role];
}

/** Select a role-specific landing route for independently deployed portal builds. */
export function resolvePortalRoute(pathname: string, configuredPortalRole?: string): AppRoute {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const supportedRoles: readonly UserRole[] = [
    'buyer',
    'seller',
    'delivery',
    'professional',
    'admin',
  ];

  if (normalizedPath === '/' && configuredPortalRole && supportedRoles.includes(configuredPortalRole as UserRole)) {
    return { kind: 'role-dashboard', role: configuredPortalRole as UserRole };
  }

  return resolveAppRoute(pathname);
}
