import type { BargainOffer, NegotiationChat, Product, ChatMessage } from '../../types';
import { API_BASE_URL } from '../http/apiConfig';

const token = () => localStorage.getItem('kurali_auth_token');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = token();
  if (!auth) throw new Error('Please sign in to use bargaining chat.');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth}`,
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || body?.error || `Chat request failed (${response.status})`);
  return body as T;
}

const normalizeChat = (raw: any): NegotiationChat => ({
  id: String(raw.id),
  productId: String(raw.productId),
  productTitle: raw.productTitle || 'Product',
  productImage: raw.productImage || '',
  sellerId: String(raw.sellerId),
  sellerName: raw.sellerName || 'Seller',
  buyerName: raw.buyerName || 'Buyer',
  buyerEmail: raw.buyerEmail || '',
  messages: (raw.messages || []).map((message: any): ChatMessage => ({
    id: String(message.id),
    chatId: String(message.chatId || raw.id),
    senderRole: String(message.senderRole).toLowerCase() === 'seller' ? 'seller' : 'buyer',
    senderName: message.senderName || 'User',
    text: message.text || '',
    timestamp: message.timestamp || '',
    ...(message.offer ? { offer: {
      id: String(message.offer.id || message.id),
      productId: String(message.offer.productId || raw.productId),
      productTitle: message.offer.productTitle || raw.productTitle || 'Product',
      productImage: message.offer.productImage || raw.productImage || '',
      originalPrice: Number(message.offer.originalPrice ?? raw.originalPrice ?? 0),
      offeredPrice: Number(message.offer.offeredPrice),
      senderRole: String(message.offer.senderRole).toLowerCase() === 'seller' ? 'seller' : 'buyer',
      quantity: Number(message.offer.quantity || 1),
      status: String(message.offer.status || 'pending').toLowerCase() as BargainOffer['status'],
    } } : {}),
  })),
  lastUpdated: raw.lastUpdated || '',
  ...(raw.originalPrice != null ? { originalPrice: Number(raw.originalPrice) } : {}),
  ...(raw.currentAgreedPrice != null ? { currentAgreedPrice: Number(raw.currentAgreedPrice) } : {}),
  ...(raw.currentAgreedOfferId ? { currentAgreedOfferId: String(raw.currentAgreedOfferId) } : {}),
});

export const negotiationChatApi = {
  async list(role: 'buyer' | 'seller'): Promise<NegotiationChat[]> {
    const rows = await request<any[]>(`/negotiations?role=${encodeURIComponent(role.toUpperCase())}`);
    return rows.map(normalizeChat);
  },
  async open(product: Product, startingOfferPrice?: number): Promise<NegotiationChat> {
    const raw = await request<any>('/negotiations', {
      method: 'POST',
      body: JSON.stringify({
        productId: product.id,
        startingOfferPrice: startingOfferPrice ?? Math.round(product.sellerPrice * (1 - (product.additionalDiscountPercent || 0) / 100) * 0.9),
        openingMessage: `Hi, I'm interested in ${product.title}. Can you offer a better price?`,
      }),
    });
    return normalizeChat(raw);
  },
  async send(chatId: string, text: string, role: 'buyer' | 'seller', offer?: BargainOffer): Promise<NegotiationChat> {
    const raw = await request<any>(`/negotiations/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      headers: { 'X-Active-Role': role.toUpperCase() },
      body: JSON.stringify({ text, ...(offer ? { offerPrice: offer.offeredPrice } : {}) }),
    });
    return normalizeChat(raw);
  },
  async respond(chatId: string, offerId: string, role: 'buyer' | 'seller', action: 'accept' | 'reject' | 'counter', counterPrice?: number): Promise<NegotiationChat> {
    const raw = await request<any>(`/negotiations/${encodeURIComponent(chatId)}/offers/${encodeURIComponent(offerId)}/respond`, {
      method: 'POST',
      headers: { 'X-Active-Role': role.toUpperCase() },
      body: JSON.stringify({ action, ...(counterPrice != null ? { counterPrice } : {}) }),
    });
    return normalizeChat(raw);
  },
};
