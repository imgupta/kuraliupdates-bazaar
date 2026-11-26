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
export const sellerReturnsApi = {
  list: () => call('/sellers/me/returns'),
  decide: (id: string, approve: boolean, reason?: string) => call(`/sellers/me/returns/${encodeURIComponent(id)}/decision`, { method: 'POST', body: JSON.stringify({ approve, reason }) }),
  confirmReceipt: (id: string, acceptedQuantity: number, condition: string, note?: string) => call(`/sellers/me/returns/${encodeURIComponent(id)}/receipt`, { method: 'POST', body: JSON.stringify({ acceptedQuantity, condition, note }) }),
  refund: (id: string, action: 'INITIATE'|'COMPLETE', method?: string, reference?: string) => call(`/sellers/me/returns/${encodeURIComponent(id)}/refund`, { method: 'POST', body: JSON.stringify({ action, method, reference }) }),
};
