/**
 * Delivery domain API.
 * All delivery-agent workflow calls are owned here; the shared API client no longer
 * exposes delivery lifecycle operations. Keep server lifecycle state authoritative.
 */
import type { DeliveryAgent } from '../../types';
import { API_BASE_URL } from '../http/apiConfig';
import { mapBackendOrder } from '../../entities/orderMapping';
import { trackingApi } from './trackingApi';

export const deliveryApi = {
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

  async registerDeliveryAgent(agent: Partial<DeliveryAgent>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/delivery/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agent.name,
          phone: agent.phone,
          email: agent.email,
          vehicleType: agent.vehicleType,
          vehicleNumber: agent.vehicleNumber,
          licenseNumber: agent.licenseNumber,
          currentLocality: agent.currentLocality || 'Main Bazaar',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend registerDeliveryAgent failed:', err);
      return null;
    }
  },

  async setAvailability(available: boolean): Promise<any> {
    const token = localStorage.getItem('kurali_auth_token');
    if (!token) throw new Error('Your delivery session has expired. Please sign in again.');
    const res = await fetch(`${API_BASE_URL}/delivery/me/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ available }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  },

  async getAvailableDeliveryJobs(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/delivery/jobs/available`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getAvailableDeliveryJobs failed:', err);
      return [];
    }
  },

  async getDeliveryAvailableJobs(): Promise<any[]> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return [];
      const res = await fetch(`${API_BASE_URL}/delivery/jobs/available`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      return (Array.isArray(data) ? data : []).map(mapBackendOrder);
    } catch (err) {
      console.warn('Backend getAvailableDeliveryJobs failed:', err);
      return [];
    }
  },

  async getMyAssignedJobs(): Promise<any[]> {
    const token = localStorage.getItem('kurali_auth_token');
    if (!token) return [];
    const res = await fetch(`${API_BASE_URL}/delivery/jobs/mine`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data?.message || data?.error || `Unable to load assigned deliveries (HTTP ${res.status})`);
    return (Array.isArray(data) ? data : []).map(mapBackendOrder);
  },

  async claimDeliveryJob(orderId: string, agentId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return false;
      const res = await fetch(
        `${API_BASE_URL}/delivery/jobs/${encodeURIComponent(orderId)}/claim?agentId=${encodeURIComponent(agentId)}`,
        { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }
      );
      return res.ok;
    } catch (err) {
      console.warn('Backend claimDeliveryJob failed:', err);
      return false;
    }
  },

  async claimDeliveryCheckoutGroup(checkoutGroupId: string, agentId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return false;
      const res = await fetch(
        `${API_BASE_URL}/delivery/jobs/checkout/${encodeURIComponent(checkoutGroupId)}/claim?agentId=${encodeURIComponent(agentId)}`,
        { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }
      );
      return res.ok;
    } catch (err) {
      console.warn('Backend claimDeliveryCheckoutGroup failed:', err);
      return false;
    }
  },

  async confirmSellerPickup(orderId: string): Promise<any> {
    const token = localStorage.getItem('kurali_auth_token');
    if (!token) throw new Error('Your delivery session has expired. Please sign in again.');
    const res = await fetch(`${API_BASE_URL}/delivery/jobs/${encodeURIComponent(orderId)}/confirm-pickup`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || 'Unable to confirm seller pickup');
    return data;
  },

  async verifyDeliveryOtp(orderId: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return { success: false, message: 'Your session has expired.' };
      const res = await fetch(`${API_BASE_URL}/delivery/jobs/${encodeURIComponent(orderId)}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json().catch(() => ({}));
      return { success: res.ok && data.success !== false, message: data.message || (res.ok ? 'OTP verified' : 'Unable to verify OTP') };
    } catch (err: any) {
      console.warn('Backend verifyDeliveryOtp failed:', err);
      return { success: false, message: err.message || 'Failed to verify OTP' };
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
