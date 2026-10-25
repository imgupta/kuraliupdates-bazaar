import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Seller, Product, DeliveryAgent, Order } from '../types';
import { bazaarApi } from '../services/api';
import { adminApi } from '../services/domains/adminApi';
import { deliveryApi } from '../services/domains/deliveryApi';

export type BackendStatus = {
  isOnline: boolean;
  status: string;
  database: string;
  lastSynced?: string;
  isLoading: boolean;
  error?: string;
};

type SessionUser = { isSignedIn: boolean; role: string };

type BackendSyncOptions = {
  user: SessionUser;
  setBackendStatus: Dispatch<SetStateAction<BackendStatus>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setSellers: Dispatch<SetStateAction<Seller[]>>;
  setDeliveryAgents: Dispatch<SetStateAction<DeliveryAgent[]>>;
};

export const useBackendSync = ({
  user,
  setBackendStatus,
  setOrders,
  setProducts,
  setSellers,
  setDeliveryAgents,
}: BackendSyncOptions) => {
  const syncDeliveryJobs = useCallback(async () => {
    const remoteJobs = await deliveryApi.getDeliveryAvailableJobs();
    if (!remoteJobs.length) return;
    setOrders(prev => {
      const remoteIds = new Set(remoteJobs.map(order => order.id));
      const localRemaining = prev.filter(order => !remoteIds.has(order.id) || order.status !== 'ready_for_pickup');
      return [...remoteJobs, ...localRemaining];
    });
  }, [setOrders]);

  const syncWithBackend = useCallback(async () => {
    setBackendStatus(prev => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const health = await bazaarApi.checkHealth();
      const isOnline = health.status === 'UP';
      setBackendStatus({
        isOnline,
        status: health.status || (isOnline ? 'UP' : 'STANDALONE'),
        database: health.database || 'Oracle Autonomous Database Connected',
        lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isLoading: false,
      });

      await syncDeliveryJobs();

      if (user.isSignedIn && user.role === 'buyer') {
        const remoteBuyerOrders = await bazaarApi.getMyOrders();
        // The authenticated buyer endpoint is authoritative, including an empty result.
        // Do not merge locally cached orders from another session into this buyer's list.
        if (remoteBuyerOrders !== null) {
          setOrders(remoteBuyerOrders);
        }
      }

      const remoteProducts = await bazaarApi.searchProducts();
      // Replace cached catalogue only after a successful response; preserve cache on API failure.
      if (remoteProducts !== null) {
        setProducts(remoteProducts);
      }

      const [remotePendingSellers, remotePendingAgents] = await Promise.all([
        adminApi.getPendingSellers(),
        adminApi.getPendingDeliveryAgents(),
      ]);
      if (remotePendingSellers?.length) {
        setSellers(prev => {
          const mapped = remotePendingSellers.map((seller: any) => ({
            id: seller.sellerId,
            name: seller.storeName,
            ownerName: seller.ownerName,
            email: seller.email,
            phone: seller.phone,
            avatarUrl: seller.avatarUrl || '',
            bannerUrl: seller.bannerUrl || '',
            category: seller.category || 'General',
            address: seller.address,
            locality: seller.locality,
            distanceKm: Number(seller.distanceKm || 1),
            rating: Number(seller.rating || 0),
            reviewCount: Number(seller.reviewCount || 0),
            status: String(seller.status || 'PENDING').toLowerCase(),
            registeredAt: seller.registeredAt,
            approvedAt: seller.approvedAt,
            description: seller.description || '',
            minOrderForFreeDelivery: Number(seller.minOrderForFreeDelivery || 499),
            baseDeliveryFee: Number(seller.baseDeliveryFee || 35),
            billDiscounts: [],
          })) as Seller[];
          const remoteIds = new Set(mapped.map(seller => seller.id));
          return [...mapped, ...prev.filter(seller => !remoteIds.has(seller.id))];
        });
      }
      if (remotePendingAgents?.length) {
        setDeliveryAgents(prev => {
          const mapped = remotePendingAgents.map((agent: any) => ({
            id: agent.agentId,
            name: agent.fullName,
            email: agent.email,
            phone: agent.phone,
            avatarUrl: agent.avatarUrl || '',
            vehicleType: agent.vehicleType,
            vehicleNumber: agent.vehicleNumber,
            licenseNumber: agent.licenseNumber,
            status: String(agent.status || 'PENDING').toLowerCase(),
            rating: Number(agent.rating || 0),
            totalTrips: Number(agent.totalTrips || 0),
            todayEarnings: Number(agent.todayEarnings || 0),
            totalEarnings: Number(agent.totalEarnings || 0),
            currentLocality: agent.currentLocality,
            registeredAt: agent.registeredAt,
          })) as DeliveryAgent[];
          const remoteIds = new Set(mapped.map(agent => agent.id));
          return [...mapped, ...prev.filter(agent => !remoteIds.has(agent.id))];
        });
      }

      const availableJobs = await deliveryApi.getDeliveryAvailableJobs();
      setOrders(prev => {
        const remoteIds = new Set(availableJobs.map(order => order.id));
        const localWithoutRemoteReadyJobs = prev.filter(
          order => !(order.status === 'ready_for_pickup' && remoteIds.has(order.id))
        );
        return [...availableJobs, ...localWithoutRemoteReadyJobs];
      });
    } catch (err: unknown) {
      console.warn('Backend sync failed:', err);
      setBackendStatus(prev => ({
        ...prev,
        isOnline: false,
        status: 'STANDALONE',
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [setBackendStatus, setOrders, setProducts, setSellers, setDeliveryAgents, syncDeliveryJobs, user.isSignedIn, user.role]);

  return { syncWithBackend };
};
