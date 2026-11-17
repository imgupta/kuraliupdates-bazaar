import { Dispatch, SetStateAction, useEffect } from 'react';
import { adminApi } from '../../services/domains/adminApi';

interface UseAdminDashboardRefreshOptions {
  isRootAdmin: boolean;
  setAdminDataLoading: Dispatch<SetStateAction<boolean>>;
  setAdminSellers: Dispatch<SetStateAction<any[]>>;
  setPendingSellerApplications: Dispatch<SetStateAction<any[]>>;
  setAdminDeliveryAgents: Dispatch<SetStateAction<any[]>>;
  setAdminAnalytics: Dispatch<SetStateAction<any | null>>;
  setBuyers: Dispatch<SetStateAction<any[]>>;
  setAdminOrders: Dispatch<SetStateAction<any[]>>;
  setAdminSearchTrends: Dispatch<SetStateAction<any[]>>;
  setDailyHelpServices: Dispatch<SetStateAction<any[]>>;
  setDailyHelpHelpers: Dispatch<SetStateAction<any[]>>;
  setAdminAccounts: Dispatch<SetStateAction<any[]>>;
  setBuyersLoading: Dispatch<SetStateAction<boolean>>;
}

/**
 * Owns the root-admin dashboard refresh lifecycle. Keeping the polling and
 * aggregate loading state outside the view prevents tab rendering from also
 * owning the dashboard's data orchestration.
 */
export const useAdminDashboardRefresh = ({
  isRootAdmin,
  setAdminDataLoading,
  setAdminSellers,
  setPendingSellerApplications,
  setAdminDeliveryAgents,
  setAdminAnalytics,
  setBuyers,
  setAdminOrders,
  setAdminSearchTrends,
  setDailyHelpServices,
  setDailyHelpHelpers,
  setAdminAccounts,
  setBuyersLoading,
}: UseAdminDashboardRefreshOptions) => {
  const refreshAdminData = async () => {
    if (!isRootAdmin) return;
    setAdminDataLoading(true);
    try {
      const [
        remoteSellers,
        remotePendingSellers,
        remoteAgents,
        analytics,
        remoteBuyers,
        searchTrends,
        remoteDailyHelpServices,
        remoteDailyHelpHelpers,
        remoteAccounts,
      ] = await Promise.all([
        adminApi.getAdminSellers(),
        adminApi.getPendingSellers(),
        adminApi.getAdminDeliveryAgents(),
        adminApi.getAdminAnalytics(),
        adminApi.getAdminBuyers(),
        adminApi.getAdminSearchTrends(),
        adminApi.getAdminDailyHelpServices(),
        adminApi.getAdminDailyHelpHelpers(),
        adminApi.getAdminAccounts(),
      ]);
      setAdminSellers(remoteSellers);
      setPendingSellerApplications(remotePendingSellers);
      setAdminDeliveryAgents(remoteAgents);
      setAdminAnalytics(analytics);
      setBuyers(remoteBuyers);
      setAdminOrders(await adminApi.getAdminOrders());
      setAdminSearchTrends(searchTrends);
      setDailyHelpServices(remoteDailyHelpServices);
      setDailyHelpHelpers(remoteDailyHelpHelpers);
      setAdminAccounts(remoteAccounts);
    } finally {
      setAdminDataLoading(false);
      setBuyersLoading(false);
    }
  };

  useEffect(() => {
    if (!isRootAdmin) return;
    void refreshAdminData();
    const interval = setInterval(() => void refreshAdminData(), 45000);
    return () => clearInterval(interval);
  }, [isRootAdmin]);

  return refreshAdminData;
};
