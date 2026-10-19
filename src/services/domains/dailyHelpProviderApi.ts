import type { DailyHelpBooking, DailyHelpProfessional, DailyHelpProfessionalEarnings } from '../../types';
import { API_BASE_URL } from '../http/apiConfig';

/** Domain-owned API operations; endpoint and fallback behavior retained from the legacy client. */
export const dailyHelpProviderApi = {
  async getDailyHelpProfessionalSlots(professionalId: string, date: string): Promise<any[]> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/professionals/${encodeURIComponent(professionalId)}/slots?date=${encodeURIComponent(date)}`, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return [];
        return await res.json();
      } catch (err) {
        console.warn('Backend getDailyHelpProfessionalSlots failed:', err);
        return [];
      }
    },

  async createDailyHelpProfessionalSlot(professionalId: string, slotDate: string, startTime: string, endTime: string): Promise<any | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/professionals/${encodeURIComponent(professionalId)}/slots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ slotDate, startTime, endTime }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
        return data;
      } catch (err: any) {
        console.warn('Backend createDailyHelpProfessionalSlot failed:', err);
        throw new Error(err?.message || 'Unable to add availability slot');
      }
    },

  async cancelDailyHelpProfessionalSlot(professionalId: string, slotId: string): Promise<any | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/professionals/${encodeURIComponent(professionalId)}/slots/${encodeURIComponent(slotId)}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
        return data;
      } catch (err: any) {
        console.warn('Backend cancelDailyHelpProfessionalSlot failed:', err);
        throw new Error(err?.message || 'Unable to remove availability slot');
      }
    },

  async registerDailyHelpProfessional(payload: { name: string; phone: string; locality: string }): Promise<DailyHelpProfessional | null> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) throw new Error('Your session has expired. Sign in again before creating a Daily Help profile.');
      const res = await fetch(`${API_BASE_URL}/daily-help/professionals/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || `Unable to create Daily Help profile (HTTP ${res.status}).`);
      return data;
    },

  async getDailyHelpProfessionalByPhone(phone: string): Promise<DailyHelpProfessional | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/professionals/by-phone/${encodeURIComponent(phone)}`, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.warn('Backend getDailyHelpProfessionalByPhone failed:', err);
        return null;
      }
    },

  async updateDailyHelpProfessionalAvailability(
      professionalId: string,
      status: 'AVAILABLE' | 'OFFLINE',
      locality?: string
    ): Promise<DailyHelpProfessional | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/professionals/${encodeURIComponent(professionalId)}/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ status, locality }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend updateDailyHelpProfessionalAvailability failed:', err);
        return null;
      }
    },

  async getDailyHelpProfessionalAvailableJobs(professionalId: string): Promise<DailyHelpBooking[]> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/professionals/${encodeURIComponent(professionalId)}/jobs/available`, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return [];
        return await res.json();
      } catch (err) {
        console.warn('Backend getDailyHelpProfessionalAvailableJobs failed:', err);
        return [];
      }
    },

  async acceptDailyHelpJob(professionalId: string, bookingId: string): Promise<DailyHelpBooking | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/professionals/${encodeURIComponent(professionalId)}/jobs/${encodeURIComponent(bookingId)}/accept`, {
          method: 'POST',
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend acceptDailyHelpJob failed:', err);
        return null;
      }
    },

  async getDailyHelpProfessionalJobs(professionalId: string): Promise<DailyHelpBooking[]> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/professionals/${encodeURIComponent(professionalId)}/jobs`, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return [];
        return await res.json();
      } catch (err) {
        console.warn('Backend getDailyHelpProfessionalJobs failed:', err);
        return [];
      }
    },

  async getDailyHelpProfessionalEarnings(professionalId: string): Promise<DailyHelpProfessionalEarnings | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/professionals/${encodeURIComponent(professionalId)}/earnings`, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.warn('Backend getDailyHelpProfessionalEarnings failed:', err);
        return null;
      }
    },

  async updateDailyHelpBookingStatus(bookingId: string, professionalId: string, status: 'ARRIVING' | 'READY_TO_START'): Promise<DailyHelpBooking | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/bookings/${encodeURIComponent(bookingId)}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ professionalId, status }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend updateDailyHelpBookingStatus failed:', err);
        return null;
      }
    },

  async startDailyHelpBooking(bookingId: string, professionalId: string, otp: string): Promise<DailyHelpBooking | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/bookings/${encodeURIComponent(bookingId)}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ professionalId, otp }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend startDailyHelpBooking failed:', err);
        return null;
      }
    },

  async completeDailyHelpBooking(bookingId: string, professionalId: string): Promise<DailyHelpBooking | null> {
      try {
        const token = localStorage.getItem('kurali_auth_token');
        const res = await fetch(`${API_BASE_URL}/daily-help/bookings/${encodeURIComponent(bookingId)}/complete?professionalId=${encodeURIComponent(professionalId)}`, {
          method: 'POST',
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend completeDailyHelpBooking failed:', err);
        return null;
      }
    }
};
