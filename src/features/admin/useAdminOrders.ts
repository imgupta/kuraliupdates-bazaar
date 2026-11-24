import { useState, type Dispatch, type SetStateAction } from 'react';
import { adminApi } from '../../services/domains/adminApi';
import { createAdminOrderActions } from './adminOrderActions';
import { orderToForm, type AdminOrderForm } from './adminOrders';
interface Options { adminOrders:any[]; setAdminOrders:Dispatch<SetStateAction<any[]>>; showToast:(message:string,type?:'success'|'info'|'error')=>void; }
export const useAdminOrders = ({adminOrders,setAdminOrders,showToast}:Options) => {
  const [orderSearch,setOrderSearch]=useState('');
  const [orderStatusFilter,setOrderStatusFilter]=useState('');
  const [ordersLoading,setOrdersLoading]=useState(false);
  const [editingOrder,setEditingOrder]=useState<any|null>(null);
  const [orderForm,setOrderForm]=useState<AdminOrderForm>({buyerName:'',buyerPhone:'',buyerEmail:'',deliveryAddress:'',deliveryLocality:''});
  const [orderSaving,setOrderSaving]=useState(false);
  const [orderError,setOrderError]=useState('');
  const actions=createAdminOrderActions({
    api:adminApi,
    ui:{
      prompt:(message,defaultValue)=>window.prompt(message,defaultValue),
      alert:message=>window.alert(message),
      toast:(message,type)=>showToast(message,type),
    },
    getFilters:()=>({search:orderSearch,status:orderStatusFilter}),
    setOrders:updater=>setAdminOrders(updater),
    setLoading:setOrdersLoading,
    getEditingOrder:()=>editingOrder,
    getOrderForm:()=>orderForm,
    setEditingOrder,setOrderSaving,setOrderError,
  });
  const openOrderEditor=(order:any)=>{setEditingOrder(order);setOrderForm(orderToForm(order));setOrderError('');};
  const closeOrderEditor=()=>setEditingOrder(null);
  const updateOrderFormField=(field:keyof AdminOrderForm,value:string)=>setOrderForm(current=>({...current,[field]:value}));
  return {orderSearch,setOrderSearch,orderStatusFilter,setOrderStatusFilter,ordersLoading,editingOrder,orderForm,orderSaving,orderError,actions,filteredOrders:adminOrders,openOrderEditor,closeOrderEditor,updateOrderFormField};
};
