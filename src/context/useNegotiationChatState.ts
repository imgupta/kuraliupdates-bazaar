import { useEffect, useState } from 'react';
import type { BargainOffer, ChatMessage, NegotiationChat, Product, Seller, UserRole } from '../types';
import { INITIAL_CHATS } from '../data/initialData';
import { usePersistedValue } from './usePersistedValue';
import { safeStorageJson } from '../shared/storage/safeStorage';

type NegotiationUser = {
  name?: string;
  email?: string;
  phone?: string;
};

type NegotiationChatOptions = {
  role: UserRole;
  user: NegotiationUser;
  currentSeller?: Pick<Seller, 'name'>;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
};

export const useNegotiationChatState = ({ role, user, currentSeller, showToast }: NegotiationChatOptions) => {
  const [chats, setChats] = useState<NegotiationChat[]>(() => safeStorageJson('kurali_chats', INITIAL_CHATS));
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Keep separate tabs in the same browser in sync. This does not replace a
  // server-backed chat API; it prevents a buyer and seller tab from displaying
  // stale localStorage snapshots when they share a browser profile.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'kurali_chats' || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) setChats(parsed as NegotiationChat[]);
      } catch {
        // Ignore malformed storage data and retain the last valid state.
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  usePersistedValue('kurali_chats', chats);

  const openChatForProduct = (product: Product, startingOfferPrice?: number): string => {
    const buyerEmail = user.email || (user.phone ? `${user.phone}@kuraliupdates.com` : 'shopper@kuraliupdates.com');
    const existing = chats.find(c => c.productId === product.id && c.sellerId === product.sellerId && c.buyerEmail.toLowerCase() === buyerEmail.toLowerCase());
    if (existing) {
      setActiveChatId(existing.id);
      return existing.id;
    }
    const newChatId = `chat-${Date.now()}`;
    const initialOfferPrice = startingOfferPrice || Math.round(product.sellerPrice * 0.9);
    const newChat: NegotiationChat = {
      id: newChatId,
      productId: product.id,
      productTitle: product.title,
      productImage: product.image,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      buyerName: user.name || 'Local Kurali Buyer',
      buyerEmail,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [{
        id: `m-${Date.now()}-1`,
        chatId: newChatId,
        senderRole: 'buyer',
        senderName: user.name || 'Local Kurali Buyer',
        text: `Sat Sri Akal! I am interested in purchasing "${product.title}" from your shop in ${product.sellerLocality}. Can you offer a special local price?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        offer: {
          id: `off-${Date.now()}`,
          productId: product.id,
          productTitle: product.title,
          productImage: product.image,
          originalPrice: product.sellerPrice,
          offeredPrice: initialOfferPrice,
          senderRole: 'buyer',
          quantity: 1,
          status: 'pending',
        },
      }],
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    return newChatId;
  };

  const sendMessage = (chatId: string, text: string, offer?: BargainOffer) => {
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      chatId,
      senderRole: role === 'seller' ? 'seller' : 'buyer',
      senderName: role === 'seller' ? (currentSeller?.name || 'Seller') : (user.name || 'Buyer'),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      offer,
    };
    setChats(prev => prev.map(c => c.id !== chatId ? c : {
      ...c,
      messages: [...c.messages, newMsg],
      lastUpdated: newMsg.timestamp,
    }));
  };

  const respondToOffer = (
    chatId: string,
    offerId: string,
    action: 'accept' | 'reject' | 'counter',
    counterPrice?: number
  ) => {
    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c;
      let agreedPrice = c.currentAgreedPrice;
      const updatedMessages = c.messages.map(m => {
        if (!m.offer || m.offer.id !== offerId) return m;
        const updatedOfferStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered';
        if (action === 'accept') agreedPrice = m.offer.offeredPrice;
        return { ...m, offer: { ...m.offer, status: updatedOfferStatus as any } };
      });
      const responseMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        chatId,
        senderRole: role === 'seller' ? 'seller' : 'buyer',
        senderName: role === 'seller' ? (currentSeller?.name || 'Seller') : (user.name || 'Buyer'),
        text: action === 'accept'
          ? `Deal agreed! The price of ₹${agreedPrice} is confirmed. You can now add this directly to your cart at the negotiated rate.`
          : action === 'reject'
          ? 'Offer declined. Standard store price applies.'
          : `Counter offer sent: ₹${counterPrice}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        offer: action === 'counter' && counterPrice ? {
          id: `off-${Date.now()}`,
          productId: c.productId,
          productTitle: c.productTitle,
          productImage: c.productImage,
          originalPrice: c.messages[0]?.offer?.originalPrice || 0,
          offeredPrice: counterPrice,
          senderRole: role === 'seller' ? 'seller' : 'buyer',
          quantity: 1,
          status: 'pending',
        } : undefined,
      };
      return { ...c, currentAgreedPrice: agreedPrice, messages: [...updatedMessages, responseMsg], lastUpdated: responseMsg.timestamp };
    }));
    if (action === 'accept') showToast('Price deal accepted! Special price locked in.', 'success');
  };

  return { chats, setChats, activeChatId, setActiveChatId, openChatForProduct, sendMessage, respondToOffer };
};
