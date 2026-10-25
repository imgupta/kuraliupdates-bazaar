import { Seller, Product, Coupon, DeliveryAgent, Order, NegotiationChat } from '../types';

export const ROOT_ADMIN_EMAIL = 'sg7508359237@gmail.com';
export const ADMIN_EMAILS = [
  'sg7508359237@gmail.com',
  'shubham.gupta180296@gmail.com',
  'admin@kuraliupdates.com',
];

export const isRootAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === email.trim().toLowerCase());
};

export const KURALI_LOCALITIES = [
  'All Localities (Kurali City)',
  'Main Bazaar & Clock Tower',
  'Morinda Road',
  'Railway Station Road',
  'Chandigarh Road / Main Chowk',
  'Siswan Road / Bypass',
  'Dana Mandi (Grain Market)',
  'Dashmesh Nagar',
  'Shivalik City & Ward 6',
  'Kharar-Kurali Highway',
];

export const PRODUCT_CATEGORIES = [
  'Groceries & Daily Essentials',
  'Dairy, Bakery & Sweets',
  'Fruits & Vegetables',
  'Electronics & Mobiles',
  'Pharmacy & Healthcare',
  'Hardware & Home Utility',
  'Apparel & Footwear',
  'Organic & Farm Produce',
  'Stationery & Books',
  'Others',
];

// Empty live datasets - real data comes from live registrations and backend API
export const INITIAL_SELLERS: Seller[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_DELIVERY_AGENTS: DeliveryAgent[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_CHATS: NegotiationChat[] = [];

// No hardcoded promotional coupons. Coupons must be explicitly created by an authorized admin.
export const INITIAL_COUPONS: Coupon[] = [];
