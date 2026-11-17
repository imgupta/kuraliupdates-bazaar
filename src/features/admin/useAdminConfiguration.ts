import { useEffect, useState } from 'react';
import { adminApi } from '../../services/domains/adminApi';

type Toast = (message: string, type: 'success' | 'error' | 'info') => void;

/**
 * Owns the editable delivery and seller-registration configuration state,
 * loading lifecycle and persistence actions used by the corresponding tabs.
 */
export const useAdminConfiguration = (
  activeAdminTab: string,
  isRootAdmin: boolean,
  showToast: Toast,
) => {
  const [deliveryConfig, setDeliveryConfig] = useState<any | null>(null);
  const [deliveryConfigLoading, setDeliveryConfigLoading] = useState(false);
  const [deliveryConfigSaving, setDeliveryConfigSaving] = useState(false);
  const [deliveryConfigError, setDeliveryConfigError] = useState<string | null>(null);
  const [sellerAreaConfig, setSellerAreaConfig] = useState<any | null>(null);
  const [sellerAreaLoading, setSellerAreaLoading] = useState(false);
  const [sellerAreaSaving, setSellerAreaSaving] = useState(false);
  const [sellerAreaError, setSellerAreaError] = useState<string | null>(null);

  const refreshSellerAreaConfiguration = async () => {
    setSellerAreaLoading(true);
    setSellerAreaError(null);
    try {
      const config = await adminApi.getSellerServiceArea();
      setSellerAreaConfig({
        centerLatitude: String(config.centerLatitude),
        centerLongitude: String(config.centerLongitude),
        radiusKm: String(config.radiusKm),
        enabled: Boolean(config.enabled),
        version: config.version,
        updatedAt: config.updatedAt,
      });
    } catch (error: any) {
      setSellerAreaError(error?.message || 'Unable to load seller registration area.');
    } finally {
      setSellerAreaLoading(false);
    }
  };

  const saveSellerAreaConfiguration = async () => {
    if (!sellerAreaConfig || sellerAreaSaving) return;
    const centerLatitude = Number(sellerAreaConfig.centerLatitude);
    const centerLongitude = Number(sellerAreaConfig.centerLongitude);
    const radiusKm = Number(sellerAreaConfig.radiusKm);
    if (!Number.isFinite(centerLatitude) || !Number.isFinite(centerLongitude)
        || !Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
      setSellerAreaError('Enter valid coordinates and a radius greater than 0 and no more than 100 km.');
      return;
    }
    setSellerAreaSaving(true);
    setSellerAreaError(null);
    try {
      const saved = await adminApi.updateSellerServiceArea({
        centerLatitude, centerLongitude, radiusKm, enabled: Boolean(sellerAreaConfig.enabled),
      });
      setSellerAreaConfig((current: any) => ({ ...current, ...saved,
        centerLatitude: String(saved.centerLatitude), centerLongitude: String(saved.centerLongitude),
        radiusKm: String(saved.radiusKm), enabled: Boolean(saved.enabled),
      }));
      showToast('Seller registration area settings saved.', 'success');
      await refreshSellerAreaConfiguration();
    } catch (error: any) {
      setSellerAreaError(error?.message || 'Unable to save seller registration area.');
      showToast(error?.message || 'Unable to save seller registration area.', 'error');
    } finally {
      setSellerAreaSaving(false);
    }
  };

  const refreshDeliveryConfiguration = async () => {
    setDeliveryConfigLoading(true);
    setDeliveryConfigError(null);
    try {
      const config = await adminApi.getDeliveryConfiguration();
      setDeliveryConfig({
        nearbyRadiusKm: Number(config.nearbyRadiusKm ?? 3),
        maxSellersPerBatch: Number(config.maxSellersPerBatch ?? 3),
        maxRouteKm: Number(config.maxRouteKm ?? 10),
        customerBaseFee: Number(config.customerBaseFee ?? 25),
        customerPerKmFee: Number(config.customerPerKmFee ?? 5),
        riderBasePayout: Number(config.riderBasePayout ?? 45),
        riderPerKmPayout: Number(config.riderPerKmPayout ?? 22),
        maxWaitMinutes: Number(config.maxWaitMinutes ?? 15),
        otpResendTimeoutSeconds: Number(config.otpResendTimeoutSeconds ?? 20),
        batchEnabled: config.batchEnabled === true || Number(config.batchEnabled) === 1,
        flexibleFallback: config.flexibleFallback === true || Number(config.flexibleFallback) === 1,
        storePickupEnabled: config.storePickupEnabled === true || Number(config.storePickupEnabled) === 1,
        updatedAt: config.updatedAt,
      });
    } catch (error: any) {
      setDeliveryConfigError(error?.message || 'Unable to load delivery configuration.');
    } finally {
      setDeliveryConfigLoading(false);
    }
  };

  const saveDeliveryConfiguration = async () => {
    if (!deliveryConfig || deliveryConfigSaving) return;
    setDeliveryConfigSaving(true);
    setDeliveryConfigError(null);
    try {
      const payload = {
        nearbyRadiusKm: Number(deliveryConfig.nearbyRadiusKm),
        maxSellersPerBatch: Number(deliveryConfig.maxSellersPerBatch),
        maxRouteKm: Number(deliveryConfig.maxRouteKm),
        customerBaseFee: Number(deliveryConfig.customerBaseFee),
        customerPerKmFee: Number(deliveryConfig.customerPerKmFee),
        riderBasePayout: Number(deliveryConfig.riderBasePayout),
        riderPerKmPayout: Number(deliveryConfig.riderPerKmPayout),
        maxWaitMinutes: Number(deliveryConfig.maxWaitMinutes),
        otpResendTimeoutSeconds: Number(deliveryConfig.otpResendTimeoutSeconds),
        batchEnabled: Boolean(deliveryConfig.batchEnabled),
        flexibleFallback: Boolean(deliveryConfig.flexibleFallback),
        storePickupEnabled: Boolean(deliveryConfig.storePickupEnabled),
      };
      const saved = await adminApi.updateDeliveryConfiguration(payload);
      setDeliveryConfig((current: any) => ({ ...current, ...saved }));
      showToast('Delivery charges and payout settings saved.', 'success');
      await refreshDeliveryConfiguration();
    } catch (error: any) {
      setDeliveryConfigError(error?.message || 'Unable to save delivery configuration.');
      showToast(error?.message || 'Unable to save delivery configuration.', 'error');
    } finally {
      setDeliveryConfigSaving(false);
    }
  };

  useEffect(() => {
    if (isRootAdmin && activeAdminTab === 'seller-area-config') void refreshSellerAreaConfiguration();
  }, [activeAdminTab, isRootAdmin]);

  useEffect(() => {
    if (isRootAdmin && activeAdminTab === 'delivery-config') void refreshDeliveryConfiguration();
  }, [activeAdminTab, isRootAdmin]);

  return {
    deliveryConfig,
    setDeliveryConfig,
    deliveryConfigLoading,
    deliveryConfigSaving,
    deliveryConfigError,
    saveDeliveryConfiguration,
    refreshDeliveryConfiguration,
    sellerAreaConfig,
    setSellerAreaConfig,
    sellerAreaLoading,
    sellerAreaSaving,
    sellerAreaError,
    saveSellerAreaConfiguration,
    refreshSellerAreaConfiguration,
  };
};
