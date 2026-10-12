/**
 * Canonical frontend shape for a saved buyer address and the existing backend
 * response mapper. Keep the mapping semantics stable during modularisation.
 */
export interface SavedAddress {
  id: string;
  label: string;
  addressLine1: string;
  landmark?: string;
  formattedAddress?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

/**
 * Maps the backend address response to the frontend shape.
 * Deliberately preserves the legacy fallback and isDefault conversion rules.
 */
export const toSavedAddress = (a: any): SavedAddress => ({
  id: a.addressId || a.id,
  label: a.label || 'Home',
  addressLine1: a.addressLine1 || '',
  landmark: a.landmark || undefined,
  formattedAddress: a.formattedAddress || undefined,
  placeId: a.placeId || undefined,
  latitude: a.latitude ?? undefined,
  longitude: a.longitude ?? undefined,
  isDefault: Number(a.isDefault) === 1 || a.isDefault === true,
});
