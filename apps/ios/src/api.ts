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
