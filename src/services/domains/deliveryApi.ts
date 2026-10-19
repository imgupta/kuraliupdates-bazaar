/**
 * Delivery API boundary.
 *
 * Delivery workflows use this facade while each domain operation is moved out
 * of the monolithic API client incrementally.
 */
import { API_BASE_URL, bazaarApi } from '../api';
import { trackingApi } from './trackingApi';

export const deliveryApi = {
  ...bazaarApi,

  async getCurrentDeliveryAgent(): Promise<any | null> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return null;
      const res = await fetch(`${API_BASE_URL}/delivery/me`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend getCurrentDeliveryAgent failed:', err);
      return null;
    }
  },

  async resendDeliveryOtp(orderId: string): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem('kurali_auth_token');
    if (!token) throw new Error('Your delivery session has expired. Please sign in again.');
    const res = await fetch(`${API_BASE_URL}/delivery/jobs/${encodeURIComponent(orderId)}/resend-otp`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || 'Unable to resend delivery OTP');
    return data;
  },

  updateDeliveryLocation: trackingApi.updateDeliveryLocation,
};
