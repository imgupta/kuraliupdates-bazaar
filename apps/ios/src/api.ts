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
  deliveryClaim: (t: string, orderId: string, agentId: string) => authed<MobileRecord>(`/delivery/jobs/${encodeURIComponent(orderId)}/claim?agentId=${encodeURIComponent(agentId)}`, t, { method: 'POST' }),
  deliveryAvailability: (t: string, available: boolean) => authed<MobileRecord>('/delivery/me/availability', t, { method: 'PUT', body: JSON.stringify({ available }) }),
  deliveryPickup: (t: string, id: string) => authed<MobileRecord>(`/delivery/jobs/${encodeURIComponent(id)}/confirm-pickup`, t, { method: 'POST' }),
  deliveryResendOtp: (t: string, id: string) => authed<MobileRecord>(`/delivery/jobs/${encodeURIComponent(id)}/resend-otp`, t, { method: 'POST' }),
  deliveryVerifyOtp: (t: string, id: string, otp: string) => authed<MobileRecord>(`/delivery/jobs/${encodeURIComponent(id)}/verify-otp`, t, { method: 'POST', body: JSON.stringify({ otp }) }),
  dailyProfessional: (t: string, phone: string) => authed<MobileRecord>(`/daily-help/professionals/by-phone/${encodeURIComponent(phone)}`, t),
  dailyAvailable: (t: string, id: string) => authed<MobileRecord[]>(`/daily-help/professionals/${encodeURIComponent(id)}/jobs/available`, t),
  dailyMine: (t: string, id: string) => authed<MobileRecord[]>(`/daily-help/professionals/${encodeURIComponent(id)}/jobs`, t),
  dailyAccept: (t: string, id: string, bookingId: string) => authed<MobileRecord>(`/daily-help/professionals/${encodeURIComponent(id)}/jobs/${encodeURIComponent(bookingId)}/accept`, t, { method: 'POST' }),
  dailyAvailability: (t: string, id: string, available: boolean) => authed<MobileRecord>(`/daily-help/professionals/${encodeURIComponent(id)}/availability`, t, { method: 'POST', body: JSON.stringify({ status: available ? 'AVAILABLE' : 'UNAVAILABLE' }) }),
  dailyStart: (t: string, bookingId: string, professionalId: string, otp: string) => authed<MobileRecord>(`/daily-help/bookings/${encodeURIComponent(bookingId)}/start`, t, { method: 'POST', body: JSON.stringify({ professionalId, otp }) }),
  dailyComplete: (t: string, bookingId: string, professionalId: string) => authed<MobileRecord>(`/daily-help/bookings/${encodeURIComponent(bookingId)}/complete?professionalId=${encodeURIComponent(professionalId)}`, t, { method: 'POST' }),

  // Buyer checkout and lifecycle; server validates stock, accepted offers and configured constraints.
  buyerCheckout: (t: string, payload: MobileRecord) => authed<MobileRecord>('/buyers/orders/checkout', t, { method: 'POST', body: JSON.stringify(payload) }),
  buyerPlaceOrder: (t: string, payload: MobileRecord) => authed<MobileRecord>('/buyers/orders', t, { method: 'POST', body: JSON.stringify(payload) }),
  buyerCancelOrder: (t: string, id: string) => authed<MobileRecord>(`/buyers/orders/${encodeURIComponent(id)}/cancel`, t, { method: 'POST' }),
  buyerTrackOrder: (t: string, id: string) => authed<MobileRecord>(`/buyers/orders/${encodeURIComponent(id)}/track`, t),
  buyerAddresses: (t: string) => authed<MobileRecord[]>('/auth/me/addresses', t),
  buyerCreateAddress: (t: string, payload: MobileRecord) => authed<MobileRecord>('/auth/me/addresses', t, { method: 'POST', body: JSON.stringify(payload) }),
  buyerUpdateAddress: (t: string, id: string, payload: MobileRecord) => authed<MobileRecord>(`/auth/me/addresses/${encodeURIComponent(id)}`, t, { method: 'PUT', body: JSON.stringify(payload) }),
  buyerSetDefaultAddress: (t: string, id: string) => authed<MobileRecord>(`/auth/me/addresses/${encodeURIComponent(id)}/default`, t, { method: 'PUT' }),
  // Bargaining never sends an offer merely by opening the chat.
  bargainList: (t: string, role: 'BUYER'|'SELLER' = 'BUYER') => authed<MobileRecord[]>(`/negotiations?role=${role}`, t, { headers: { 'X-Active-Role': role } }),
  bargainOpen: (t: string, productId: string, startingOfferPrice: number, openingMessage: string) => authed<MobileRecord>('/negotiations', t, { method: 'POST', headers: { 'X-Active-Role': 'BUYER' }, body: JSON.stringify({ productId, startingOfferPrice, openingMessage }) }),
  bargainSend: (t: string, chatId: string, text: string, offerPrice?: number, role: 'BUYER'|'SELLER' = 'BUYER') => authed<MobileRecord>(`/negotiations/${encodeURIComponent(chatId)}/messages`, t, { method: 'POST', headers: { 'X-Active-Role': role }, body: JSON.stringify({ text, ...(offerPrice === undefined ? {} : { offerPrice }) }) }),
  bargainRespond: (t: string, chatId: string, offerId: string, action: 'ACCEPT'|'REJECT'|'COUNTER', counterPrice?: number, role: 'BUYER'|'SELLER' = 'BUYER') => authed<MobileRecord>(`/negotiations/${encodeURIComponent(chatId)}/offers/${encodeURIComponent(offerId)}/respond`, t, { method: 'POST', headers: { 'X-Active-Role': role }, body: JSON.stringify({ action, ...(counterPrice === undefined ? {} : { counterPrice }) }) }),
  dailyServices: () => request<MobileRecord[]>('/daily-help/services'),
  dailySlots: (date: string, requestedHours: number, locality?: string) => request<MobileRecord[]>(`/daily-help/availability?date=${encodeURIComponent(date)}&requestedHours=${encodeURIComponent(String(requestedHours))}${locality ? `&locality=${encodeURIComponent(locality)}` : ''}`),
  dailyCreateBooking: (t: string, payload: MobileRecord) => authed<MobileRecord>('/daily-help/bookings', t, { method: 'POST', body: JSON.stringify(payload) }),
  dailyBookings: (t: string, phone: string) => authed<MobileRecord[]>(`/daily-help/bookings?buyerPhone=${encodeURIComponent(phone)}`, t),
  dailyGetBooking: (t: string, id: string) => authed<MobileRecord>(`/daily-help/bookings/${encodeURIComponent(id)}`, t),
  dailyProfessionalSlots: (t: string, id: string, date: string) => authed<MobileRecord[]>(`/daily-help/professionals/${encodeURIComponent(id)}/slots?date=${encodeURIComponent(date)}`, t),
  dailyCreateSlot: (t: string, id: string, payload: MobileRecord) => authed<MobileRecord>(`/daily-help/professionals/${encodeURIComponent(id)}/slots`, t, { method: 'POST', body: JSON.stringify(payload) }),
  dailyCancelSlot: (t: string, id: string, slotId: string) => authed<MobileRecord>(`/daily-help/professionals/${encodeURIComponent(id)}/slots/${encodeURIComponent(slotId)}`, t, { method: 'DELETE' }),
  dailyEarnings: (t: string, id: string) => authed<MobileRecord>(`/daily-help/professionals/${encodeURIComponent(id)}/earnings`, t),
  sellerCreateProduct: (t: string, payload: MobileRecord) => authed<MobileRecord>('/sellers/me/products', t, { method: 'POST', body: JSON.stringify(payload) }),
  sellerUpdateProduct: (t: string, id: string, payload: MobileRecord) => authed<MobileRecord>(`/sellers/me/products/${encodeURIComponent(id)}`, t, { method: 'PUT', body: JSON.stringify(payload) }),
  sellerDeleteProduct: (t: string, id: string) => authed<void>(`/sellers/me/products/${encodeURIComponent(id)}`, t, { method: 'DELETE' }),
  sellerDiscounts: (t: string) => authed<MobileRecord[]>('/sellers/me/discounts', t),
  sellerCreateDiscount: (t: string, payload: MobileRecord) => authed<MobileRecord>('/sellers/me/discounts', t, { method: 'POST', body: JSON.stringify(payload) }),
  sellerDeleteDiscount: (t: string, id: string) => authed<void>(`/sellers/me/discounts/${encodeURIComponent(id)}`, t, { method: 'DELETE' }),
  deliveryUpdateLocation: (t: string, id: string, latitude: number, longitude: number) => authed<MobileRecord>(`/tracking/delivery/${encodeURIComponent(id)}/location`, t, { method: 'POST', body: JSON.stringify({ latitude, longitude }) }),
  orderTracking: (t: string, id: string) => authed<MobileRecord>(`/tracking/orders/${encodeURIComponent(id)}`, t),
};
