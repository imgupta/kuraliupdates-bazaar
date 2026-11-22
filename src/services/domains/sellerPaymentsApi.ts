import { API_BASE_URL } from '../http/apiConfig';
const headers = () => {
  const token = localStorage.getItem('kurali_auth_token');
  if (!token) throw new Error('Please sign in again.');
  return { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};
const call = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) }, cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `Request failed (HTTP ${res.status})`);
  return body;
};
export const sellerPaymentsApi = {
  getDestination: () => call('/sellers/me/payment-destination'),
  saveDestination: (upiId: string, payeeName: string) => call('/sellers/me/payment-destination', { method: 'PUT', body: JSON.stringify({ upiId, payeeName }) }),
  getPayments: () => call('/sellers/me/payments'),
  decidePayment: (paymentId: string, confirm: boolean, reason?: string) => call(`/sellers/me/payments/${encodeURIComponent(paymentId)}/decision`, { method: 'POST', body: JSON.stringify({ confirm, reason }) }),
  updateRefund: (paymentId: string, action: 'INITIATE'|'COMPLETE'|'REJECT', reference?: string, reason?: string) => call(`/sellers/me/payments/${encodeURIComponent(paymentId)}/refund`, { method: 'POST', body: JSON.stringify({ action, reference, reason }) }),
};
