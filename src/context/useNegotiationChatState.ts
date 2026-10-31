import { useEffect, useRef, useState } from 'react';
import type { BargainOffer, ChatMessage, NegotiationChat, Product, Seller, UserRole } from '../types';
import { negotiationChatApi } from '../services/domains/negotiationChatApi';

type NegotiationUser = { name?: string; email?: string; phone?: string };
type NegotiationChatOptions = {
  role: UserRole;
  products: Product[];
  upsertBargainCartItem: (product: Product, bargainId: string, status: 'PENDING_SELLER' | 'PENDING_BUYER' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CLOSED_PURCHASED', offerPrice?: number, negotiatedPrice?: number, acceptedOfferId?: string) => void;
  updateExistingBargainCartItem: (product: Product, bargainId: string, status: 'PENDING_SELLER' | 'PENDING_BUYER' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CLOSED_PURCHASED', offerPrice?: number, negotiatedPrice?: number, acceptedOfferId?: string) => void;
  user: NegotiationUser;
  currentSeller?: Pick<Seller, 'name'>;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
};

export const useNegotiationChatState = ({ role, user, products, upsertBargainCartItem, updateExistingBargainCartItem, showToast }: NegotiationChatOptions) => {
  const [chats, setChats] = useState<NegotiationChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const showToastRef = useRef(showToast);
  const lastSeenStatusRef = useRef(new Map<string, string>());
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);
  const identity = `${role}:${(user.email || '').toLowerCase()}`;

  useEffect(() => {
    let disposed = false;
    let requestInFlight = false;
    setChats([]);
    setActiveChatId(null);
    const refresh = async (notify: boolean) => {
      if (!['buyer', 'seller'].includes(role) || requestInFlight || !localStorage.getItem('kurali_auth_token')) return;
      requestInFlight = true;
      try {
        const activeRole = role === 'seller' ? 'seller' : 'buyer';
        const remote = await negotiationChatApi.list(activeRole);
        const notifications = await negotiationChatApi.listUnreadNotifications(activeRole);
        if (!disposed) {
          notifications.forEach(notification => {
            showToastRef.current(notification.message, 'info');
            void negotiationChatApi.markNotificationRead(notification.id, activeRole).catch(() => undefined);
          });
          // Keep a newly opened local placeholder until the create response
          // replaces it; an older list response must not close the chat modal.
          setChats(previous => {
            const opening = previous.filter(chat => chat.id.startsWith('pending-'));
            const remoteIds = new Set(remote.map(chat => chat.id));
            return [...opening.filter(chat => !remoteIds.has(chat.id)), ...remote];
          });
        }
      } catch (error) {
        if (notify && !disposed) showToastRef.current(error instanceof Error ? error.message : 'Unable to load bargaining conversations.', 'error');
      } finally {
        requestInFlight = false;
      }
    };
    void refresh(true);
    const timer = window.setInterval(() => void refresh(false), 4000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [identity]);

  useEffect(() => {
    if (role !== 'buyer') return;
    chats.forEach(chat => {
      const status = chat.bargainStatus || (chat.currentAgreedPrice != null ? 'ACCEPTED' : 'PENDING_SELLER');
      const previous = lastSeenStatusRef.current.get(chat.id);
      const product = products.find(item => item.id === chat.productId);
      const pendingOffer = [...chat.messages].reverse().find(message => message.offer?.status === 'pending')?.offer;
      // Reconcile only an existing bargain cart line. This handles both seller-accepted
      // offers arriving through polling and the chat ID changing from its local placeholder
      // to the persisted server ID, without resurrecting a line the buyer removed.
      if (product && status !== 'CLOSED_PURCHASED') {
        updateExistingBargainCartItem(product, chat.id, status as 'PENDING_SELLER' | 'PENDING_BUYER' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED',
          pendingOffer?.offeredPrice, status === 'ACCEPTED' ? chat.currentAgreedPrice : undefined,
          status === 'ACCEPTED' ? chat.currentAgreedOfferId : undefined);
      }
      if (previous && previous !== status) {
        if (status === 'ACCEPTED') showToastRef.current('Seller accepted your bargain. Your cart price has been updated.', 'success');
        if (status === 'REJECTED') showToastRef.current('Your bargain was declined. You can still order at the catalogue price.', 'info');
        if (status === 'EXPIRED') showToastRef.current('Your bargain expired. The catalogue price remains available.', 'info');
      }
      lastSeenStatusRef.current.set(chat.id, status);
    });
  }, [chats, products, role, updateExistingBargainCartItem]);
  const openChatForProduct = (product: Product, startingOfferPrice?: number): string => {
    if (role !== 'buyer') {
      showToast('Only a signed-in buyer can start a bargaining conversation.', 'error');
      return '';
    }
    const email = (user.email || '').toLowerCase();
    const existing = chats.find(chat => chat.productId === product.id && chat.sellerId === product.sellerId && chat.buyerEmail.toLowerCase() === email);
    if (existing) {
      setActiveChatId(existing.id);
      return existing.id;
    }
    const tempId = `pending-${Date.now()}`;
    const cataloguePrice = Math.round(product.sellerPrice * (1 - (product.additionalDiscountPercent || 0) / 100));
    const price = startingOfferPrice ?? Math.round(cataloguePrice * 0.9);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempOffer: BargainOffer = {
      id: `pending-offer-${Date.now()}`, productId: product.id, productTitle: product.title,
      productImage: product.image, originalPrice: product.sellerPrice, offeredPrice: price,
      senderRole: 'buyer', quantity: 1, status: 'pending',
    };
    const temporary: NegotiationChat = {
      id: tempId, productId: product.id, productTitle: product.title, productImage: product.image,
      sellerId: product.sellerId, sellerName: product.sellerName, buyerName: user.name || 'Buyer',
      buyerEmail: user.email || '', lastUpdated: now,
      messages: [{ id: `pending-message-${Date.now()}`, chatId: tempId, senderRole: 'buyer',
        senderName: user.name || 'Buyer', text: `Hi, I'm interested in ${product.title}. Can you offer a better price?`,
        timestamp: now, offer: tempOffer }],
    };
    setChats(prev => [temporary, ...prev]);
    upsertBargainCartItem(product, tempId, 'PENDING_SELLER', price);
    setActiveChatId(tempId);
    void negotiationChatApi.open(product, startingOfferPrice).then(remote => {
      setChats(prev => [remote, ...prev.filter(chat => chat.id !== tempId && chat.id !== remote.id)]);
      setActiveChatId(current => current === tempId ? remote.id : current);
    }).catch(error => {
      updateExistingBargainCartItem(product, tempId, 'EXPIRED', price);
      setChats(prev => prev.filter(chat => chat.id !== tempId));
      setActiveChatId(current => current === tempId ? null : current);
      showToast(error instanceof Error ? error.message : 'Could not start the conversation.', 'error');
    });
    return tempId;
  };

  const sendMessage = (chatId: string, text: string, offer?: BargainOffer): void => {
    const chat = chats.find(item => item.id === chatId);
    if (!chat || chatId.startsWith('pending-')) {
      showToast('Conversation is still opening. Please try again in a moment.', 'info');
      return;
    }
    void negotiationChatApi.send(chatId, text, role === 'seller' ? 'seller' : 'buyer', offer).then(remote => {
      setChats(prev => prev.map(item => item.id === remote.id ? remote : item));
    }).catch(error => showToast(error instanceof Error ? error.message : 'Message could not be sent.', 'error'));
  };

  const respondToOffer = (
    chatId: string,
    offerId: string,
    action: 'accept' | 'reject' | 'counter',
    counterPrice?: number,
  ): void => {
    if (chatId.startsWith('pending-')) {
      showToast('Wait until the conversation has been created before responding.', 'info');
      return;
    }
    if (action === 'counter' && (!Number.isFinite(counterPrice) || (counterPrice ?? 0) <= 0)) {
      showToast('Enter a valid counter-offer price.', 'error');
      return;
    }
    void negotiationChatApi.respond(chatId, offerId, role === 'seller' ? 'seller' : 'buyer', action, counterPrice).then(remote => {
      setChats(prev => prev.map(item => item.id === remote.id ? remote : item));
      if (action === 'accept') showToast("Offer accepted. The buyer's cart will reflect the agreed price automatically.", 'success');
      else if (action === 'reject') showToast('Offer declined. The catalogue price remains unchanged.', 'info');
      else showToast('Counter-offer sent. The other participant can now accept or decline it.', 'success');
    }).catch(error => showToast(error instanceof Error ? error.message : 'Could not update the offer.', 'error'));
  };

  return { chats, setChats, activeChatId, setActiveChatId, openChatForProduct, sendMessage, respondToOffer };
};
