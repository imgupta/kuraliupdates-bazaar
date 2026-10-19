import { useEffect, useRef, useState } from 'react';
import type { BargainOffer, ChatMessage, NegotiationChat, Product, Seller, UserRole } from '../types';
import { negotiationChatApi } from '../services/domains/negotiationChatApi';

type NegotiationUser = { name?: string; email?: string; phone?: string };
type NegotiationChatOptions = {
  role: UserRole;
  user: NegotiationUser;
  currentSeller?: Pick<Seller, 'name'>;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
};

export const useNegotiationChatState = ({ role, user, showToast }: NegotiationChatOptions) => {
  const [chats, setChats] = useState<NegotiationChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const requestInFlight = useRef(false);
  const identity = `${role}:${(user.email || '').toLowerCase()}`;

  useEffect(() => {
    let disposed = false;
    const refresh = async (notify: boolean) => {
      if (requestInFlight.current || !localStorage.getItem('kurali_auth_token')) return;
      requestInFlight.current = true;
      try {
        const remote = await negotiationChatApi.list(role === 'seller' ? 'seller' : 'buyer');
        if (!disposed) setChats(remote);
      } catch (error) {
        if (notify && !disposed) showToast(error instanceof Error ? error.message : 'Unable to load bargaining conversations.', 'error');
      } finally {
        requestInFlight.current = false;
      }
    };
    void refresh(true);
    const timer = window.setInterval(() => void refresh(false), 4000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [identity, showToast]);

  const openChatForProduct = (product: Product, startingOfferPrice?: number): string => {
    const email = (user.email || '').toLowerCase();
    const existing = chats.find(chat => chat.productId === product.id && chat.sellerId === product.sellerId && chat.buyerEmail.toLowerCase() === email);
    if (existing) {
      setActiveChatId(existing.id);
      return existing.id;
    }
    const tempId = `pending-${Date.now()}`;
    const price = startingOfferPrice ?? Math.round(product.sellerPrice * 0.9);
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
    setActiveChatId(tempId);
    void negotiationChatApi.open(product, startingOfferPrice).then(remote => {
      setChats(prev => [remote, ...prev.filter(chat => chat.id !== tempId && chat.id !== remote.id)]);
      setActiveChatId(current => current === tempId ? remote.id : current);
    }).catch(error => {
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
      if (action === 'accept') showToast('Offer accepted. The agreed price is available for this buyer’s cart item.', 'success');
      else if (action === 'reject') showToast('Offer declined. The catalogue price remains unchanged.', 'info');
    }).catch(error => showToast(error instanceof Error ? error.message : 'Could not update the offer.', 'error'));
  };

  return { chats, setChats, activeChatId, setActiveChatId, openChatForProduct, sendMessage, respondToOffer };
};
