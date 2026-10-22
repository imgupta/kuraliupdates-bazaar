import { useState, type Dispatch, type SetStateAction } from 'react';
import type { DeliveryAgent, Order, Product, Seller, UserRole } from '../types';
import type { UserProfile } from '../entities/userProfile';
import { safeStorageGet, safeStorageSet } from '../shared/storage/safeStorage';
import { useAuthBootstrap } from './useAuthBootstrap';
import { useBackendSync, type BackendStatus } from './useBackendSync';

type BackendConnectionOptions = {
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  role: UserRole;
  setRoleState: Dispatch<SetStateAction<UserRole>>;
  authInitializing: boolean;
  setAuthInitializing: Dispatch<SetStateAction<boolean>>;
  setRegisteredRoles: Dispatch<SetStateAction<UserRole[]>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setSellers: Dispatch<SetStateAction<Seller[]>>;
  setDeliveryAgents: Dispatch<SetStateAction<DeliveryAgent[]>>;
};

/** Owns backend connection settings, synchronization status, and auth bootstrap orchestration. */
export const useBackendConnection = ({
  user,
  setUser,
  role,
  setRoleState,
  authInitializing,
  setAuthInitializing,
  setRegisteredRoles,
  setOrders,
  setProducts,
  setSellers,
  setDeliveryAgents,
}: BackendConnectionOptions) => {
  const [backendUrl, setBackendUrlState] = useState<string>(() => {
    return safeStorageGet('kurali_backend_url') || 'https://kuraliupdates-bazaar.onrender.com/api/v1';
  });

  const setBackendUrl = (url: string) => {
    setBackendUrlState(url);
    safeStorageSet('kurali_backend_url', url);
  };

  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    isOnline: false,
    status: 'INITIALIZING',
    database: 'Oracle Cloud Autonomous Database (ap-mumbai-1)',
    isLoading: true,
  });

  const { syncWithBackend } = useBackendSync({
    user,
    setBackendStatus,
    setOrders,
    setProducts,
    setSellers,
    setDeliveryAgents,
  });

  useAuthBootstrap({
    backendUrl,
    syncWithBackend,
    user,
    setUser,
    role,
    setRoleState,
    authInitializing,
    setAuthInitializing,
    setRegisteredRoles,
  });

  return { backendUrl, setBackendUrl, backendStatus, syncWithBackend };
};
