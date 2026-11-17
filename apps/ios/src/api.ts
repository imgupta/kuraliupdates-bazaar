export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://kuraliupdates-bazaar.onrender.com/api/v1';

export type LoginChannel = 'EMAIL' | 'PHONE';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.message === 'string' ? payload.message : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export async function sendLoginOtp(identifier: string, type: LoginChannel) {
  return request<{ success: boolean; message: string; resendAfterSeconds?: number }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ identifier: identifier.trim(), type, mode: 'LOGIN' }),
  });
}

export interface AuthUser {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  locality?: string;
  [key: string]: unknown;
}

export async function verifyLoginOtp(identifier: string, otp: string, type: LoginChannel) {
  return request<{ success: boolean; token?: string; user?: AuthUser; message?: string }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ identifier: identifier.trim(), otp: otp.trim(), type, mode: 'LOGIN', role: 'buyer' }),
  });
}

export interface Product {
  productId: string;
  name?: string;
  title?: string;
  category?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  price: number;
  sellerPrice?: number;
  mrp?: number;
  unit?: string;
  stock?: number;
  stockQty?: number;
  sellerId?: string;
  seller?: { sellerId?: string; name?: string; locality?: string };
}

export async function searchProducts(query = '') {
  const result = await request<Product[]>(
    `/buyers/products/search?query=${encodeURIComponent(query)}&page=0&size=40`,
  );
  return result.filter((item) =>
    Boolean(item.productId && (item.name || item.title) && Number.isFinite(Number(item.sellerPrice ?? item.price))),
  );
}

export async function getMyOrders(token: string) {
  return request<Array<Record<string, unknown>>>('/buyers/me/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
}


export type MobileRole = 'BUYER' | 'SELLER' | 'DELIVERY' | 'PROFESSIONAL';

export async function getRegisteredRoles(token: string): Promise<MobileRole[]> {
  const result = await request<{ success?: boolean; roles?: string[] }>('/auth/me/roles', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allowed: MobileRole[] = ['BUYER', 'SELLER', 'DELIVERY', 'PROFESSIONAL'];
  return (Array.isArray(result.roles) ? result.roles : [])
    .map(role => role.toUpperCase() as MobileRole)
    .filter((role, index, all) => allowed.includes(role) && all.indexOf(role) === index);
}

export async function createRoleHandoff(token: string, role: MobileRole) {
  return request<{ success: boolean; code?: string; role?: string }>('/auth/portal-handoff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  });
}

export async function redeemRoleHandoff(code: string) {
  return request<{ success: boolean; token?: string; user?: AuthUser; roles?: string[]; role?: string }>(
    '/auth/portal-handoff/redeem',
    { method: 'POST', body: JSON.stringify({ code }) },
  );
}

export async function getRoleOnboardingStatus(token: string, role: MobileRole) {
  return request<{ success: boolean; role?: string; status?: string; message?: string }>(
    `/auth/onboarding-status?role=${encodeURIComponent(role)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export type MobileRecord = Record<string, any>;
async function authed<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
}
export const mobileApi = {
  sellerMe: (t: string) => authed<MobileRecord>('/sellers/me', t),
  sellerProducts: (t: string) => authed<MobileRecord[]>('/sellers/me/products', t),
  sellerOrders: (t: string) => authed<MobileRecord[]>('/sellers/me/orders', t),
  sellerAvailability: (t: string, open: boolean) => authed<MobileRecord>('/sellers/me/availability', t, { method: 'PUT', body: JSON.stringify({ open }) }),
  sellerOrderStatus: (t: string, id: string, status: string) => authed<MobileRecord>(`/sellers/me/orders/${encodeURIComponent(id)}/status?status=${encodeURIComponent(status)}`, t, { method: 'POST' }),
  deliveryMe: (t: string) => authed<MobileRecord>('/delivery/me', t),
  deliveryAvailable: (t: string) => authed<MobileRecord[]>('/delivery/jobs/available', t),
  deliveryMine: (t: string) => authed<MobileRecord[]>('/delivery/jobs/mine', t),
  deliveryAvailability: (t: string, available: boolean) => authed<MobileRecord>('/delivery/me/availability', t, { method: 'PUT', body: JSON.stringify({ available }) }),
  deliveryPickup: (t: string, id: string) => authed<MobileRecord>(`/delivery/jobs/${encodeURIComponent(id)}/confirm-pickup`, t, { method: 'POST' }),
  deliveryResendOtp: (t: string, id: string) => authed<MobileRecord>(`/delivery/jobs/${encodeURIComponent(id)}/resend-otp`, t, { method: 'POST' }),
  deliveryVerifyOtp: (t: string, id: string, otp: string) => authed<MobileRecord>(`/delivery/jobs/${encodeURIComponent(id)}/verify-otp`, t, { method: 'POST', body: JSON.stringify({ otp }) }),
  dailyProfessional: (t: string, phone: string) => authed<MobileRecord>(`/daily-help/professionals/by-phone/${encodeURIComponent(phone)}`, t),
  dailyAvailable: (t: string, id: string) => authed<MobileRecord[]>(`/daily-help/professionals/${encodeURIComponent(id)}/jobs/available`, t),
  dailyMine: (t: string, id: string) => authed<MobileRecord[]>(`/daily-help/professionals/${encodeURIComponent(id)}/jobs`, t),
  dailyAccept: (t: string, id: string, bookingId: string) => authed<MobileRecord>(`/daily-help/professionals/${encodeURIComponent(id)}/jobs/${encodeURIComponent(bookingId)}/accept`, t, { method: 'POST' }),
  dailyStart: (t: string, bookingId: string, professionalId: string, otp: string) => authed<MobileRecord>(`/daily-help/bookings/${encodeURIComponent(bookingId)}/start`, t, { method: 'POST', body: JSON.stringify({ professionalId, otp }) }),
  dailyComplete: (t: string, bookingId: string, professionalId: string) => authed<MobileRecord>(`/daily-help/bookings/${encodeURIComponent(bookingId)}/complete?professionalId=${encodeURIComponent(professionalId)}`, t, { method: 'POST' }),
};
