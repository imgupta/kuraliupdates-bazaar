import type { DailyHelpBooking, DailyHelpService } from '../../types';
import { API_BASE_URL } from '../http/apiConfig';

/** Domain-owned API operations; endpoint and fallback behavior retained from the legacy client. */
export const dailyHelpApi = {
  async getDailyHelpServices(): Promise<DailyHelpService[]> {
      try {
        const res = await fetch(`${API_BASE_URL}/daily-help/services`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend getDailyHelpServices failed:', err);
        return [];
      }
    },

  async createDailyHelpBooking(payload: Record<string, any>): Promise<DailyHelpBooking | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
        return data;
      } catch (err: any) {
        console.warn('Backend createDailyHelpBooking failed:', err);
        throw new Error(err?.message || 'Unable to create Daily Help booking');
      }
    },

  async getDailyHelpAvailableSlots(date: string, requestedHours: number, locality?: string): Promise<any[]> {
      try {
        const params = new URLSearchParams({ date, requestedHours: String(requestedHours) });
        if (locality?.trim()) params.set('locality', locality.trim());
        const res = await fetch(`${API_BASE_URL}/daily-help/availability?${params.toString()}`, {
          headers: { Accept: 'application/json' },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn('Backend getDailyHelpAvailableSlots failed:', err);
        return [];
      }
    },

  async getLatestDailyHelpBooking(buyerPhone: string): Promise<DailyHelpBooking | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/bookings/latest?buyerPhone=${encodeURIComponent(buyerPhone)}`, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.warn('Backend getLatestDailyHelpBooking failed:', err);
        return null;
      }
    },

  async getDailyHelpBooking(bookingId: string): Promise<DailyHelpBooking | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/bookings/${encodeURIComponent(bookingId)}`, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.warn('Backend getDailyHelpBooking failed:', err);
        return null;
      }
    }
};
