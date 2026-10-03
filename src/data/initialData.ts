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

// Standard platform promotional coupons
export const INITIAL_COUPONS: Coupon[] = [
  {
    code: 'WELCOMEKURALI',
    discountPercentage: 10,
    minOrderValue: 200,
    maxDiscount: 50,
    description: '10% instant discount on your first order in Kurali',
  },
  {
    code: 'FREESHIP',
    flatDiscount: 30,
    minOrderValue: 299,
    description: 'Free standard delivery across Kurali for orders above ₹299',
  },
  {
    code: 'KURALI50',
    flatDiscount: 50,
    minOrderValue: 500,
    description: 'Flat ₹50 OFF on orders above ₹500',
  }
];
