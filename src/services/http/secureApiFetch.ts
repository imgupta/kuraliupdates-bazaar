import { API_BASE_URL } from './apiConfig';

const COOKIE_SESSION_MARKER = '__COOKIE_SESSION__';
const CSRF_COOKIE = '__Host-ku_csrf';
const CSRF_HEADER = 'X-KU-CSRF';
const DEVICE_STORAGE_KEY = 'kurali_device_id';
const DEVICE_HEADER = 'X-KU-Device-ID';
let inMemoryDeviceId: string | null = null;

const readCookie = (name: string): string | null => {
  const prefix = name + '=';
  const item = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  if (!item) return null;
  try { return decodeURIComponent(item.slice(prefix.length)); } catch { return null; }
};

const createDeviceId = (): string => {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
};

/** A random pseudonymous abuse-control key; it is not an authentication credential. */
const readDeviceId = (): string | null => {
  if (inMemoryDeviceId) return inMemoryDeviceId;
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing && /^[a-f0-9-]{36}$/i.test(existing)) {
      inMemoryDeviceId = existing;
      return existing;
    }
    const created = createDeviceId();
    localStorage.setItem(DEVICE_STORAGE_KEY, created);
    inMemoryDeviceId = created;
    return created;
  } catch {
    try {
      inMemoryDeviceId = createDeviceId();
      return inMemoryDeviceId;
    } catch {
      return null;
    }
  }
};

/**
 * All portal API calls are first-party. Vercel rewrites production /api/v1
 * requests to Render; Vite proxies the same path during local development.
 * This wrapper adds CSRF proof and a pseudonymous OTP-abuse device key while
 * the browser attaches the HttpOnly session cookie automatically.
 */
export const installSecureApiFetch = (): void => {
  if (typeof window === 'undefined' || (window as any).__kuSecureFetchInstalled) return;
  const originalFetch = window.fetch.bind(window);
  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  if (apiUrl.origin !== window.location.origin) return;
  const apiPath = apiUrl.pathname.replace(/\/+$/, '');

  (window as any).__kuSecureFetchInstalled = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requestUrl = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    const isApiPath = requestUrl.pathname === apiPath || requestUrl.pathname.startsWith(apiPath + '/');
    if (requestUrl.origin !== window.location.origin || !isApiPath) {
      return originalFetch(input, init);
    }

    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));

    let storedToken: string | null = null;
    try { storedToken = localStorage.getItem('kurali_auth_token'); } catch { /* storage may be blocked */ }
    if (storedToken === COOKIE_SESSION_MARKER) headers.delete('Authorization');

    const deviceId = readDeviceId();
    if (deviceId) headers.set(DEVICE_HEADER, deviceId);

    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
      if (!readCookie(CSRF_COOKIE)) {
        await originalFetch(new URL(apiPath + '/auth/csrf', window.location.origin), {
          method: 'GET', credentials: 'same-origin', cache: 'no-store',
        });
      }
      const csrf = readCookie(CSRF_COOKIE);
      if (csrf) headers.set(CSRF_HEADER, csrf);
    }

    const response = await originalFetch(input, {
      ...init,
      headers,
      credentials: 'same-origin',
      cache: init?.cache || 'no-store',
    });
    if (response.status === 403) {
      const payload = await response.clone().json().catch(() => null);
      if (payload?.code === 'ADMIN_MFA_REQUIRED') {
        window.dispatchEvent(new Event('ku-admin-mfa-required'));
      }
    }
    return response;
  };
};
