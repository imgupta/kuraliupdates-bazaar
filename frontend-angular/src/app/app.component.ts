import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketplaceService } from './services/marketplace.service';
import { Product, Seller, Order, UserRole } from './models/marketplace.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen max-w-full overflow-x-hidden bg-slate-50 flex flex-col text-slate-900 font-sans">
      <!-- Top Announcement Strip -->
      <div class="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-hidden">
          <div class="flex items-center gap-1.5 min-w-0 truncate font-medium">
            <span class="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide shrink-0">
              Kurali
            </span>
            <span class="truncate">kuraliupdates.com &bull; Local Bazaar &bull; Angular + Java Spring + Oracle DB</span>
          </div>
          <div class="text-[11px] shrink-0 font-bold underline cursor-pointer" (click)="setRole('seller')">
            Register Kurali Shop
          </div>
        </div>
      </div>

      <!-- Main Navbar -->
      <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div class="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <!-- Logo -->
          <div class="flex items-center gap-2 cursor-pointer" (click)="setRole('buyer')">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md font-black text-lg">
              K
            </div>
            <div>
              <div class="flex items-center gap-1">
                <span class="font-extrabold text-base sm:text-xl tracking-tight text-slate-900">
                  Kurali<span class="text-amber-600">Updates</span>
                </span>
                <span class="bg-amber-100 text-amber-800 text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  ANGULAR
                </span>
              </div>
              <p class="text-[10px] text-slate-500 font-medium hidden md:block">Java MS API &bull; Oracle 23c/21c DB</p>
            </div>
          </div>

          <!-- Desktop Role Navigation Switcher -->
          <div class="hidden sm:flex bg-slate-100 p-1 rounded-xl items-center gap-1 border border-slate-200/80">
            <button
              *ngFor="let tab of roleTabs"
              (click)="setRole(tab.id)"
              [class]="service.currentRole() === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              (click)="setRole('buyer')"
              class="relative flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs cursor-pointer"
            >
              <span>Cart</span>
              <span class="bg-white/20 px-1.5 py-0.2 rounded text-[10px]">1</span>
            </button>
          </div>
        </div>

        <!-- Mobile Role Navigation Segments (Under Navbar) -->
        <div class="sm:hidden px-3 pb-2 pt-0.5 border-t border-slate-100 bg-white">
          <div class="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              *ngFor="let tab of roleTabs"
              (click)="setRole(tab.id)"
              [class]="service.currentRole() === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'"
              class="py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer truncate"
            >
              {{ tab.shortLabel }}
            </button>
          </div>
        </div>
      </header>

      <!-- Main Body per Active Role -->
      <main class="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <!-- BUYER VIEW -->
        <div *ngIf="service.currentRole() === 'buyer'" class="space-y-6">
          <div class="rounded-3xl p-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xl space-y-2">
            <span class="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">Kurali Local Bazaar</span>
            <h1 class="text-2xl sm:text-3xl font-black">Compare Best Sellers in Kurali</h1>
            <p class="text-xs text-amber-100">Live prices from Morinda Road, Main Bazaar, Railway Road and Siswan Bypass.</p>
          </div>

          <!-- Product Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div *ngFor="let p of sampleProducts" class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <img [src]="p.imageUrl" [alt]="p.title" class="w-full h-44 rounded-xl object-cover" />
              <div>
                <span class="text-[11px] text-slate-500 font-medium">{{ p.category }} &bull; {{ p.sellerLocality }} ({{ p.sellerDistanceKm }} km)</span>
                <h3 class="font-bold text-sm text-slate-900 mt-0.5">{{ p.title }}</h3>
                <div class="flex items-baseline gap-2 mt-2">
                  <span class="text-lg font-black text-slate-900">₹{{ p.sellerPrice }}</span>
                  <span class="text-xs text-slate-400 line-through">MRP ₹{{ p.mrp }}</span>
                  <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">+{{ p.additionalDiscountPercent }}% Extra Off</span>
                </div>
              </div>
              <button class="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold cursor-pointer">
                Add to Cart &bull; Free Delivery > ₹499
              </button>
            </div>
          </div>
        </div>

        <!-- SELLER VIEW -->
        <div *ngIf="service.currentRole() === 'seller'" class="space-y-4">
          <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h2 class="text-lg font-black text-slate-900">Seller Inventory &amp; Pricing Architecture (Java + Oracle DB)</h2>
            <p class="text-xs text-slate-500">Configure printed MRP, base seller price, and additional discount %. Backed by Oracle DB schema.</p>
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold">
              Status: Verified &bull; Table: SELLERS &bull; Connected to Oracle Database 19c/21c/23c via ojdbc11
            </div>
          </div>
        </div>

        <!-- DELIVERY AGENT VIEW -->
        <div *ngIf="service.currentRole() === 'delivery'" class="space-y-4">
          <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h2 class="text-lg font-black text-slate-900">Kurali Express Delivery Jobs (Price-Based Acceptance)</h2>
            <p class="text-xs text-slate-500">Riders claim pickup jobs based on distance &amp; payout fees, then complete using customer OTP.</p>
            <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span class="text-[10px] font-bold text-emerald-800 uppercase">Available Job</span>
                <p class="font-bold text-sm text-slate-900">Aggarwal Kirana &rarr; Dashmesh Nagar (1.4 km)</p>
              </div>
              <button class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black">
                Accept Job for ₹65
              </button>
            </div>
          </div>
        </div>

        <!-- ADMIN VIEW -->
        <div *ngIf="service.currentRole() === 'admin'" class="space-y-4">
          <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h2 class="text-lg font-black text-slate-900">Admin Approval Desk &amp; Demand Radar</h2>
            <p class="text-xs text-slate-500">Review pending seller applications before store catalogs go live in Kurali city.</p>
            <div class="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between">
              <div>
                <span class="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Action Required</span>
                <h4 class="font-bold text-sm text-slate-900 mt-1">Dhillon Organic Farm &amp; Health Store</h4>
                <p class="text-xs text-slate-500">Owner: Manpreet Singh Dhillon &bull; Siswan Road Bypass</p>
              </div>
              <button class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black">
                Approve &amp; Go Live
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class AppComponent {
  service = inject(MarketplaceService);

  roleTabs: { id: UserRole; label: string; shortLabel: string }[] = [
    { id: 'buyer', label: 'Buyer', shortLabel: 'Buyer' },
    { id: 'seller', label: 'Seller Portal', shortLabel: 'Seller' },
    { id: 'delivery', label: 'Delivery Fleet', shortLabel: 'Rider' },
    { id: 'admin', label: 'Admin Desk', shortLabel: 'Admin' }
  ];

  sampleProducts: Product[] = [
    {
      productId: 'prod-1',
      sellerId: 'seller-1',
      sellerName: 'Aggarwal Super Kirana',
      sellerLocality: 'Main Bazaar',
      sellerDistanceKm: 0.6,
      title: 'Fortune Royal Basmati Rice (5 kg)',
      category: 'Groceries & Daily Essentials',
      description: 'Long grain aged basmati rice.',
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      mrp: 520,
      sellerPrice: 425,
      additionalDiscountPercent: 5,
      stock: 45,
      unit: '5 kg Bag'
    },
    {
      productId: 'prod-3',
      sellerId: 'seller-3',
      sellerName: 'Kurali Royal Sweets',
      sellerLocality: 'Railway Station Road',
      sellerDistanceKm: 1.2,
      title: 'Pure Desi Buffalo Ghee (1 Litre)',
      category: 'Dairy, Bakery & Sweets',
      description: 'Traditional granular golden desi ghee.',
      imageUrl: 'https://images.unsplash.com/photo-1631709497146-a239ef373cf1?auto=format&fit=crop&w=600&q=80',
      mrp: 750,
      sellerPrice: 650,
      additionalDiscountPercent: 4,
      stock: 20,
      unit: '1 Litre Glass Jar'
    }
  ];

  setRole(role: UserRole): void {
    this.service.setRole(role);
  }
}
