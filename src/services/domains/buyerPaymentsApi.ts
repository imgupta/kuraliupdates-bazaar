import { API_BASE_URL } from '../http/apiConfig';

const token = () => localStorage.getItem('kurali_auth_token');
const headers = () => {
  const value = token();
  if (!value) throw new Error('Please sign in again to manage seller payments.');
  return { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${value}` };
};
const request = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) }, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Payment request failed (HTTP ${response.status})`);
  return body;
};

export const buyerPaymentsApi = {
  getOrderPayment: (orderId: string) => request(`/buyers/orders/${encodeURIComponent(orderId)}/payment`),
  getCheckoutPayments: (groupId: string) => request(`/buyers/orders/checkout-groups/${encodeURIComponent(groupId)}/payments`),
  submitUtr: (orderId: string, utrReference: string) => request(`/buyers/orders/${encodeURIComponent(orderId)}/payment/utr`, {
    method: 'POST',
    body: JSON.stringify({ utrReference, idempotencyKey: `utr-${orderId}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}` }),
  }),
  requestRefund: (orderId: string, reason: string) => request(`/buyers/orders/${encodeURIComponent(orderId)}/payment/refund`, {
    method: 'POST', body: JSON.stringify({ reason }),
  }),
  reportIssue: (orderId: string, issueType: string, description: string) => request(`/buyers/orders/${encodeURIComponent(orderId)}/issues`, {
    method: 'POST', body: JSON.stringify({ issueType, description }),
  }),
};
