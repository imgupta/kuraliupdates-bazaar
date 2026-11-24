import React from 'react';
interface Props { adminSellers:any[]; products:any[]; }
export const AdminStoresTab:React.FC<Props>=({adminSellers,products})=>{
 const approvedSellers=adminSellers.filter(s=>String(s.status).toLowerCase()==='approved');
 return (
                  <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">
                  Verified Marketplace Stores ({approvedSellers.length})
                </h2>
              </div>
    
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedSellers.map(seller => {
                  const sellerProdCount = products.filter(p => p.sellerId === seller.sellerId).length;
                  return (
                    <div
                      key={seller.sellerId}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-start gap-4"
                    >
                      <img
                        src={seller.avatarUrl}
                        alt={seller.storeName}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-extrabold text-sm text-slate-900 truncate">{seller.storeName}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{seller.category} &bull; {seller.locality}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                          <span>Products Listed: <strong>{sellerProdCount}</strong></span>
                          <span>Rating: <strong>★ {seller.rating}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
 );
};
