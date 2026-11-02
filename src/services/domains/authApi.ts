/** Authentication and cross-portal session API boundary. */
import { API_BASE_URL } from '../http/apiConfig';

export const authApi = {
  async getOnboardingStatus(token: string, role?: string): Promise<{ success: boolean; role?: string; status?: 'PENDING' | 'APPROVED' | 'REJECTED'; message?: string }> {
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      const res = await fetch(`${API_BASE_URL}/auth/onboarding-status${query}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({ success: false }));
      if (!res.ok) return { success: false, message: data.message || 'Unable to load onboarding status' };
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Unable to load onboarding status' };
    }
  },

  async checkRegistration(email: string, phone: string, role: string): Promise<{ success: boolean; message: string; available?: boolean; existingAccount?: boolean }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/registration-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, phone, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, message: data.message || 'Unable to validate registration details' };
      return data;
    } catch {
      return { success: false, message: 'Authentication service is unavailable. Please try again.' };
    }
  },

  async sendOtp(identifier: string, type: 'EMAIL' | 'PHONE', mode: 'LOGIN' | 'REGISTER'): Promise<{ success: boolean; message: string; resendAfterSeconds?: number }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifier, type, mode }),
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({ success: false, message: '' }));
      if (!res.ok) {
        if (mode === 'LOGIN' && res.status === 404) {
          return { success: false, message: 'No registered account was found. Please register first.' };
        }
        return { success: false, message: data.message || 'Unable to send verification code' };
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.name === 'AbortError' ? 'Authentication service timed out' : 'Authentication service is unavailable' };
    }
  },

  async verifyOtp(payload: {
    identifier?: string;
    otp?: string;
    type?: 'EMAIL' | 'PHONE';
    mode: 'LOGIN' | 'REGISTER';
    name?: string;
    role?: string;
    locality?: string;
    address?: string;
    addressLine1?: string;
    landmark?: string;
    formattedAddress?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
    storeName?: string;
    category?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    licenseNumber?: string;
    email?: string;
    phone?: string;
    emailOtp?: string;
    phoneOtp?: string;
    businessType?: string; registeredBusinessName?: string; shopNumber?: string; wardNumber?: string;
    streetLocality?: string; pinCode?: string; gstNumber?: string; fssaiNumber?: string;
    fssaiLicenseType?: string; fssaiExpiryDate?: string; openingTime?: string; closingTime?: string;
    weeklyClosedDay?: string; preparationMinutes?: number; agreementAccepted?: boolean; agreementVersion?: string;
  }): Promise<{ success: boolean; token?: string; user?: any; message: string }> {
    const controller = new AbortController();
    // Verification consumes the OTP and creates a session in one request. Avoid
    // abandoning the response while the backend wakes up or completes DB work.
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({ success: false, message: 'Invalid authentication response' }));
      if (!res.ok) return { success: false, message: data.message || 'OTP verification failed' };
      return data;
    } catch (err: any) {
      return { success: false, message: err.name === 'AbortError' ? 'Authentication service timed out. Please request a fresh code before trying again.' : 'Authentication service is unavailable' };
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async uploadSellerDocument(token: string, documentType: string, file: File): Promise<{ success: boolean; documentId?: string; message?: string }> {
    try {
      const body = new FormData();
      body.append('documentType', documentType);
      body.append('file', file);
      const res = await fetch(`${API_BASE_URL}/sellers/me/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body,
      });
      const data = await res.json().catch(() => ({}));
      return res.ok ? data : { success: false, message: data.message || 'Unable to upload seller document' };
    } catch {
      return { success: false, message: 'Document upload service is unavailable' };
    }
  },

  async getMe(token: string): Promise<{ authenticated: boolean; success?: boolean; user?: any; addresses?: any[] }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_BASE_URL}/auth/me?token=${encodeURIComponent(token)}`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      console.warn('Backend getMe check:', err.message || err);
    }
    return { authenticated: false };
  },

  async logout(token: string): Promise<{ success: boolean; message: string }> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      // ignore network errors on logout
    }
    return { success: true, message: 'Logged out successfully' };
  },

  async createPortalHandoff(token: string, role: string): Promise<{ code: string; role: string } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/portal-handoff`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: role.toUpperCase() }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success && data.code && data.role ? { code: data.code, role: data.role } : null;
    } catch (err) {
      console.warn('Backend createPortalHandoff failed:', err);
      return null;
    }
  },

  async redeemPortalHandoff(code: string): Promise<{ success: boolean; token?: string; user?: any; roles?: string[]; role?: string } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/portal-handoff/redeem`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend redeemPortalHandoff failed:', err);
      return null;
    }
  },

  async getRegisteredRoles(token: string): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/roles`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return ['BUYER'];
      const data = await res.json();
      return data.success && Array.isArray(data.roles) ? data.roles : ['BUYER'];
    } catch (err) {
      console.warn('Backend getRegisteredRoles failed:', err);
      return ['BUYER'];
    }
  },
};
