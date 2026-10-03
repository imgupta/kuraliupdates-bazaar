import React, { useState } from 'react';
import {
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  X,
  Layers,
  Activity,
  HardDrive,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface BackendStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendStatusModal: React.FC<BackendStatusModalProps> = ({ isOpen, onClose }) => {
  const {
    backendUrl,
    setBackendUrl,
    backendStatus,
    syncWithBackend,
    products,
    sellers,
    orders,
    showToast,
  } = useApp();

  const [inputUrl, setInputUrl] = useState(backendUrl);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSaveAndSync = async () => {
    setIsTesting(true);
    setBackendUrl(inputUrl.trim());
    await syncWithBackend();
    setIsTesting(false);
    showToast('Backend settings updated and synced with Oracle DB.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Database className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                Oracle Autonomous DB &amp; Render Backend
              </h3>
              <p className="text-xs text-red-100">
                Live Enterprise Microservice for KuraliUpdates Bazaar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              backendStatus.isOnline
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            {backendStatus.isOnline ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Activity className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  {backendStatus.isOnline ? 'Live Connection Active' : 'Connecting to Render / Oracle Cloud'}
                </h4>
                {backendStatus.lastSynced && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    Last ping: {backendStatus.lastSynced}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-slate-700">
                {backendStatus.isOnline
                  ? 'Frontend is actively querying and writing directly to the Render Java Spring Boot microservice connected with Oracle Autonomous DB.'
                  : 'Render free services spin down after inactivity. Cold-starts take ~30-50 seconds to initialize Java Spring Boot & Oracle Wallet connection.'}
              </p>
            </div>
          </div>

          {/* Oracle Cloud Database Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-red-600" />
                Oracle Autonomous Database Specification
              </span>
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
                ap-mumbai-1
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px]">Host</span>
                <span className="font-semibold text-slate-800 truncate block">
                  adb.ap-mumbai-1.oraclecloud.com
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px]">Service</span>
                <span className="font-semibold text-slate-800 truncate block">
                  jkphg8mg7fvt8c2n_high
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px]">Credentials Wallet</span>
                <span className="font-semibold text-slate-800 truncate block">
                  Wallet_JKPHG8MG7FVT8C2N.zip
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px]">Connection Pool</span>
                <span className="font-semibold text-slate-800 truncate block">
                  HikariCP (Max 10)
                </span>
              </div>
            </div>
          </div>

          {/* Backend API Configuration */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Live Render API Endpoint</span>
              <a
                href={`${backendUrl}/swagger-ui/index.html`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-normal"
              >
                <span>Swagger OpenAPI Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="https://kuraliupdates-bazaar.onrender.com/api/v1"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white"
              />
              <button
                onClick={handleSaveAndSync}
                disabled={isTesting || backendStatus.isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting || backendStatus.isLoading ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>
          </div>

          {/* Live Data Counts */}
          <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="block text-lg font-black text-slate-800">{products.length}</span>
              <span className="text-[10px] uppercase font-bold text-slate-500">Products</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="block text-lg font-black text-slate-800">{sellers.length}</span>
              <span className="text-[10px] uppercase font-bold text-slate-500">Stores</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="block text-lg font-black text-slate-800">{orders.length}</span>
              <span className="text-[10px] uppercase font-bold text-slate-500">Orders</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted TCPS Protocol (Port 1522)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
