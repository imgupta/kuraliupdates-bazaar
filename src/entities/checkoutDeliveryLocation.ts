import type { SavedAddress } from './address';

export type CheckoutDeliveryLocation = {
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryPlaceId?: string;
};

/** Use coordinates belonging to the address selected for this checkout, never stale profile coordinates. */
export const getCheckoutDeliveryLocation = (
  address: SavedAddress | undefined,
  fulfilmentMode: 'DELIVERY' | 'STORE_PICKUP',
): CheckoutDeliveryLocation | null => {
  if (fulfilmentMode === 'STORE_PICKUP') return null;
  if (!address) throw new Error('Select a saved delivery address before placing your order.');
  const latitude = Number(address.latitude);
  const longitude = Number(address.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    || (latitude === 0 && longitude === 0)) {
    throw new Error('This saved address is missing a verified map location. Edit the address, set its map pin, and save it before choosing delivery. You can use store pickup instead.');
  }
  return {
    deliveryLatitude: latitude,
    deliveryLongitude: longitude,
    ...(address.placeId ? { deliveryPlaceId: address.placeId } : {}),
  };
};
