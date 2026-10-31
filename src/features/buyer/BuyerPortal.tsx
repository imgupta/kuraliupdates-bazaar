import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BuyerHome } from '../../components/Buyer/BuyerHome';
import { CartDrawer } from '../../components/Buyer/CartDrawer';
import { CheckoutModal } from '../../components/Buyer/CheckoutModal';
import { OrderTrackingModal } from '../../components/Buyer/OrderTrackingModal';
import { NegotiationChatModal } from '../../components/Buyer/NegotiationChatModal';

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
  const { setTrackingOrderId, addToCart, trackingOrderId } = useApp();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <>
      <BuyerHome
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onOpenTracking={(orderId) => setTrackingOrderId(orderId)}
        onBuyNow={(product) => {
          addToCart(product, 1);
          setIsCheckoutOpen(true);
        }}
        isCheckoutOpen={isCheckoutOpen}
      />
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />
      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
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
