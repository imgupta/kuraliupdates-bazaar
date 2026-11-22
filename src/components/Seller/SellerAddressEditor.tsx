import React, { useEffect, useState } from 'react';
import { LocationPicker, DeliveryLocation } from '../Auth/LocationPicker';

type Props = {
  seller: any;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { address: string; locality: string; latitude: number; longitude: number; placeId: string }) => Promise<void>;
};

export const SellerAddressEditor: React.FC<Props> = ({ seller, saving, onClose, onSave }) => {
  const [address, setAddress] = useState(String(seller?.address || ''));
  const [locality, setLocality] = useState(String(seller?.locality || ''));
  const [location, setLocation] = useState<DeliveryLocation | null>(
    seller?.latitude != null && seller?.longitude != null ? {
      formattedAddress: String(seller.address || ''),
      placeId: String(seller.placeId || ''),
      latitude: Number(seller.latitude),
      longitude: Number(seller.longitude),
    } : null
  );

  useEffect(() => {
    setAddress(String(seller?.address || ''));
    setLocality(String(seller?.locality || ''));
    setLocation(seller?.latitude != null && seller?.longitude != null ? {
      formattedAddress: String(seller.address || ''),
      placeId: String(seller.placeId || ''),
      latitude: Number(seller.latitude),
      longitude: Number(seller.longitude),
    } : null);
  }, [seller]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!address.trim() || !locality.trim() || !location
      || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;
    void onSave({
      address: address.trim(),
      locality: locality.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      placeId: location.placeId || '',
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3">
      <form onSubmit={submit} className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b p-4">
          <div><h2 className="text-lg font-black text-slate-900">Update shop address</h2><p className="mt-1 text-xs text-slate-500">Edit your business address and pin the exact shop entrance.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-xs font-bold">Close</button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4">
          <label className="block text-xs font-bold text-slate-700">Full shop address / landmark
            <textarea value={address} onChange={event => setAddress(event.target.value)} required maxLength={500} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Shop number, street and landmark" />
          </label>
          <label className="block text-xs font-bold text-slate-700">Locality
            <input value={locality} onChange={event => setLocality(event.target.value)} required maxLength={150} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Kurali locality / area" />
          </label>
          <LocationPicker value={location} onChange={setLocation} purpose="shop" />
          {!location && <p className="text-xs font-semibold text-rose-700">Select the shop location on the map before saving.</p>}
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">For safety, changing your address or map pin sends the new location for Admin re-verification. Your existing seller approval is not automatically granted to the new location.</p>
        </div>
        <footer className="flex justify-end gap-2 border-t p-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border px-4 py-2.5 text-xs font-bold">Cancel</button>
          <button type="submit" disabled={saving || !address.trim() || !locality.trim() || !location} className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save address for verification'}</button>
        </footer>
      </form>
    </div>
  );
};
