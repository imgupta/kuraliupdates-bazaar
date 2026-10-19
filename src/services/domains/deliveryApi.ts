/**
 * Delivery API boundary.
 *
 * Delivery workflows use this facade while each domain operation is moved out
 * of the monolithic API client incrementally.
 */
import { bazaarApi } from '../api';
import { trackingApi } from './trackingApi';

export const deliveryApi: Pick<typeof bazaarApi, 'getCurrentDeliveryAgent' | 'getDeliveryAvailableJobs' | 'updateDeliveryLocation' | 'resendDeliveryOtp'> = {
  ...bazaarApi,
  updateDeliveryLocation: trackingApi.updateDeliveryLocation,
};
