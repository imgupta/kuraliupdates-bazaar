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
  createOrResumeSharedApplication: async (details: Record<string, unknown>, sessionToken?: string) => {
    const token = sessionToken || localStorage.getItem('kurali_auth_token');
    if (!token) throw new Error('Your seller session has expired. Sign in again to continue.');
    const response = await fetch(`${API_BASE_URL}/seller-applications/self`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(details),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Unable to create or resume the shared seller application');
    return data as { applicationId: string; status: string; sellerAccessToken: string };
  },
  uploadSharedDocument: async (applicationId: string, accessToken: string, documentType: string, file: File) => {
    const form = new FormData();
    form.append('documentType', documentType); form.append('file', file);
    const response = await fetch(`${API_BASE_URL}/seller-applications/${encodeURIComponent(applicationId)}/documents`, {
      method: 'POST', headers: { 'X-Seller-Application-Token': accessToken, Accept: 'application/json' }, body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Unable to upload ${documentType}`);
    return data as { documentId: string; scanStatus: string; verificationStatus: string };
  },
  submitSharedApplication: async (applicationId: string, accessToken: string) => {
    const response = await fetch(`${API_BASE_URL}/seller-applications/${encodeURIComponent(applicationId)}/submit`, {
      method: 'POST', headers: { 'X-Seller-Application-Token': accessToken, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ agreementAccepted: true }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Unable to submit the shared seller application');
    return data as { applicationId: string; status: string };
  },
  start: (ownerName: string, email: string, phone: string) =>
    request<{ success: boolean; leadId: string; status: string }>('/seller-registration/leads', 'POST', { ownerName, email, phone }),
  sendContactOtps: (leadId: string) =>
    request<{ success: boolean; emailOtpRequired: boolean; mobileOtpRequired: boolean; expiresInSeconds: number; resendAfterSeconds: number }>(`/seller-registration/leads/${encodeURIComponent(leadId)}/send-contact-otps`, 'POST'),
  verifyContact: (leadId: string, emailOtp: string, phoneOtp: string) =>
    request<{ success: boolean; leadId: string; status: string }>(`/seller-registration/leads/${encodeURIComponent(leadId)}/verify-contact`, 'POST', { emailOtp, phoneOtp }),
  requestCallback: (leadId: string, consent: boolean, preferredTime?: string) =>
    request<{ success: boolean; message: string }>(`/seller-registration/leads/${encodeURIComponent(leadId)}/callback`, 'POST', { consent, preferredTime }),
};
