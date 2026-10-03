import React, { useState } from 'react';
import { X, Send, Tag, CheckCircle2, XCircle, ArrowRight, MessageSquare, AlertCircle, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NegotiationChatModal: React.FC = () => {
  const {
    activeChatId,
    setActiveChatId,
    chats,
    sendMessage,
    respondToOffer,
    products,
    addToCart,
    setIsCartOpen,
    role,
    user,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [customOfferPrice, setCustomOfferPrice] = useState('');

  if (!activeChatId) return null;

  const currentChat = chats.find(c => c.id === activeChatId);
  if (!currentChat) return null;

  const targetProduct = products.find(p => p.id === currentChat.productId);
  const basePrice = targetProduct ? targetProduct.sellerPrice : 500;

  const handleSendTextMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendMessage(activeChatId, inputMessage.trim());
    setInputMessage('');
  };

  const handleSendOffer = (offeredPrice: number) => {
    if (!targetProduct) return;
    const offer = {
      id: `off-${Date.now()}`,
      productId: targetProduct.id,
      productTitle: targetProduct.title,
      productImage: targetProduct.image,
      originalPrice: targetProduct.sellerPrice,
      offeredPrice,
      senderRole: (role === 'seller' ? 'seller' : 'buyer') as 'buyer' | 'seller',
      quantity: 1,
      status: 'pending' as const,
    };
    sendMessage(
      activeChatId,
      `I would like to propose a negotiated price of ₹${offeredPrice} for ${targetProduct.title}.`,
      offer
    );
    setCustomOfferPrice('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full h-[85vh] max-h-[700px] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                  Price Bargaining &amp; Chat
                </h3>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  LIVE DEALS
                </span>
              </div>
              <p className="text-xs text-amber-100 flex items-center gap-1">
                With: <strong className="text-white">{currentChat.sellerName}</strong> &bull; Buyer: {currentChat.buyerName}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveChatId(null)}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Being Negotiated Banner */}
        <div className="px-5 py-2.5 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentChat.productImage}
              alt={currentChat.productTitle}
              className="w-11 h-11 rounded-lg object-cover border border-amber-200 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentChat.productTitle}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Store List Price: <strong>₹{basePrice}</strong></span>
                {currentChat.currentAgreedPrice && (
                  <span className="text-emerald-700 font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                    Agreed: ₹{currentChat.currentAgreedPrice}
                  </span>
                )}
              </div>
            </div>
          </div>

          {currentChat.currentAgreedPrice && targetProduct && (
            <button
              onClick={() => {
                addToCart(targetProduct, 1, currentChat.currentAgreedPrice);
                setIsCartOpen(true);
                setActiveChatId(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Add at ₹{currentChat.currentAgreedPrice}
            </button>
          )}
        </div>

        {/* Chat Message Scrollable Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/60">
          <div className="text-center my-1">
            <span className="text-[11px] font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
              Direct Negotiation for Kurali Local Shoppers
            </span>
          </div>

          {currentChat.messages.map((msg) => {
            const isMe =
              (role === 'seller' && msg.senderRole === 'seller') ||
              (role !== 'seller' && msg.senderRole === 'buyer');

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <span className="text-[10px] font-semibold text-slate-400 px-1">
                  {msg.senderName} &bull; {msg.timestamp}
                </span>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-amber-600 text-white rounded-br-xs shadow-xs'
                      : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200 shadow-xs'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Bargain Offer Card if attached */}
                  {msg.offer && (
                    <div
                      className={`mt-2.5 p-3 rounded-xl border text-xs ${
                        isMe
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-amber-50 border-amber-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          Price Offer
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                            msg.offer.status === 'accepted'
                              ? 'bg-emerald-500 text-white'
                              : msg.offer.status === 'rejected'
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {msg.offer.status}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between my-1">
                        <span className="opacity-80">Offered Rate:</span>
                        <span className="text-base font-black">
                          ₹{msg.offer.offeredPrice}
                        </span>
                      </div>

                      <div className="text-[11px] opacity-75">
                        Savings from original: ₹{msg.offer.originalPrice - msg.offer.offeredPrice} (
                        {Math.round(
                          ((msg.offer.originalPrice - msg.offer.offeredPrice) /
                            msg.offer.originalPrice) *
                            100
                        )}
                        % Off)
                      </div>

                      {/* Action buttons on pending offer */}
                      {msg.offer.status === 'pending' && !isMe && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/40 flex items-center gap-2">
                          <button
                            onClick={() =>
                              respondToOffer(currentChat.id, msg.offer!.id, 'accept')
                            }
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Accept Offer
                          </button>
                          <button
                            onClick={() =>
                              respondToOffer(currentChat.id, msg.offer!.id, 'reject')
                            }
                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 py-1 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" /> Decline
                          </button>
                        </div>
                      )}

                      {/* If accepted and is buyer, show Add to Cart */}
                      {msg.offer.status === 'accepted' && targetProduct && (
                        <div className="mt-2 pt-2 border-t border-emerald-300/40">
                          <button
                            onClick={() => {
                              addToCart(targetProduct, 1, msg.offer!.offeredPrice);
                              setIsCartOpen(true);
                              setActiveChatId(null);
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Add to Cart at ₹{msg.offer.offeredPrice}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Bargain Presets Bar */}
        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="text-[11px] font-bold text-slate-500">Quick Offers:</span>
            <button
              onClick={() => handleSendOffer(Math.round(basePrice * 0.95))}
              className="bg-white hover:bg-amber-50 hover:text-amber-700 border border-slate-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
            >
              5% Off (₹{Math.round(basePrice * 0.95)})
            </button>
            <button
              onClick={() => handleSendOffer(Math.round(basePrice * 0.9))}
              className="bg-white hover:bg-amber-50 hover:text-amber-700 border border-slate-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
            >
              10% Off (₹{Math.round(basePrice * 0.9)})
            </button>
            <button
              onClick={() => handleSendOffer(Math.round(basePrice * 0.85))}
              className="bg-white hover:bg-amber-50 hover:text-amber-700 border border-slate-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
            >
              15% Off (₹{Math.round(basePrice * 0.85)})
            </button>
          </div>

          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="₹ Custom"
              value={customOfferPrice}
              onChange={e => setCustomOfferPrice(e.target.value)}
              className="w-20 px-2 py-1 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-amber-500"
            />
            <button
              onClick={() => {
                const val = parseInt(customOfferPrice, 10);
                if (val > 0) handleSendOffer(val);
              }}
              disabled={!customOfferPrice}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white px-2 py-1 rounded-md text-xs font-bold cursor-pointer"
            >
              Propose
            </button>
          </div>
        </div>

        {/* Message Input Footer */}
        <form
          onSubmit={handleSendTextMessage}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={
              role === 'seller'
                ? "Reply to buyer or send counter offer..."
                : "Type message to seller (e.g. Can I get 2 pieces for ₹X?)..."
            }
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            className="flex-1 px-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 text-white p-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
