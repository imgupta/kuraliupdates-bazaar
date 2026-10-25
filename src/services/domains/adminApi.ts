import { API_BASE_URL, adminAuthHeaders } from '../http/apiConfig';

/** Domain-owned API operations; endpoint and fallback behavior retained from the legacy client. */
export const adminApi = {
  async getAdminDiagnostics(): Promise<any> {
      const res = await fetch(`${API_BASE_URL}/admin/diagnostics`, {
        headers: adminAuthHeaders(),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      return data;
    },

  async updateAdminDailyHelpProfessionalAvailability(professionalId: string, status: 'AVAILABLE' | 'OFFLINE', locality?: string): Promise<any> {
      const res = await fetch(`${API_BASE_URL}/admin/daily-help/helpers/${encodeURIComponent(professionalId)}/availability`, {
        method: 'POST',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, locality }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || `Unable to update Daily Help availability (HTTP ${res.status}).`);
      return data;
    },

  async updateAdminDailyHelpProfessionalVerification(professionalId: string, verified: boolean): Promise<any> {
      const res = await fetch(`${API_BASE_URL}/admin/daily-help/helpers/${encodeURIComponent(professionalId)}/verification?verified=${verified}`, {
        method: 'POST',
        headers: adminAuthHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || `Unable to update Daily Help verification (HTTP ${res.status}).`);
      return data;
    },

  async getAdminDailyHelpHelpers(): Promise<any[]> {
      const headers = adminAuthHeaders();
      try {
        const res = await fetch(`${API_BASE_URL}/admin/daily-help/helpers`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend getAdminDailyHelpHelpers failed:', err);
        return [];
      }
    },

  async getAdminDailyHelpServices(): Promise<any[]> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/daily-help/services`, { headers: adminAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) { console.warn('Backend getAdminDailyHelpServices failed:', err); return []; }
    },

  async createAdminDailyHelpService(payload: Record<string, any>): Promise<any> {
      const res = await fetch(`${API_BASE_URL}/admin/daily-help/services`, {
        method: 'POST',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || `Unable to save Daily Help service (HTTP ${res.status})`);
      return data;
    },

  async updateAdminDailyHelpService(serviceId: string, payload: Record<string, any>): Promise<any> {
      const res = await fetch(`${API_BASE_URL}/admin/daily-help/services/${encodeURIComponent(serviceId)}`, {
        method: 'PUT',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || `Unable to update Daily Help service (HTTP ${res.status})`);
      return data;
    },

  async getAdminSellers(): Promise<any[]> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/sellers`, { headers: adminAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend getAdminSellers failed:', err);
        return [];
      }
    },

  async getAdminDeliveryAgents(): Promise<any[]> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/delivery`, { headers: adminAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn('Backend getAdminDeliveryAgents failed:', err);
        return [];
      }
    },

  async getAdminSearchTrends(): Promise<any[]> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/analytics/search-trends`, { headers: adminAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend getAdminSearchTrends failed:', err);
        return [];
      }
    },

  async getAdminAnalytics(): Promise<any | null> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/analytics/demand-trends`, { headers: adminAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend getAdminAnalytics failed:', err);
        return null;
      }
    },

  async getPendingSellers(): Promise<any[]> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/sellers/pending`, {
          headers: adminAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend getPendingSellers failed:', err);
        return [];
      }
    },

  async getAdminBuyers(): Promise<any[]> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/buyers`, {
          headers: adminAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend getAdminBuyers failed:', err);
        return [];
      }
    },

  async getPendingDeliveryAgents(): Promise<any[]> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/delivery/pending`, { headers: adminAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend getPendingDeliveryAgents failed:', err);
        return [];
      }
    },

  async approveDeliveryAgent(agentId: string): Promise<boolean> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/delivery/${encodeURIComponent(agentId)}/approve`, { method: 'POST', headers: adminAuthHeaders() });
        return res.ok;
      } catch (err) {
        console.warn('Backend approveDeliveryAgent failed:', err);
        return false;
      }
    },

  async rejectDeliveryAgent(agentId: string): Promise<boolean> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/delivery/${encodeURIComponent(agentId)}/reject`, { method: 'POST', headers: adminAuthHeaders() });
        return res.ok;
      } catch (err) {
        console.warn('Backend rejectDeliveryAgent failed:', err);
        return false;
      }
    },

  async approveSeller(sellerId: string): Promise<boolean> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/sellers/${encodeURIComponent(sellerId)}/approve`, {
          method: 'POST',
          headers: adminAuthHeaders(),
        });
        return res.ok;
      } catch (err) {
        console.warn('Backend approveSeller failed:', err);
        return false;
      }
    },

  async rejectSeller(sellerId: string): Promise<boolean> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/sellers/${encodeURIComponent(sellerId)}/reject`, {
          method: 'POST',
          headers: adminAuthHeaders(),
        });
        return res.ok;
      } catch (err) {
        console.warn('Backend rejectSeller failed:', err);
        return false;
      }
    },
  async getDemandAnalytics(): Promise<any> {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/analytics/demand-trends`, {
          headers: adminAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend getDemandAnalytics failed:', err);
        return null;
      }
    },
  
    /**
     * Place an order into Oracle DB
     */
  async getAdminAccounts(search = ''): Promise<any[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    const res = await fetch(`${API_BASE_URL}/admin/accounts?${params.toString()}`, {
      headers: adminAuthHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `Unable to load account directory (HTTP ${res.status})`);
    return Array.isArray(data) ? data : [];
  },

  async updateAdminAccountStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED', reason: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/accounts/${encodeURIComponent(userId)}/status`, {
      method: 'POST',
      headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || data?.error || `Unable to update account status (HTTP ${res.status})`);
    return data;
  },

  async revokeAdminAccountSessions(userId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/accounts/${encodeURIComponent(userId)}/revoke-sessions`, {
      method: 'POST',
      headers: adminAuthHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || data?.error || `Unable to revoke sessions (HTTP ${res.status})`);
    return data;
  },

  async getAdminAccountAudit(userId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/accounts/${encodeURIComponent(userId)}/audit`, {
      headers: adminAuthHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || data?.error || `Unable to load account audit (HTTP ${res.status})`);
    return Array.isArray(data) ? data : [];
  },
};
