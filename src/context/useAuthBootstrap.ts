import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { UserRole } from '../types';
import { bazaarApi } from '../services/api';
import { toSavedAddress, type SavedAddress } from '../entities/address';
import { mapServerUser, type UserProfile } from '../entities/userProfile';
import {
  hasStoredAuthSession,
  persistAuthSession,
  persistAuthToken,
  readAuthToken,
  removeAuthSession,
  removeAuthToken,
} from '../auth/authSessionStorage';

type AuthBootstrapOptions = {
  backendUrl: string;
  syncWithBackend: () => Promise<void>;
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  role: UserRole;
  setRoleState: Dispatch<SetStateAction<UserRole>>;
  authInitializing: boolean;
  setAuthInitializing: Dispatch<SetStateAction<boolean>>;
  setRegisteredRoles: Dispatch<SetStateAction<UserRole[]>>;
};

export const useAuthBootstrap = ({
  backendUrl,
  syncWithBackend,
  user,
  setUser,
  role,
  setRoleState,
  authInitializing,
  setAuthInitializing,
  setRegisteredRoles,
}: AuthBootstrapOptions): void => {
  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 45000);

    // Live session token check against Oracle DB / Spring Boot backend
    const savedToken = readAuthToken();
    if (savedToken) {
      bazaarApi.getMe(savedToken).then(res => {
        if (res.authenticated && res.user) {
          const u = res.user;
          const effectiveRole: UserRole = (u.role?.toLowerCase() as UserRole) || 'buyer';
          const hadStoredSession = hasStoredAuthSession();
          setUser(prev => ({
            ...prev,
            email: u.email,
            name: u.name,
            phone: u.phone,
            locality: u.locality || prev.locality,
            address: u.address || prev.address,
            savedAddresses: (() => {
              const fromServer = Array.isArray(res.addresses)
                ? res.addresses.map(toSavedAddress).filter((address: SavedAddress) => Boolean(address.id))
                : [];
              // Do not let an empty server list erase locally retained addresses during session restore.
              return fromServer.length > 0 ? fromServer : (prev.savedAddresses || []);
            })(),
            addressLine1: u.addressLine1 || prev.addressLine1,
            landmark: u.landmark || prev.landmark,
            formattedAddress: u.formattedAddress || prev.formattedAddress,
            placeId: u.placeId || prev.placeId,
            latitude: u.latitude ?? prev.latitude,
            longitude: u.longitude ?? prev.longitude,
            // Keep the user's selected portal when refreshing a valid session.
            // The backend's primary role is only a fallback for a missing local session.
            role: prev.isSignedIn ? prev.role : effectiveRole,
            isSignedIn: true,
            phoneVerified: true,
            emailVerified: Boolean(u.email),
            isAdmin: Number(u.isAdmin) === 1 || effectiveRole === 'admin',
          }));
          if (!hadStoredSession) setRoleState(effectiveRole);
        }
      });
    }

    return () => clearInterval(interval);
  }, [backendUrl]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('sso_code') || new URLSearchParams(url.hash.slice(1)).get('sso_code');
    if (!code) {
      setAuthInitializing(false);
      return;
    }

    // Remove the one-time code from browser history before exchanging it.
    url.searchParams.delete('sso_code');
    url.hash = '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);

    let cancelled = false;
    bazaarApi.redeemPortalHandoff(code).then(result => {
      if (cancelled) return;
      if (!result?.success || !result.token || !result.user || !result.role) {
        removeAuthToken();
        removeAuthSession();
        setAuthInitializing(false);
        return;
      }

      const roles = (result.roles || []).map((r: string) => r.toLowerCase() as UserRole)
        .filter((r: UserRole) => ['buyer', 'seller', 'delivery', 'professional', 'admin'].includes(r));
      const targetRole = result.role.toLowerCase() as UserRole;
      if (!roles.includes(targetRole)) {
        removeAuthToken();
        removeAuthSession();
        setAuthInitializing(false);
        return;
      }

      const previous = user;
      const profile: UserProfile = {
        ...previous,
        ...mapServerUser(result.user, previous),
        email: result.user.email || previous.email,
        name: result.user.name || previous.name,
        phone: result.user.phone || previous.phone,
        role: targetRole,
        isSignedIn: true,
        isAdmin: roles.includes('admin'),
        registeredRoles: roles,
      };
      persistAuthToken(result.token);
      persistAuthSession(profile);
      setUser(profile);
      setRoleState(targetRole);
      setRegisteredRoles(Array.from(new Set(['buyer', ...roles])));
      setAuthInitializing(false);
    }).catch(() => {
      if (!cancelled) setAuthInitializing(false);
    });

    return () => { cancelled = true; };
  // This bootstrap must run once per portal load, before role discovery.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authInitializing) return;
    const token = readAuthToken();
    if (!user.isSignedIn || !token) {
      setRegisteredRoles(['buyer']);
      return;
    }
    bazaarApi.getRegisteredRoles(token).then(roles => {
      const normalized = roles
        .map(r => r.toLowerCase() as UserRole)
        .filter(r => ['buyer', 'seller', 'delivery', 'professional', 'admin'].includes(r));
      setRegisteredRoles(Array.from(new Set(['buyer', ...normalized])));
    });
  }, [authInitializing, user.isSignedIn, user.email, user.phone, role]);

 };
