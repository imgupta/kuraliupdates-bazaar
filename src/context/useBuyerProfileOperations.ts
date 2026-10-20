import type { Dispatch, SetStateAction } from 'react';
import { buyerApi } from '../services/domains/buyerApi';
import { toSavedAddress, type SavedAddress } from '../entities/address';
import { mapServerUser, type UserProfile } from '../entities/userProfile';
import { readAuthToken, persistAuthSession } from '../auth/authSessionStorage';

type BuyerProfileOperationsOptions = {
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
};

export const useBuyerProfileOperations = ({ user, setUser, showToast }: BuyerProfileOperationsOptions) => {
  const updateUserProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    const token = readAuthToken();
    if (!token || !user.isSignedIn) {
      showToast('Your session has expired. Please sign in again.', 'error');
      return false;
    }
    const result = await buyerApi.updateCurrentUser(token, updates);
    if (!result.success || !result.user) {
      showToast(result.message || 'Unable to save your changes.', 'error');
      return false;
    }
    setUser(prev => {
      const next = {
        ...prev,
        ...updates,
        ...mapServerUser(result.user, prev),
        savedAddresses: prev.savedAddresses,
      };
      persistAuthSession(next);
      return next;
    });
    return true;
  };

  const createBuyerAddress = async (address: SavedAddress): Promise<SavedAddress | null> => {
    const token = readAuthToken();
    if (!token) return null;
    const saved = await buyerApi.createBuyerAddress(token, address);
    if (!saved) return null;
    const next = toSavedAddress(saved);
    setUser(prev => {
      const addresses = [...(prev.savedAddresses || []).filter(a => a.id !== next.id), next]
        .map(a => ({ ...a, isDefault: next.isDefault ? a.id === next.id : a.isDefault }));
      const updated = { ...prev, savedAddresses: addresses };
      persistAuthSession(updated);
      return updated;
    });
    return next;
  };

  const updateBuyerAddress = async (address: SavedAddress): Promise<SavedAddress | null> => {
    const token = readAuthToken();
    if (!token) return null;
    const saved = await buyerApi.updateBuyerAddress(token, address.id, address);
    if (!saved) return null;
    const next = toSavedAddress(saved);
    setUser(prev => {
      const addresses = (prev.savedAddresses || []).map(a => a.id === next.id ? next : a);
      const updated = { ...prev, savedAddresses: addresses };
      persistAuthSession(updated);
      return updated;
    });
    return next;
  };

  const setDefaultBuyerAddress = async (addressId: string): Promise<SavedAddress | null> => {
    const token = readAuthToken();
    if (!token) return null;
    const saved = await buyerApi.setDefaultBuyerAddress(token, addressId);
    if (!saved) return null;
    const next = toSavedAddress(saved);
    setUser(prev => {
      const updated = { ...prev, savedAddresses: (prev.savedAddresses || []).map(a => ({ ...a, isDefault: a.id === addressId })) };
      persistAuthSession(updated);
      return updated;
    });
    return next;
  };

  // Keep legacy client-side addresses visible when the server's address collection is empty.
  // The authenticated user response includes addresses too, so the follow-up request is a refresh,
  // not the only source of address state.
  const refreshBuyerAddresses = (token: string, expectedEmail?: string) => {
    void buyerApi.getBuyerAddresses(token).then(remoteAddresses => {
      if (!remoteAddresses || readAuthToken() !== token) return;
      const mappedAddresses = remoteAddresses.map(toSavedAddress).filter(address => Boolean(address.id));
      setUser(prev => {
        if (expectedEmail && (prev.email || '').toLowerCase() !== expectedEmail.toLowerCase()) return prev;
        // A successful but empty response must not erase previously saved addresses. This is
        // important for addresses created by older versions before server-side address sync.
        const addresses = mappedAddresses.length > 0 ? mappedAddresses : (prev.savedAddresses || []);
        const next = { ...prev, savedAddresses: addresses };
        persistAuthSession(next);
        return next;
      });
    });
  };


  return {
    updateUserProfile,
    createBuyerAddress,
    updateBuyerAddress,
    setDefaultBuyerAddress,
    refreshBuyerAddresses,
  };
};
