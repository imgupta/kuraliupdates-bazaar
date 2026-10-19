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

  updateDeliveryLocation: trackingApi.updateDeliveryLocation,
};
