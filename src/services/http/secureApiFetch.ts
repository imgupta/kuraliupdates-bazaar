import { API_BASE_URL } from './apiConfig';

const COOKIE_SESSION_MARKER = '__COOKIE_SESSION__';
const CSRF_COOKIE = '__Host-ku_csrf';
const CSRF_HEADER = 'X-KU-CSRF';

const readCookie = (name: string): string | null => {
  const prefix = `${name}=`;
  const item = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
};

/**
 * All production portal API calls are first-party through Vercel. Add CSRF
 * proof to browser mutations and let the browser attach HttpOnly session cookies.
 * During the migration window, a pre-existing raw bearer is allowed only until
 * the first successful /auth/me response upgrades it to a cookie session.
 */
export const installSecureApiFetch = (): void => {
  if (typeof window === 'undefined' || (window as any).__kuSecureFetchInstalled) return;
  const originalFetch = window.fetch.bind(window);
  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  if (apiUrl.origin !== window.location.origin) return;

  (window as any).__kuSecureFetchInstalled = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requestUrl = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (requestUrl.origin !== window.location.origin || !requestUrl.pathname.startsWith(apiUrl.pathname)) {
      return originalFetch(input, init);
    }

    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));

    let storedToken: string | null = null;
    try { storedToken = localStorage.getItem('kurali_auth_token'); } catch { /* storage may be blocked */ }
    if (storedToken === COOKIE_SESSION_MARKER) headers.delete('Authorization');

    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
      if (!readCookie(CSRF_COOKIE)) {
        await originalFetch(new URL('auth/csrf', apiUrl.toString().replace(/\/?$/, '/')), {
          method: 'GET', credentials: 'same-origin', cache: 'no-store',
        });
      }
      const csrf = readCookie(CSRF_COOKIE);
      if (csrf) headers.set(CSRF_HEADER, csrf);
    }

    return originalFetch(input, {
      ...init,
      headers,
      credentials: 'same-origin',
      cache: init?.cache || 'no-store',
    });
  };
};
