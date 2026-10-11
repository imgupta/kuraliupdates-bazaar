/**
 * Central route registry for the existing single-page application.
 *
 * This first migration step deliberately preserves the current URL behaviour.
 * Canonical role routes are introduced only after a router and role-guard tests
 * are in place; legacy registration/account URLs remain compatibility routes.
 */
export type RegistrationRole = 'seller' | 'delivery' | 'professional';

export type AppRoute =
  | { kind: 'home' }
  | { kind: 'register'; role: RegistrationRole }
  | { kind: 'register-buyer' }
  | { kind: 'account' };

const ROUTES: Record<string, AppRoute> = {
  '/': { kind: 'home' },
  '/register/seller': { kind: 'register', role: 'seller' },
  '/register/delivery': { kind: 'register', role: 'delivery' },
  '/register/daily-help': { kind: 'register', role: 'professional' },
  '/register/buyer': { kind: 'register-buyer' },
  '/account': { kind: 'account' },
};

/** Resolve a URL path without depending on browser globals, for deterministic tests. */
export function resolveAppRoute(pathname: string): AppRoute {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return ROUTES[normalizedPath] ?? { kind: 'home' };
}
