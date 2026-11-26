import { API_BASE_URL } from '../http/apiConfig';
const request = async (path: string, init?: RequestInit) => {
  const token=localStorage.getItem('kurali_auth_token');
  if(!token) throw new Error('Please sign in again.');
  const res=await fetch(`${API_BASE_URL}${path}`,{...init,headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`,...(init?.headers||{})},cache:'no-store'});
  const body=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(body?.message||`Request failed (HTTP ${res.status})`);
  return body;
};
export const buyerReturnsApi = {
  list: () => request('/buyers/me/returns'),
  eligibility: (orderId:string) => request(`/buyers/orders/${encodeURIComponent(orderId)}/return-eligibility`),
  create: (orderId:string,itemId:string,quantity:number,reason:string) => request(`/buyers/orders/${encodeURIComponent(orderId)}/returns`,{method:'POST',body:JSON.stringify({itemId,quantity,reason})}),
};
