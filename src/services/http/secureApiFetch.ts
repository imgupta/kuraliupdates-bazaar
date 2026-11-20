import { API_BASE_URL } from './apiConfig';

const COOKIE_SESSION_MARKER = '__COOKIE_SESSION__';
const CSRF_COOKIE = '__Host-ku_csrf';
const CSRF_HEADER = 'X-KU-CSRF';
const DEVICE_STORAGE_KEY = 'kurali_device_id';
const DEVICE_HEADER = 'X-KU-Device-ID';
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const REFRESH_RETRY_BACKOFF_MS = 60 * 1000;
const SHARED_REFRESH_AT_KEY = 'kurali_session_refresh_at';
const SHARED_REFRESH_LOCK_KEY = 'kurali_session_refresh_lock';
const TAB_ID = (() => {
  try { return window.crypto.randomUUID(); } catch { return 'tab-' + Math.random().toString(36).slice(2); }
})();
let inMemoryDeviceId: string | null = null;
let lastSessionRefreshAt = 0;
let lastSessionRefreshAttemptAt = 0;
let refreshInFlight: Promise<boolean> | null = null;
let releaseNativeRefreshLock: (() => void) | null = null;

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

const bootstrapCsrf = async (originalFetch: typeof fetch, apiPath: string): Promise<string | null> => {
  if (!readCookie(CSRF_COOKIE)) {
    await originalFetch(new URL(apiPath + '/auth/csrf', window.location.origin), {
      method: 'GET', credentials: 'same-origin', cache: 'no-store',
    });
  }
  return readCookie(CSRF_COOKIE);
};

