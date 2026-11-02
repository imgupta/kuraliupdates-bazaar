import { API_BASE_URL } from '../http/apiConfig';

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Seller registration service is unavailable');
  return data as T;
}

export const sellerOnboardingApi = {
  start: (ownerName: string, email: string, phone: string) =>
    request<{ success: boolean; leadId: string; status: string }>('/seller-registration/leads', 'POST', { ownerName, email, phone }),
  sendContactOtps: (leadId: string) =>
    request<{ success: boolean; expiresInSeconds: number; resendAfterSeconds: number }>(`/seller-registration/leads/${encodeURIComponent(leadId)}/send-contact-otps`, 'POST'),
  verifyContact: (leadId: string, emailOtp: string, phoneOtp: string) =>
    request<{ success: boolean; leadId: string; status: string }>(`/seller-registration/leads/${encodeURIComponent(leadId)}/verify-contact`, 'POST', { emailOtp, phoneOtp }),
  requestCallback: (leadId: string, consent: boolean, preferredTime?: string) =>
    request<{ success: boolean; message: string }>(`/seller-registration/leads/${encodeURIComponent(leadId)}/callback`, 'POST', { consent, preferredTime }),
};
