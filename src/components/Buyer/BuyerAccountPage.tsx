import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, HelpCircle, MapPin, Package, Pencil, Plus, Save, ShoppingBag, User, X } from 'lucide-react';
import { useApp, SavedAddress } from '../../context/AppContext';
import { LocationPicker, DeliveryLocation } from '../Auth/LocationPicker';
import { OrderTrackingModal } from './OrderTrackingModal';

const emptyLocation = null;

export const BuyerAccountPage: React.FC = () => {
  const { user, orders, updateUserProfile, createBuyerAddress, updateBuyerAddress, setDefaultBuyerAddress, showToast } = useApp();
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [section, setSection] = useState<'overview' | 'profile' | 'addresses' | 'orders' | 'current' | 'help'>('overview');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [location, setLocation] = useState<DeliveryLocation | null>(emptyLocation);
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [label, setLabel] = useState('Home');

  const addresses = user.savedAddresses || [];
  const buyerOrders = useMemo(() => orders.filter(o => !user.email || o.buyerEmail === user.email), [orders, user.email]);
  const currentOrders = buyerOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const saveProfile = async () => {
    if (!profileName.trim()) return showToast('Please enter your name.', 'error');
    setSavingProfile(true);
    try {
      const saved = await updateUserProfile({ name: profileName.trim(), phone: profilePhone.replace(/\D/g, '') });
      if (saved) {
        setEditingProfile(false);
        showToast('Profile updated successfully.', 'success');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const openNewAddress = () => {
    setEditingAddress(null);
    setLabel('Home');
    setAddressLine('');
    setLandmark('');
    setLocation(null);
    setSection('addresses');
  };

  const openEditAddress = (address: SavedAddress) => {
    setEditingAddress(address);
    setLabel(address.label);
    setAddressLine(address.addressLine1);
    setLandmark(address.landmark || '');
    setLocation(address.latitude != null && address.longitude != null ? {
      latitude: address.latitude,
      longitude: address.longitude,
      formattedAddress: address.formattedAddress || address.addressLine1,
      placeId: address.placeId || '',
    } : null);
  };

  const saveAddress = async () => {
    if (!addressLine.trim()) return showToast('Please enter your house / flat / building details.', 'error');
    const next: SavedAddress = {
      id: editingAddress?.id || `addr-${Date.now()}`,
      label: label.trim() || 'Home',
      addressLine1: addressLine.trim(),
      landmark: landmark.trim() || undefined,
      formattedAddress: location?.formattedAddress,
      placeId: location?.placeId,
      latitude: location?.latitude,
      longitude: location?.longitude,
      isDefault: editingAddress?.isDefault || addresses.length === 0,
    };
    setSavingAddress(true);
    try {
      const saved = editingAddress ? await updateBuyerAddress(next) : await createBuyerAddress(next);
      if (!saved) {
        showToast('Unable to save address. Please try again.', 'error');
        return;
      }
      setEditingAddress(null);
      setLocation(null);
      setAddressLine('');
      setLandmark('');
      showToast(editingAddress ? 'Address updated.' : 'New address added.', 'success');
    } finally {
      setSavingAddress(false);
    }
  };

  const setDefaultAddress = async (id: string) => {
    const saved = await setDefaultBuyerAddress(id);
    if (saved) showToast('Default delivery address updated.', 'success');
    else showToast('Unable to update default address. Please try again.', 'error');
  };

  const menu = [
    { id: 'overview' as const, label: 'Account overview', icon: User },
    { id: 'profile' as const, label: 'Update profile', icon: User },
    { id: 'addresses' as const, label: 'My addresses', icon: MapPin },
    { id: 'orders' as const, label: 'Order history', icon: Package },
    { id: 'current' as const, label: 'Current order', icon: ShoppingBag, badge: currentOrders.length },
    { id: 'help' as const, label: 'Help', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5">
        <a href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-amber-700"><ArrowLeft className="w-4 h-4" /> Back to Bazaar</a>

        <div className="mt-5 grid lg:grid-cols-[250px_1fr] gap-5">
          <aside className="rounded-3xl bg-white border border-slate-200 p-3 h-fit shadow-sm">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 mb-3">
              <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-lg">{(user.name || 'B').charAt(0).toUpperCase()}</div>
              <p className="mt-3 text-sm font-black text-slate-900 truncate">{user.name || 'Buyer'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email || user.phone}</p>
            </div>
            {menu.map(item => {
              const Icon = item.icon;
              return <button key={item.id} onClick={() => setSection(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-xs font-bold ${section === item.id ? 'bg-amber-100 text-amber-800' : 'text-slate-700 hover:bg-slate-50'}`}><Icon className="w-4 h-4" /><span className="flex-1">{item.label}</span>{item.badge ? <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px]">{item.badge}</span> : <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}</button>;
            })}
          </aside>

          <main className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7">
            {section === 'overview' && <Overview user={user} addresses={addresses} currentOrders={currentOrders} onSection={setSection} />}
            {section === 'profile' && <section><Title icon={<User />} title="Update profile" /><div className="max-w-xl space-y-4"><Field label="Full name" value={profileName} onChange={setProfileName} /><Field label="Mobile number" value={profilePhone} onChange={setProfilePhone} /><div><label className="text-xs font-bold text-slate-700">Email</label><input value={user.email || ''} disabled className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500" /></div><button onClick={saveProfile} disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 text-white px-4 py-2.5 text-xs font-black disabled:opacity-60 disabled:cursor-not-allowed"><Save className="w-4 h-4" /> {savingProfile ? 'Saving...' : 'Save profile'}</button></div></section>}
            {section === 'addresses' && <Addresses addresses={addresses} editingAddress={editingAddress} label={label} setLabel={setLabel} addressLine={addressLine} setAddressLine={setAddressLine} landmark={landmark} setLandmark={setLandmark} location={location} setLocation={setLocation} onNew={openNewAddress} onEdit={openEditAddress} onSave={saveAddress} savingAddress={savingAddress} onDefault={setDefaultAddress} onCancel={() => { setEditingAddress(null); setLocation(null); setAddressLine(''); setLandmark(''); }} />}
            {section === 'orders' && <Orders orders={buyerOrders} onTrack={setTrackingOrderId} title="Order history" />}
            {section === 'current' && <Orders orders={currentOrders} onTrack={setTrackingOrderId} title="Current order" current />}
            {section === 'help' && <section><Title icon={<HelpCircle />} title="Help" /><div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><HelpCircle className="w-10 h-10 mx-auto text-slate-300" /><h3 className="mt-3 font-black text-slate-900">Help center coming soon</h3><p className="mt-1 text-xs text-slate-500">Support, FAQs, refunds and order assistance will be added here.</p></div></section>}
          </main>
        </div>
      </div>
      {trackingOrderId && <OrderTrackingModal orderId={trackingOrderId} onClose={() => setTrackingOrderId(null)} />}
    </div>
  );
};

const Title = ({ icon, title }: { icon: React.ReactNode; title: string }) => <div className="flex items-center gap-2 mb-6"><span className="text-amber-600">{icon}</span><h1 className="text-xl font-black text-slate-900">{title}</h1></div>;
const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => <div><label className="text-xs font-bold text-slate-700">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500" /></div>;

const Overview = ({ user, addresses, currentOrders, onSection }: any) => (
  <section><Title icon={<User />} title="My Account" /><div className="grid sm:grid-cols-2 gap-4">
    <Card icon={<MapPin />} title="My address" value={addresses.find((a: SavedAddress) => a.isDefault)?.formattedAddress || addresses[0]?.addressLine1 || user.address || 'No address added'} action="Manage addresses" onClick={() => onSection('addresses')} />
    <Card icon={<Package />} title="Order history" value={`${currentOrders.length} current order(s) • View all orders`} action="View orders" onClick={() => onSection('orders')} />
    <Card icon={<User />} title="Profile" value={user.email || user.phone || ''} action="Update profile" onClick={() => onSection('profile')} />
    <Card icon={<HelpCircle />} title="Help" value="Support center" action="Coming soon" onClick={() => onSection('help')} />
  </div></section>
);

const Card = ({ icon, title, value, action, onClick }: any) => <button onClick={onClick} className="text-left rounded-2xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all"><div className="flex items-center gap-2 text-amber-600">{icon}<span className="text-xs font-black uppercase tracking-wide">{title}</span></div><p className="mt-3 text-sm font-bold text-slate-800 line-clamp-2">{value}</p><span className="mt-4 inline-flex items-center gap-1 text-[11px] font-black text-amber-700">{action}<ChevronRight className="w-3 h-3" /></span></button>;

const Addresses = (p: any) => <section><div className="flex items-center justify-between mb-6"><Title icon={<MapPin />} title="My addresses" /><button onClick={p.onNew} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 text-white px-3 py-2 text-xs font-black"><Plus className="w-4 h-4" /> Add new address</button></div>
  {p.editingAddress !== null || p.addressLine ? <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3"><div className="flex justify-between"><p className="text-xs font-black">{p.editingAddress ? 'Update address' : 'Add new address'}</p><button onClick={p.onCancel}><X className="w-4 h-4" /></button></div><div className="grid sm:grid-cols-2 gap-3"><Field label="Label" value={p.label} onChange={p.setLabel} /><Field label="House / Flat / Building" value={p.addressLine} onChange={p.setAddressLine} /><Field label="Nearby landmark" value={p.landmark} onChange={p.setLandmark} /></div><LocationPicker value={p.location} onChange={p.setLocation} /><button onClick={p.onSave} disabled={p.savingAddress} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 text-white px-4 py-2.5 text-xs font-black disabled:opacity-60 disabled:cursor-not-allowed"><Save className="w-4 h-4" /> {p.savingAddress ? 'Saving...' : 'Save address'}</button></div> : null}
  {p.addresses.length === 0 && <div className="rounded-2xl bg-slate-50 p-8 text-center text-xs text-slate-500">No saved addresses yet. Add one for faster checkout.</div>}
  <div className="space-y-3">{p.addresses.map((a: SavedAddress) => <div key={a.id} className="rounded-2xl border border-slate-200 p-4 flex gap-3"><MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" /><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><b className="text-sm">{a.label}</b>{a.isDefault && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">DEFAULT</span>}</div><p className="mt-1 text-xs text-slate-600">{[a.addressLine1, a.landmark, a.formattedAddress].filter(Boolean).join(', ')}</p><div className="mt-3 flex gap-2"><button onClick={() => p.onEdit(a)} className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700"><Pencil className="w-3 h-3" /> Edit</button>{!a.isDefault && <button onClick={() => p.onDefault(a.id)} className="text-[11px] font-black text-slate-600">Make default</button>}</div></div></div>)}</div>
</section>;

const Orders = ({ orders, onTrack, title, current }: { orders: any[]; onTrack: (id: string) => void; title: string; current?: boolean }) => <section><Title icon={<Package />} title={title} />{orders.length === 0 ? <div className="rounded-2xl bg-slate-50 p-8 text-center text-xs text-slate-500">{current ? 'No active order right now.' : 'No orders found.'}</div> : <div className="space-y-3">{orders.map(o => <div key={o.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{o.id}</p><p className="text-xs text-slate-500">{o.sellerName} • {o.placedAt}</p></div><span className="rounded-full bg-amber-100 text-amber-800 px-2 py-1 text-[10px] font-black uppercase">{o.status.replace(/_/g, ' ')}</span></div><p className="mt-3 text-xs text-slate-600">{o.items?.length || 0} item(s) • ₹{o.totalAmount}</p>{current && <button onClick={() => onTrack(o.id)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 text-white px-3 py-2 text-[11px] font-black"><MapPin className="w-3.5 h-3.5" /> Track order</button>}</div>)}</div>}</section>;
