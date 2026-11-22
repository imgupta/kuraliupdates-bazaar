import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BuyerHome } from '../../components/Buyer/BuyerHome';
import { CartDrawer } from '../../components/Buyer/CartDrawer';
import { CheckoutModal } from '../../components/Buyer/CheckoutModal';
import { OrderTrackingModal } from '../../components/Buyer/OrderTrackingModal';
import { NegotiationChatModal } from '../../components/Buyer/NegotiationChatModal';
import type { CartItem, Product } from '../../types';

export type BuyerPortalProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
};

/**
 * First independently testable role slice.
 * Buyer-only state and transactional UI stay inside this boundary; the shell
 * supplies shared search/category state and the existing authenticated context.
 * This is a modular-microfrontend seam, not a separately deployed runtime yet.
 */
export const BuyerPortal: React.FC<BuyerPortalProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
}) => {
  const { setTrackingOrderId, trackingOrderId } = useApp();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [buyNowItems, setBuyNowItems] = useState<CartItem[] | null>(null);
  const openBuyNow = (product: Product) => {
    setBuyNowItems([{ product, quantity: 1 }]);
    setIsCheckoutOpen(true);
  };
  const openBasketCheckout = () => {
    setBuyNowItems(null);
    setIsCheckoutOpen(true);
  };

  return (
    <>
      <BuyerHome
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onOpenTracking={(orderId) => setTrackingOrderId(orderId)}
        onBuyNow={openBuyNow}
        isCheckoutOpen={isCheckoutOpen}
      />
      <CartDrawer onProceedToCheckout={openBasketCheckout} />
      {isCheckoutOpen && (
        <CheckoutModal items={buyNowItems ?? undefined} onClose={() => { setIsCheckoutOpen(false); setBuyNowItems(null); }} />
      )}
      {trackingOrderId && (
        <OrderTrackingModal
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
        />
      )}
      <NegotiationChatModal />
    </>
  );
};
