import type { UserRole } from '../types';
import type { SavedAddress } from './address';

export interface UserProfile {
  email?: string;
  name: string;
  avatarUrl: string;
  phone?: string;
  locality: string;
  address?: string;
  addressLine1?: string;
  landmark?: string;
  formattedAddress?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  sellerId?: string;
  deliveryAgentId?: string;
  role: UserRole;
  isSignedIn: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  authMethod?: 'otp' | 'google';
  isAdmin?: boolean;
  savedAddresses?: SavedAddress[];
  registeredRoles?: UserRole[];
}

/**
 * Merge a partial backend user response into the existing frontend profile.
 * Nullish values retain the prior field; empty strings and zero coordinates
 * remain valid backend values. Keep this behavior stable during extraction.
 */
export const mapServerUser = (serverUser: any, previous: UserProfile): UserProfile => ({
  ...previous,
  email: serverUser.email ?? previous.email,
  name: serverUser.name ?? previous.name,
  phone: serverUser.phone ?? previous.phone,
  locality: serverUser.locality ?? previous.locality,
  address: serverUser.address ?? previous.address,
  addressLine1: serverUser.addressLine1 ?? previous.addressLine1,
  landmark: serverUser.landmark ?? previous.landmark,
  formattedAddress: serverUser.formattedAddress ?? previous.formattedAddress,
  placeId: serverUser.placeId ?? previous.placeId,
  latitude: serverUser.latitude ?? previous.latitude,
  longitude: serverUser.longitude ?? previous.longitude,
});
