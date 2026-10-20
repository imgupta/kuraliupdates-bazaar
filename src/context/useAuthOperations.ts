import type { Dispatch, SetStateAction } from 'react';
import type { UserRole, Seller, DeliveryAgent } from '../types';
import type { UserProfile } from '../entities/userProfile';
import { bazaarApi } from '../services/api';
import { toSavedAddress, type SavedAddress } from '../entities/address';
import {
  clearStoredAuthState,
  persistAuthSession,
  persistAuthToken,
  readAuthToken,
} from '../auth/authSessionStorage';

type AuthOperationsOptions = {
  sellers: Seller[];
  deliveryAgents: DeliveryAgent[];
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  setRoleState: Dispatch<SetStateAction<UserRole>>;
  refreshBuyerAddresses: (token: string, expectedEmail?: string) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
};

export const useAuthOperations = ({
  sellers,
  deliveryAgents,
  user,
  setUser,
  setRoleState,
  refreshBuyerAddresses,
  showToast,
}: AuthOperationsOptions) => {
  // Google sign-in is intentionally disabled until a server-side Google OAuth flow is configured.
  // Do not create a local authenticated session here because authentication must remain server-authoritative.
  const loginWithGoogle = (
    _email: string,
    _name: string,
    _targetRole: UserRole,
    _phone?: string,
    _locality?: string,
    _address?: string
  ) => {
    showToast('Google sign-in is not enabled yet. Please use Email or Mobile OTP.', 'info');
  };

  // OTP-Based Authentication (Email OR Phone Verified)
  const loginWithOtp = (params: {
    identifier?: string;
    email?: string;
    phone?: string;
    name?: string;
    targetRole?: UserRole;
    locality?: string;
    address?: string;
    token?: string;
    serverUser?: any;
  }) => {
    if (!params.token || !params.serverUser) {
      return { success: false, message: 'Authentication was not completed by the server.', role: 'buyer' as UserRole };
    }

    const rawId = (params.identifier || params.email || params.phone || '').trim();
    const isEmail = rawId.includes('@');
    const trimmedEmail = isEmail ? rawId.toLowerCase() : (params.email?.trim().toLowerCase() || '');
    const cleanPhone = !isEmail ? rawId : (params.phone?.trim() || '');

    const existingSeller = sellers.find(
      s => (trimmedEmail && s.email.toLowerCase() === trimmedEmail) ||
           (cleanPhone && s.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''))
    );
    const existingAgent = deliveryAgents.find(
      a => (trimmedEmail && (a.email || '').toLowerCase() === trimmedEmail) ||
           (cleanPhone && a.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''))
    );

    const serverRole = (params.serverUser.role?.toLowerCase() as UserRole) || 'buyer';
    const effectiveRole: UserRole = Number(params.serverUser.isAdmin) === 1 || serverRole === 'admin'
      ? 'admin'
      : serverRole;
    const displayName = params.serverUser.name || params.name || existingSeller?.ownerName || existingAgent?.name || (isEmail ? trimmedEmail.split('@')[0] : 'Kurali User');

    const updatedUser: UserProfile = {
      email: params.serverUser.email || trimmedEmail || undefined,
      name: displayName,
      avatarUrl: params.serverUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: params.serverUser.phone || cleanPhone || undefined,
      locality: params.serverUser.locality || params.locality || existingSeller?.locality || existingAgent?.currentLocality || 'Main Bazaar & Clock Tower',
      address: params.serverUser.address || params.address || existingSeller?.address || '',
      addressLine1: params.serverUser.addressLine1 || undefined,
      landmark: params.serverUser.landmark || undefined,
      formattedAddress: params.serverUser.formattedAddress || undefined,
      placeId: params.serverUser.placeId || undefined,
      latitude: params.serverUser.latitude ?? undefined,
      longitude: params.serverUser.longitude ?? undefined,
      // The verify-OTP response already carries UserResponse.addresses. Use it immediately,
      // and retain same-account client addresses when older data is not in the backend yet.
      savedAddresses: (() => {
        const fromServer = Array.isArray(params.serverUser.addresses)
          ? params.serverUser.addresses.map(toSavedAddress).filter((address: SavedAddress) => Boolean(address.id))
          : [];
        const sameAccount = (user.email || '').toLowerCase() === (params.serverUser.email || trimmedEmail || '').toLowerCase()
          || Boolean(cleanPhone && (user.phone || '').replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''));
        return fromServer.length > 0 ? fromServer : (sameAccount ? user.savedAddresses || [] : []);
      })(),
      sellerId: existingSeller?.id,
      deliveryAgentId: existingAgent?.id,
      role: effectiveRole,
      isSignedIn: true,
      phoneVerified: Boolean(params.serverUser.phone),
      emailVerified: Boolean(params.serverUser.email),
      isAdmin: effectiveRole === 'admin',
      authMethod: 'otp',
    };

    setUser(updatedUser);
    setRoleState(effectiveRole);
    persistAuthSession(updatedUser);
    persistAuthToken(params.token);
    refreshBuyerAddresses(params.token, updatedUser.email);

    return {
      success: true,
      message: effectiveRole === 'admin'
        ? `Administrator verified. Welcome ${displayName}.`
        : `Verified via OTP as ${effectiveRole.toUpperCase()}! Welcome to KuraliUpdates Bazaar.`,
      role: effectiveRole,
    };
  };

  // Register Citizen / Merchant / Rider with OTP Verification
  const registerUserWithOtp = (params: {
    name: string;
    identifier?: string;
    email?: string;
    phone?: string;
    locality: string;
    role: UserRole;
    address?: string;
    addressLine1?: string;
    landmark?: string;
    formattedAddress?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
    token?: string;
    serverUser?: any;
  }) => {
    if (!params.token || !params.serverUser) {
      return { success: false, message: 'Registration was not completed by the server.', role: 'buyer' as UserRole };
    }

    const trimmedEmail = (params.serverUser.email || params.email || '').trim().toLowerCase();
    const cleanPhone = (params.serverUser.phone || params.phone || '').replace(/\D/g, '');
    // A single identity can hold multiple role profiles. For a role-registration
    // flow, activate the role just registered rather than replacing backend identity data.
    const serverRole = ((params.serverUser.role || 'buyer').toLowerCase() as UserRole);
    const effectiveRole: UserRole = serverRole === 'admin' ? 'admin' : params.role;

    let sellerId: string | undefined;
    let deliveryAgentId: string | undefined;

    const updatedUser: UserProfile = {
      email: trimmedEmail || undefined, name: params.serverUser.name || params.name,
      avatarUrl: params.serverUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: cleanPhone || undefined, locality: params.serverUser.locality || params.locality,
      address: params.serverUser.address || params.address || '',
      addressLine1: params.serverUser.addressLine1 || params.addressLine1,
      landmark: params.serverUser.landmark || params.landmark,
      formattedAddress: params.serverUser.formattedAddress || params.formattedAddress,
      placeId: params.serverUser.placeId || params.placeId,
      latitude: params.serverUser.latitude ?? params.latitude,
      longitude: params.serverUser.longitude ?? params.longitude,
      savedAddresses: (() => {
        const fromServer = Array.isArray(params.serverUser.addresses)
          ? params.serverUser.addresses.map(toSavedAddress).filter((address: SavedAddress) => Boolean(address.id))
          : [];
        const sameAccount = (user.email || '').toLowerCase() === trimmedEmail
          || Boolean(cleanPhone && (user.phone || '').replace(/\D/g, '') === cleanPhone);
        return fromServer.length > 0 ? fromServer : (sameAccount ? user.savedAddresses || [] : []);
      })(),
      sellerId, deliveryAgentId,
      role: effectiveRole, isSignedIn: true, phoneVerified: Boolean(cleanPhone),
      emailVerified: Boolean(trimmedEmail), isAdmin: Number(params.serverUser.isAdmin) === 1 || effectiveRole === 'admin',
      authMethod: 'otp',
    };

    setUser(updatedUser);
    setRoleState(effectiveRole);
    persistAuthSession(updatedUser);
    persistAuthToken(params.token);
    refreshBuyerAddresses(params.token, updatedUser.email);

    return { success: true, message: `Registration and OTP verification successful! Welcome ${updatedUser.name}.`, role: effectiveRole };
  };

  const logout = () => {
    const token = readAuthToken();
    if (token) {
      bazaarApi.logout(token);
    }
    clearStoredAuthState();
    setUser({
      email: '',
      name: '',
      avatarUrl: '',
      phone: '',
      locality: 'Main Bazaar & Clock Tower',
      role: 'buyer',
      isSignedIn: false,
      phoneVerified: false,
      emailVerified: false,
    });
    setRoleState('buyer');
    showToast('Signed out. Please sign in or register to continue.', 'info');
  };

  const registerBuyer = (data: { name: string; email: string; phone: string; locality: string; address: string }) => {
    const cleanPhone = data.phone.replace(/\D/g, '');
    const buyer: UserProfile = {
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name.trim())}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: cleanPhone,
      locality: data.locality,
      address: data.address,
      role: 'buyer',
      isSignedIn: true,
      phoneVerified: false,
      emailVerified: false,
      authMethod: 'otp',
      isAdmin: false,
    };
    setUser(buyer);
    setRoleState('buyer');
    persistAuthSession(buyer);
    showToast('Buyer profile created. Please use OTP sign-in for verified authentication.', 'success');
  };
  return { loginWithGoogle, loginWithOtp, registerUserWithOtp, logout, registerBuyer };
};
