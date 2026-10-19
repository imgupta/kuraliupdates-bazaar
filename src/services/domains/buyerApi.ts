/**
 * Buyer-domain API boundary.
 *
 * Booking and tracking methods remain delegated during the staged migration.
 * Buyer profile and saved-address HTTP implementations live here so the shared
 * application context does not depend on the monolithic API client for them.
 */
import { API_BASE_URL } from '../http/apiConfig';
import { bazaarApi } from '../api';
import { trackingApi } from './trackingApi';

export const buyerApi = {
  getDailyHelpServices: bazaarApi.getDailyHelpServices,
  getLatestDailyHelpBooking: bazaarApi.getLatestDailyHelpBooking,
  getDailyHelpBooking: bazaarApi.getDailyHelpBooking,
  getDailyHelpAvailableSlots: bazaarApi.getDailyHelpAvailableSlots,
  createDailyHelpBooking: bazaarApi.createDailyHelpBooking,
  getLiveTracking: trackingApi.getLiveTracking,

  async updateCurrentUser(token: string, updates: Record<string, any>): Promise<{ success: boolean; user?: any; addresses?: any[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      const data = await res.json().catch(() => ({ success: false, message: 'Invalid response' }));
      if (!res.ok) return { success: false, message: data.message || 'Unable to update profile' };
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Unable to update profile' };
    }
  },

  async getBuyerAddresses(token: string): Promise<any[] | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/addresses`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    } catch (err) {
      console.warn('Buyer API getBuyerAddresses failed:', err);
      return null;
    }
  },

  async createBuyerAddress(token: string, address: Record<string, any>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(address),
      });
      const data = await res.json().catch(() => null);
      return res.ok ? data : null;
    } catch (err) {
      console.warn('Buyer API createBuyerAddress failed:', err);
      return null;
    }
  },

  async updateBuyerAddress(token: string, addressId: string, address: Record<string, any>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/addresses/${encodeURIComponent(addressId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(address),
      });
      const data = await res.json().catch(() => null);
      return res.ok ? data : null;
    } catch (err) {
      console.warn('Buyer API updateBuyerAddress failed:', err);
      return null;
    }
  },

  async setDefaultBuyerAddress(token: string, addressId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/addresses/${encodeURIComponent(addressId)}/default`, {
        method: 'PUT',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      return res.ok ? data : null;
    } catch (err) {
      console.warn('Buyer API setDefaultBuyerAddress failed:', err);
      return null;
    }
  },
};
