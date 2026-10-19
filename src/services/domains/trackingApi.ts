/**
 * Shared tracking API boundary.
 *
 * Tracking HTTP requests are implemented here so buyer and delivery screens can
 * depend on the tracking domain without reaching into the monolithic API client.
 */
import { API_BASE_URL } from '../http/apiConfig';

export const trackingApi = {
  async getLiveTracking(orderId: string): Promise<any> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      const res = await fetch(`${API_BASE_URL}/tracking/orders/${encodeURIComponent(orderId)}`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend getLiveTracking failed:', err);
      return null;
    }
  },

  async updateDeliveryLocation(agentId: string, latitude: number, longitude: number): Promise<boolean> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      const res = await fetch(`${API_BASE_URL}/tracking/delivery/${encodeURIComponent(agentId)}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ latitude, longitude }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend updateDeliveryLocation failed:', err);
      return false;
    }
  },
};