const readSharedRefreshAt = (): number => {
  try {
    const value = Number(localStorage.getItem(SHARED_REFRESH_AT_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

const markSessionRefreshed = (): void => {
  lastSessionRefreshAt = Date.now();
  lastSessionRefreshAttemptAt = 0;
  try { localStorage.setItem(SHARED_REFRESH_AT_KEY, String(lastSessionRefreshAt)); } catch { /* optional cross-tab signal */ }
};

const acquireCrossTabRefreshLock = async (startedAt: number): Promise<'owner' | 'refreshed' | 'unavailable'> => {
  const lockManager = (navigator as any).locks;
  if (lockManager?.request) {
    return new Promise(resolve => {
      let settled = false;
      lockManager.request('kuraliupdates-session-refresh', { mode: 'exclusive' }, async (lock: unknown) => {
        if (!lock) {
          settled = true;
          resolve('unavailable');
          return;
        }
        const sharedRefreshAt = readSharedRefreshAt();
        if (sharedRefreshAt > startedAt && Date.now() - sharedRefreshAt < REFRESH_INTERVAL_MS) {
          lastSessionRefreshAt = sharedRefreshAt;
          settled = true;
          resolve('refreshed');
          return;
        }
        settled = true;
        resolve('owner');
        await new Promise<void>(release => { releaseNativeRefreshLock = release; });
      }).catch(() => {
        if (!settled) resolve('owner');
      });
    });
  }

  try {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const sharedRefreshAt = readSharedRefreshAt();
      if (sharedRefreshAt > startedAt && Date.now() - sharedRefreshAt < REFRESH_INTERVAL_MS) {
        lastSessionRefreshAt = sharedRefreshAt;
        return 'refreshed';
      }

      let lock: { owner?: string; expiresAt?: number } = {};
      try { lock = JSON.parse(localStorage.getItem(SHARED_REFRESH_LOCK_KEY) || '{}'); } catch { lock = {}; }
      const now = Date.now();
      if (!lock.owner || !Number.isFinite(lock.expiresAt) || Number(lock.expiresAt) <= now
          || Number(lock.expiresAt) > now + 30000) {
        localStorage.setItem(SHARED_REFRESH_LOCK_KEY, JSON.stringify({ owner: TAB_ID, expiresAt: now + 20000 }));
        await new Promise(resolve => window.setTimeout(resolve, 100));
        let confirmed: { owner?: string } = {};
        try { confirmed = JSON.parse(localStorage.getItem(SHARED_REFRESH_LOCK_KEY) || '{}'); } catch { confirmed = {}; }
        if (confirmed.owner === TAB_ID) return 'owner';
      }
      await new Promise(resolve => window.setTimeout(resolve, 120));
    }
    return 'unavailable';
  } catch {
    // Storage may be disabled; per-tab single-flight still prevents local races.
    return 'owner';
  }
};

const releaseCrossTabRefreshLock = (): void => {
  if (releaseNativeRefreshLock) {
    const release = releaseNativeRefreshLock;
    releaseNativeRefreshLock = null;
    release();
  }
  try {
    const lock = JSON.parse(localStorage.getItem(SHARED_REFRESH_LOCK_KEY) || '{}');
    if (lock.owner === TAB_ID) localStorage.removeItem(SHARED_REFRESH_LOCK_KEY);
  } catch { /* lock expires automatically if storage becomes unavailable */ }
};

const refreshSessionIfNeeded = async (
  originalFetch: typeof fetch,
  apiPath: string,
  legacyToken: string | null,
): Promise<boolean> => {
  const now = Date.now();
  if (refreshInFlight) return refreshInFlight;
  const sharedRefreshAt = readSharedRefreshAt();
  if (sharedRefreshAt > lastSessionRefreshAt) lastSessionRefreshAt = sharedRefreshAt;
  if (now - lastSessionRefreshAt < REFRESH_INTERVAL_MS) return true;
  if (lastSessionRefreshAttemptAt && now - lastSessionRefreshAttemptAt < REFRESH_RETRY_BACKOFF_MS) return false;

  lastSessionRefreshAttemptAt = now;
  refreshInFlight = (async () => {
    const lockResult = await acquireCrossTabRefreshLock(now);
    if (lockResult === 'refreshed') return true;
    if (lockResult !== 'owner') return false;
    try {
    const headers = new Headers();
    const csrf = await bootstrapCsrf(originalFetch, apiPath);
    if (csrf) headers.set(CSRF_HEADER, csrf);
    const deviceId = readDeviceId();
    if (deviceId) headers.set(DEVICE_HEADER, deviceId);
    // A one-time compatibility bridge lets an older localStorage bearer session
    // be rotated into the HttpOnly cookie without exposing the new token.
    if (legacyToken && legacyToken !== COOKIE_SESSION_MARKER) {
      headers.set('Authorization', 'Bearer ' + legacyToken);
    }
    const response = await originalFetch(new URL(apiPath + '/auth/refresh', window.location.origin), {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (response.ok) {
      markSessionRefreshed();
      return true;
    }
    return false;
    } finally {
      releaseCrossTabRefreshLock();
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

/**
 * All portal API calls are first-party. Vercel rewrites production /api/v1
 * requests to Render; Vite proxies the same path during local development.
 * The browser attaches the HttpOnly cookie automatically, while this wrapper
 * supplies CSRF/device signals and performs single-flight session rotation.
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
    const suffix = requestUrl.pathname.slice(apiPath.length) || '/';
    const skipRefresh = new Set([
      '/auth/send-otp', '/auth/verify-otp', '/auth/registration-check',
      '/auth/csrf', '/auth/refresh', '/auth/logout', '/auth/portal-handoff/redeem',
    ]);
    if (storedToken && !skipRefresh.has(suffix)) {
      await refreshSessionIfNeeded(originalFetch, apiPath, storedToken);
    }

    if (storedToken === COOKIE_SESSION_MARKER) headers.delete('Authorization');

    const deviceId = readDeviceId();
    if (deviceId) headers.set(DEVICE_HEADER, deviceId);

    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
      const csrf = await bootstrapCsrf(originalFetch, apiPath);
      if (csrf) headers.set(CSRF_HEADER, csrf);
    }

    const response = await originalFetch(input, {
      ...init,
      headers,
      credentials: 'same-origin',
      cache: init?.cache || 'no-store',
    });
    if (response.ok && (suffix === '/auth/verify-otp' || suffix === '/auth/portal-handoff/redeem'
        || suffix === '/auth/refresh' || suffix === '/auth/me')) {
      markSessionRefreshed();
    }
    if (response.ok && suffix === '/auth/logout') {
      lastSessionRefreshAt = 0;
      lastSessionRefreshAttemptAt = 0;
      try { localStorage.removeItem(SHARED_REFRESH_AT_KEY); } catch { /* ignore */ }
    }
    if (response.status === 403) {
      const payload = await response.clone().json().catch(() => null);
      if (payload?.code === 'ADMIN_MFA_REQUIRED') {
        window.dispatchEvent(new Event('ku-admin-mfa-required'));
      }
    }
    return response;
  };
};
