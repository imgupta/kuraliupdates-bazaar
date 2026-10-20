import { useState } from 'react';
import type { Product, UserRole } from '../types';

type Toast = { message: string; type: 'success' | 'info' | 'error' } | null;

/** UI-only state for the shared portal shell; no business data or auth session is stored here. */
export const usePortalUiState = () => {
  const [registeredRoles, setRegisteredRoles] = useState<UserRole[]>(['buyer']);
  const [selectedCityLocality, setSelectedCityLocality] = useState('All Localities (Kurali City)');
  const [comparingProduct, setComparingProduct] = useState<Product | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellerRegisterOpen, setIsSellerRegisterOpen] = useState(false);
  const [isBuyerRegisterOpen, setIsBuyerRegisterOpen] = useState(false);
  const [isDeliveryRegisterOpen, setIsDeliveryRegisterOpen] = useState(false);
  const [isGmailAuthOpen, setIsGmailAuthOpen] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  return {
    registeredRoles, setRegisteredRoles,
    selectedCityLocality, setSelectedCityLocality,
    comparingProduct, setComparingProduct,
    trackingOrderId, setTrackingOrderId,
    isCartOpen, setIsCartOpen,
    isSellerRegisterOpen, setIsSellerRegisterOpen,
    isBuyerRegisterOpen, setIsBuyerRegisterOpen,
    isDeliveryRegisterOpen, setIsDeliveryRegisterOpen,
    isGmailAuthOpen, setIsGmailAuthOpen,
    toast, showToast,
  };
};
