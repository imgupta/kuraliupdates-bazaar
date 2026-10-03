import React, { useState } from 'react';
import {
  ShoppingBag,
  Store,
  Bike,
  ShieldCheck,
  Search,
  MapPin,
  MessageSquare,
  Sparkles,
  ChevronDown,
  LogOut,
  PlusCircle,
  Truck,
  Percent,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { KURALI_LOCALITIES } from '../data/initialData';
import { UserRole } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  const {
    role,
    setRole,
    user,
    logout,
    cart,
    setIsCartOpen,
    sellers,
    currentSeller,
    orders,
    chats,
    setActiveChatId,
    setIsSellerRegisterOpen,
    setIsDeliveryRegisterOpen,
    setIsGmailAuthOpen,
    selectedCityLocality,
    setSelectedCityLocality,
  } = useApp();

  const [isLocalityDropdownOpen, setIsLocalityDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Pending seller count for admin badge
  const pendingSellersCount = sellers.filter(s => s.status === 'pending').length;

  // Available pickup jobs for delivery badge
  const availableJobsCount = orders.filter(o => o.status === 'ready_for_pickup').length;

  // Active chats count
  const activeChatsCount = chats.length;

  const roleConfigs: {
    id: UserRole;
    label: string;
    shortLabel: string;
    icon: any;
    color: string;
    badge?: number;
  }[] = [
    { id: 'buyer', label: 'Buyer', shortLabel: 'Buyer', icon: ShoppingBag, color: 'text-amber-600' },
    {
      id: 'seller',
      label: 'Seller Portal',
      shortLabel: 'Seller',
      icon: Store,
      color: 'text-blue-600',
      badge: currentSeller?.status === 'pending' ? 1 : undefined,
    },
    {
      id: 'delivery',
      label: 'Delivery Agent',
      shortLabel: 'Rider',
      icon: Bike,
      color: 'text-emerald-600',
      badge: availableJobsCount > 0 ? availableJobsCount : undefined,
    },
    {
      id: 'admin',
      label: 'Admin Desk',
      shortLabel: 'Admin',
      icon: ShieldCheck,
      color: 'text-purple-600',
      badge: pendingSellersCount > 0 ? pendingSellersCount : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs w-full max-w-full overflow-hidden">
      {/* Top Banner: City & Domain Identity */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0 truncate font-medium">
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide shrink-0">
              Kurali
            </span>
            <span className="truncate">
              kuraliupdates.com &bull; Local Bazaar &amp; Express Delivery
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] shrink-0">
            <span className="hidden md:inline-flex items-center gap-1 opacity-90">
              <Truck className="w-3.5 h-3.5" /> 25-Min Delivery
            </span>
            <button
              onClick={() => setIsSellerRegisterOpen(true)}
              className="font-bold underline hover:text-amber-100 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3 h-3" />
              <span className="hidden xs:inline">Register</span> Shop
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo & Locality */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              onClick={() => setRole('buyer')}
              className="cursor-pointer flex items-center gap-2 group shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-base sm:text-xl tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors whitespace-nowrap">
                    Kurali<span className="text-amber-600">Updates</span>
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                    BAZAAR
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium hidden md:block truncate">
                  Local Stores &bull; Low Price &bull; Direct Deals
                </p>
              </div>
            </div>

            {/* Kurali Locality Selector (Desktop/Tablet) */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setIsLocalityDropdownOpen(!isLocalityDropdownOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="max-w-[120px] truncate">{selectedCityLocality}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {isLocalityDropdownOpen && (
                <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Select Kurali Area
                  </div>
                  {KURALI_LOCALITIES.map(loc => (
                    <button
                      key={loc}
                      onClick={() => {
                        setSelectedCityLocality(loc);
                        setIsLocalityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 hover:text-amber-900 flex items-center justify-between ${
                        selectedCityLocality === loc ? 'font-bold text-amber-700 bg-amber-50/60' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{loc}</span>
                      {selectedCityLocality === loc && <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0"></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Search Bar (Hidden on Mobile) */}
          {role === 'buyer' && (
            <div className="flex-1 max-w-sm mx-2 hidden md:block">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Basmati, Desi Ghee, Earbuds in Kurali..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-amber-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Right Section: Role Tabs (Desktop) + Actions (Mobile & Desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop Role Switcher (Hidden on phone screens to prevent overflow!) */}
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl items-center gap-1 border border-slate-200/80">
              {roleConfigs.map(item => {
                const Icon = item.icon;
                const isActive = role === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setRole(item.id)}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden">{item.shortLabel}</span>
                    {item.badge !== undefined && (
                      <span className="ml-0.5 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bargain Negotiation Chat Trigger */}
            <button
              onClick={() => {
                if (chats.length > 0) {
                  setActiveChatId(chats[0].id);
                }
              }}
              title="Negotiation & Bargaining Chats"
              className="relative p-2 rounded-xl text-slate-700 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              {activeChatsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeChatsCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-2.5 sm:px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              <span className="bg-white/20 text-white px-1.5 py-0.2 rounded-md text-[10px] sm:text-[11px] font-bold">
                {cartItemCount}
              </span>
            </button>

            {/* User Profile / Google Sign-In */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-1 p-1 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
              >
                {user.isSignedIn ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-amber-300 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                    G
                  </div>
                )}
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <Sparkles className="w-2.5 h-2.5" /> Gmail Verified
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 capitalize">
                        Mode: {role}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsGmailAuthOpen(true);
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Store className="w-4 h-4 text-blue-500" /> Switch Gmail / Seller Account
                    </button>

                    <button
                      onClick={() => {
                        setIsSellerRegisterOpen(true);
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-amber-500" /> Register New Store in Kurali
                    </button>

                    <button
                      onClick={() => {
                        setIsDeliveryRegisterOpen(true);
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Bike className="w-4 h-4 text-emerald-500" /> Join as Delivery Agent
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar (Directly below navbar on phones) */}
        {role === 'buyer' && (
          <div className="mt-2 md:hidden">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products in Kurali..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 rounded-xl border border-slate-200 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE ROLE NAVIGATION SEGMENTS (Dedicated thumb-friendly bar on phones) */}
      <div className="sm:hidden px-3 pb-2.5 pt-0.5 border-t border-slate-100 bg-white">
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          {roleConfigs.map(item => {
            const Icon = item.icon;
            const isActive = role === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setRole(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="truncate max-w-full mt-0.5 leading-tight">{item.shortLabel}</span>
                {item.badge !== undefined && (
                  <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
