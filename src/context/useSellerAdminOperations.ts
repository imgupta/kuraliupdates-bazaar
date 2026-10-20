import type { Dispatch, SetStateAction } from 'react';
import type { Coupon, DeliveryAgent, Product, Seller, UserRole } from '../types';
import type { UserProfile } from '../entities/userProfile';
import { sellerApi } from '../services/domains/sellerApi';
import { adminApi } from '../services/domains/adminApi';

type SellerAdminOperationsOptions = {
  setSellers: Dispatch<SetStateAction<Seller[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setCoupons: Dispatch<SetStateAction<Coupon[]>>;
  setDeliveryAgents: Dispatch<SetStateAction<DeliveryAgent[]>>;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  setRoleState: Dispatch<SetStateAction<UserRole>>;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
};

export const useSellerAdminOperations = ({
  setSellers, setProducts, setCoupons, setDeliveryAgents, setUser, setRoleState, showToast,
}: SellerAdminOperationsOptions) => {
  const registerSeller = async (
    data: Omit<Seller, 'id' | 'status' | 'rating' | 'reviewCount' | 'registeredAt'>
  ) => {
    const newId = `seller-${Date.now()}`;
    const newSeller: Seller = {
      ...data,
      id: newId,
      status: 'pending',
      rating: 5.0,
      reviewCount: 0,
      registeredAt: new Date().toISOString(),
    };

    setSellers(prev => [newSeller, ...prev]);
    setUser(prev => ({ ...prev, sellerId: newId, role: 'seller', isSignedIn: true, email: data.email, name: data.ownerName }));
    setRoleState('seller');
    showToast('Store registered successfully! Submitted for Admin verification.', 'success');

    // Async sync to Oracle DB via Render backend
    sellerApi.registerSeller(newSeller).then(res => {
      if (res && res.sellerId) {
        console.log('Seller successfully recorded in Oracle DB:', res.sellerId);
      }
    });
  };

  const approveSeller = (sellerId: string) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, status: 'approved', approvedAt: new Date().toISOString() } : s))
    );
    showToast('Seller store approved! Now live for Kurali buyers.', 'success');
    adminApi.approveSeller(sellerId);
  };

  const rejectSeller = (sellerId: string) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, status: 'rejected' } : s))
    );
    showToast('Seller store rejected.', 'info');
    adminApi.rejectSeller(sellerId);
  };

  const approveDeliveryAgent = (agentId: string) => {
    adminApi.approveDeliveryAgent(agentId).then(ok => {
      if (!ok) {
        showToast('Unable to approve delivery partner in backend.', 'error');
        return;
      }
      setDeliveryAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'active' } : a));
      showToast('Delivery partner approved and activated.', 'success');
    });
  };

  const rejectDeliveryAgent = (agentId: string) => {
    adminApi.rejectDeliveryAgent(agentId).then(ok => {
      if (!ok) {
        showToast('Unable to reject delivery partner in backend.', 'error');
        return;
      }
      setDeliveryAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'rejected' } : a));
      showToast('Delivery partner application rejected.', 'info');
    });
  };

  const updateSeller = (sellerId: string, updates: Partial<Seller>) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, ...updates } : s))
    );
    showToast('Store profile updated successfully.', 'success');
  };

  // Product Actions
  const addProduct = (
    productData: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'isAvailable'>
  ) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      rating: 5.0,
      reviewCount: 0,
      isAvailable: true,
    };
    setProducts(prev => [newProduct, ...prev]);
    showToast(`"${productData.title}" added to your store inventory.`, 'success');

    // Async sync to Oracle DB via Render backend
    sellerApi.addProduct(productData.sellerId, newProduct).then(res => {
      if (res && res.productId) {
        console.log('Product created in Oracle DB:', res.productId);
      }
    });
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...updates } : p))
    );
    showToast('Product updated successfully.', 'success');
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    showToast('Product removed from inventory.', 'info');
  };

  // Coupon Actions
  const addCoupon = (coupon: Coupon) => {
    setCoupons(prev => [coupon, ...prev.filter(c => c.code !== coupon.code)]);
    showToast(`Coupon "${coupon.code}" created!`, 'success');
  };

  const deleteCoupon = (code: string) => {
    setCoupons(prev => prev.filter(c => c.code !== code));
    showToast(`Coupon "${code}" deleted.`, 'info');
  };

  return {
    registerSeller, approveSeller, rejectSeller, approveDeliveryAgent, rejectDeliveryAgent,
    updateSeller, addProduct, updateProduct, deleteProduct, addCoupon, deleteCoupon,
  };
};
