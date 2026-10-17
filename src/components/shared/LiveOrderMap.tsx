import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';
import { bazaarApi } from '../../services/api';

interface LiveOrderMapProps {
  orderId: string;
  fallbackBuyer?: { latitude?: number; longitude?: number };
}

declare global { interface Window { google?: any; } }

export const LiveOrderMap: React.FC<LiveOrderMapProps> = ({ orderId, fallbackBuyer }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const buyerMarker = useRef<any>(null);
  const riderMarker = useRef<any>(null);
  const [tracking, setTracking] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!key) return;
    const load = async () => {
      if (!window.google?.maps) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Google Maps failed to load'));
          document.head.appendChild(script);
        });
      }
      if (!mounted || !mapRef.current) return;
      map.current = new window.google.maps.Map(mapRef.current, {
        center: fallbackBuyer?.latitude ? { lat: fallbackBuyer.latitude, lng: fallbackBuyer.longitude } : { lat: 30.903, lng: 76.426 },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    };
    load().catch(() => undefined);
    return () => { mounted = false; };
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const data = await bazaarApi.getLiveTracking(orderId);
      if (!cancelled && data) setTracking(data);
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [orderId]);

  useEffect(() => {
    if (!map.current || !window.google?.maps || !tracking) return;
    const buyer = Number.isFinite(Number(tracking.buyerLatitude)) && Number.isFinite(Number(tracking.buyerLongitude))
      ? { lat: Number(tracking.buyerLatitude), lng: Number(tracking.buyerLongitude) }
      : null;
    const rider = Number.isFinite(Number(tracking.agentLatitude)) && Number.isFinite(Number(tracking.agentLongitude))
      ? { lat: Number(tracking.agentLatitude), lng: Number(tracking.agentLongitude) }
      : null;
    if (buyer) {
      if (!buyerMarker.current) buyerMarker.current = new window.google.maps.Marker({ map: map.current, position: buyer, label: 'B', title: 'Delivery address' });
      else buyerMarker.current.setPosition(buyer);
    }
    if (rider) {
      if (!riderMarker.current) riderMarker.current = new window.google.maps.Marker({ map: map.current, position: rider, label: 'R', title: 'Delivery partner' });
      else riderMarker.current.setPosition(rider);
    }
    const points = [buyer, rider].filter(Boolean);
    if (points.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach(point => bounds.extend(point));
      map.current.fitBounds(bounds, 60);
    } else if (points.length === 1) {
      map.current.setCenter(points[0]);
    }
  }, [tracking]);

  return (
    <div className="relative h-52 sm:h-64 bg-slate-100">
      <div ref={mapRef} className="absolute inset-0" />
      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1.5 text-[10px] font-black shadow"><Navigation className="w-3.5 h-3.5 text-amber-600" /> Rider</span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1.5 text-[10px] font-black shadow"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> Your address</span>
      </div>
      <div className="absolute bottom-3 right-3 rounded-xl bg-slate-950/90 text-white px-3 py-2 text-[10px] font-bold shadow">
        <RefreshCw className="inline w-3 h-3 mr-1.5 animate-spin" /> Live location updates every 5 seconds
      </div>
    </div>
  );
};