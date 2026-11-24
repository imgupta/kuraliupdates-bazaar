import { useState, type Dispatch, type SetStateAction } from 'react';
import { adminApi } from '../../services/domains/adminApi';
import { buyerToForm, type AdminBuyer, type AdminBuyerForm } from './adminBuyers';
type ToastType = 'success' | 'error' | 'info';
type ShowToast = (message: string, type?: ToastType) => void;
interface UseAdminBuyerEditorOptions { setBuyers: Dispatch<SetStateAction<any[]>>; showToast: ShowToast; }
export const useAdminBuyerEditor = ({ setBuyers, showToast }: UseAdminBuyerEditorOptions) => {
  const [buyerSearch, setBuyerSearch] = useState('');
  const [editingBuyer, setEditingBuyer] = useState<AdminBuyer | null>(null);
  const [buyerForm, setBuyerForm] = useState<AdminBuyerForm>({
    name: '', email: '', phone: '', locality: '', address: '', formattedAddress: '',
  });
  const [buyerSaving, setBuyerSaving] = useState(false);
  const [buyerEditError, setBuyerEditError] = useState('');
  const openBuyerEditor = (buyer: AdminBuyer) => {
    setEditingBuyer(buyer);
    setBuyerForm(buyerToForm(buyer));
    setBuyerEditError('');
  };
  const closeBuyerEditor = () => setEditingBuyer(null);
  const updateBuyerFormField = (field: keyof AdminBuyerForm, value: string) => {
    setBuyerForm(current => ({ ...current, [field]: value }));
  };
  const saveBuyer = async () => {
    if (!editingBuyer) return;
    setBuyerSaving(true);
    setBuyerEditError('');
    try {
      await adminApi.updateAdminBuyer(editingBuyer.userId, buyerForm);
      setBuyers(current => current.map(item => item.userId === editingBuyer.userId ? { ...item, ...buyerForm } : item));
      setEditingBuyer(null);
      showToast('Customer details updated successfully.', 'success');
    } catch (error: any) {
      setBuyerEditError(error?.message || 'Unable to update customer details.');
    } finally {
      setBuyerSaving(false);
    }
  };
  return { buyerSearch, setBuyerSearch, editingBuyer, buyerForm, buyerSaving, buyerEditError, openBuyerEditor, closeBuyerEditor, updateBuyerFormField, saveBuyer };
};
