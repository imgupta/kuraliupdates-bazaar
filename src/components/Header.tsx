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
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { KURALI_LOCALITIES, ROOT_ADMIN_EMAIL, isRootAdminEmail } from '../data/initialData';
import { UserRole } from '../types';
import { SearchSuggestions } from './Buyer/SearchSuggestions';

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
    setIsBuyerRegisterOpen,
    setIsDeliveryRegisterOpen,
    setIsGmailAuthOpen,
    selectedCityLocality,
    setSelectedCityLocality,
    products,
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

  const isRootAdmin = isRootAdminEmail(user.email);

  const baseRoleConfigs: {
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
  ];

  // Admin Desk is strictly enabled ONLY for ROOT_ADMIN_EMAIL
  if (isRootAdmin) {
    baseRoleConfigs.push({
      id: 'admin',
      label: 'Admin Desk',
      shortLabel: 'Admin',
      icon: ShieldCheck,
      color: 'text-purple-600',
      badge: pendingSellersCount > 0 ? pendingSellersCount : undefined,
    });
  }

  const roleConfigs = baseRoleConfigs;

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

          <div className="flex items-center gap-2 sm:gap-3 text-[11px] shrink-0 font-medium">
            <span className="hidden sm:inline-flex items-center gap-1 opacity-90">
              <Truck className="w-3.5 h-3.5" /> 25-Min Express Delivery
            </span>
            <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold">
              {user.role === 'seller' ? (
                <>
                  <Store className="w-3 h-3 text-amber-200" />
                  <span>Merchant: {currentSeller?.name || user.name}</span>
                </>
              ) : user.role === 'delivery' ? (
                <>
                  <Bike className="w-3 h-3 text-emerald-200" />
                  <span>Fleet Partner: {user.name}</span>
                </>
              ) : user.role === 'admin' ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-purple-200" />
                  <span>City Admin: {user.name}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3 h-3 text-amber-200" />
                  <span>Shopper: {user.name}</span>
                </>
              )}
            </span>
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
                <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 block leading-tight truncate">
                  Kurali<span className="text-amber-600">Updates</span>
                </span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                  Bazaar &bull; ਕੁਰਾਲੀ
                </span>
              </div>
            </div>

            {/* Locality Selector Dropdown */}
            <div className="relative hidden md:block shrink-0">
              <button
                onClick={() => setIsLocalityDropdownOpen(!isLocalityDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer border border-slate-200"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="max-w-[140px] truncate">{selectedCityLocality}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {isLocalityDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                    Select Kurali Zone
                  </div>
                  {KURALI_LOCALITIES.map(loc => (
                    <button
                      key={loc}
                      onClick={() => {
                        setSelectedCityLocality(loc);
                        setIsLocalityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center justify-between cursor-pointer ${
                        selectedCityLocality === loc ? 'text-amber-700 font-bold bg-amber-50/60' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{loc}</span>
                      {selectedCityLocality === loc && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar (Desktop) */}
          {role === 'buyer' && (
            <div className="flex-1 max-w-md mx-2 hidden md:block">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products across Kurali shops..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    &times;
                  </button>
                )}
                <SearchSuggestions
                  query={searchQuery}
                  products={products}
                  onSelect={setSearchQuery}
                />
              </div>
            </div>
          )}

          {/* Right Section: Role Tabs (Desktop) + Actions (Mobile & Desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop Role View / Switcher based on User Role */}
            {user.role === 'admin' ? (
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
            ) : user.role === 'seller' ? (
              <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                <Store className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-900">Merchant Portal</span>
                {role === 'seller' ? (
                  <button
                    onClick={() => setRole('buyer')}
                    className="ml-1 px-2 py-0.5 rounded-lg bg-white text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-semibold cursor-pointer"
                  >
                    View Storefront
                  </button>
                ) : (
                  <button
                    onClick={() => setRole('seller')}
                    className="ml-1 px-2 py-0.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-semibold cursor-pointer"
                  >
                    Back to Dashboard
                  </button>
                )}
              </div>
            ) : user.role === 'delivery' ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <Bike className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900">Delivery Fleet</span>
                {availableJobsCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                    {availableJobsCount}
                  </span>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900">Buyer Marketplace</span>
              </div>
            )}

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

            {/* User Profile & Direct Logout Button */}
            {user.isSignedIn ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Profile Avatar Dropdown */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border border-amber-300 object-cover"
                    />
                    <span className="hidden md:inline text-xs font-bold text-slate-800 truncate max-w-[90px]">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
                  </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-black text-slate-900">{user.name}</p>
                    </div>

                    <div className="py-2 px-4 space-y-1.5 text-xs text-slate-700">
                      {isRootAdmin && (
                        <button
                          onClick={() => {
                            setRole('admin');
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full text-left py-1 text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1.5 font-bold cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" /> Open Root Admin Desk
                        </button>
                      )}
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

                {/* Direct Visible Logout Button */}
                <button
                  onClick={logout}
                  title="Log out of your account"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsGmailAuthOpen(true)}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-2.5 sm:px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="hidden sm:inline">Sign In / Register</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
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
              <SearchSuggestions query={searchQuery} products={products} onSelect={setSearchQuery} />
            </div>
          </div>
        )}
      </div>

      {/* MOBILE ROLE NAVIGATION SEGMENTS */}
      <div className="sm:hidden px-3 pb-2 pt-0.5 border-t border-slate-100 bg-white">
        {user.role === 'admin' ? (
          <div className={`grid ${roleConfigs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80`}>
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
        ) : user.role === 'seller' ? (
          <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded-xl border border-blue-200 text-xs">
            <span className="font-bold text-blue-900 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-blue-600" /> Merchant Portal
            </span>
            <button
              onClick={() => setRole(role === 'seller' ? 'buyer' : 'seller')}
              className="px-2 py-1 bg-white text-blue-700 font-bold rounded-lg border border-blue-200 text-[11px] cursor-pointer"
            >
              {role === 'seller' ? 'View Storefront' : 'Back to Dashboard'}
            </button>
          </div>
        ) : user.role === 'delivery' ? (
          <div className="flex items-center justify-between p-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-emerald-600" /> Delivery Fleet Partner
            </span>
            {availableJobsCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded-full text-[10px]">
                {availableJobsCount} Jobs Active
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-1.5 bg-amber-50 rounded-xl border border-amber-200 text-xs">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" /> Buyer Marketplace
            </span>
            <span className="text-[10px] text-amber-700 font-semibold">25-Min Delivery</span>
          </div>
        )}

        {/* Mobile Signed-in Quick Bar with Direct Logout */}
        {user.isSignedIn && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 truncate max-w-[180px]">
              {user.name}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1 font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
