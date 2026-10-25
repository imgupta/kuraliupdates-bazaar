import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation, RefreshCw, Route } from 'lucide-react';
import { trackingApi } from '../../services/domains/trackingApi';

interface LiveOrderMapProps {
  orderId: string;
  fallbackBuyer?: { latitude?: number; longitude?: number };
  sellerAddress?: string;
  destinationAddress?: string;
  orderStatus?: string;
}

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}

type Point = { lat: number; lng: number };
const DEFAULT_KURALI: Point = { lat: 30.903, lng: 76.426 };

const toPoint = (latitude: unknown, longitude: unknown): Point | null => {
  if (latitude === null || latitude === undefined || latitude === '' || longitude === null || longitude === undefined || longitude === '') return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};

const distanceKm = (a: Point, b: Point) => {
  const radians = (n: number) => n * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const LiveOrderMap: React.FC<LiveOrderMapProps> = ({
  orderId, fallbackBuyer, sellerAddress, destinationAddress, orderStatus,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapReadyRef = useRef(false);
  const map = useRef<any>(null);
  const buyerMarker = useRef<any>(null);
  const riderMarker = useRef<any>(null);
  const sellerMarker = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [googleMapsFailed, setGoogleMapsFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const [sellerCustomerDistance, setSellerCustomerDistance] = useState<string | null>(null);
  const [routeError, setRouteError] = useState(false);

  const fallbackBuyerPoint = useMemo(() => toPoint(fallbackBuyer?.latitude, fallbackBuyer?.longitude), [fallbackBuyer?.latitude, fallbackBuyer?.longitude]);
  const buyerPoint = useMemo(() => toPoint(tracking?.buyerLatitude, tracking?.buyerLongitude) || fallbackBuyerPoint, [tracking?.buyerLatitude, tracking?.buyerLongitude, fallbackBuyerPoint]);
  const riderPoint = useMemo(() => toPoint(tracking?.agentLatitude, tracking?.agentLongitude), [tracking?.agentLatitude, tracking?.agentLongitude]);
  const pickupAddress = [tracking?.sellerAddress || sellerAddress, tracking?.sellerLocality, 'Punjab, India'].filter(Boolean).join(', ');
  const buyerAddress = [tracking?.buyerAddress || destinationAddress, tracking?.buyerLocality, 'Punjab, India'].filter(Boolean).join(', ');
  const status = String(tracking?.status || orderStatus || '').toLowerCase();
  const enRouteToCustomer = ['picked_up', 'out_for_delivery', 'delivered'].includes(status);
  const routeDestination = enRouteToCustomer
    ? (buyerPoint || buyerAddress)
    : (pickupAddress || buyerPoint || buyerAddress);
  const routeOrigin = riderPoint;

  const fallbackPoint = useMemo(() => riderPoint || buyerPoint || DEFAULT_KURALI, [riderPoint, buyerPoint]);
  const bbox = useMemo(() => [
    Math.max(-180, fallbackPoint.lng - 0.02),
    Math.max(-90, fallbackPoint.lat - 0.015),
    Math.min(180, fallbackPoint.lng + 0.02),
    Math.min(90, fallbackPoint.lat + 0.015),
  ].join(','), [fallbackPoint.lat, fallbackPoint.lng]);
  const mapsKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  const useOpenStreetMap = !mapsKey || googleMapsFailed;

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;
    let mapReadyTimeoutId: number | undefined;
    let script: HTMLScriptElement | null = null;
    map.current = null;
    setMapReady(false);
    mapReadyRef.current = false;
    setGoogleMapsFailed(false);
    setRouteDistance(null);
    setRouteDuration(null);

    if (!mapsKey) {
      setGoogleMapsFailed(true);
      return () => { mounted = false; };
    }

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      previousAuthFailure?.();
      if (mounted) { setGoogleMapsFailed(true); setMapReady(false); }
    };

    const loadMaps = async () => {
      if (!window.google?.maps) {
        const existingScript = document.getElementById('kurali-google-maps-script') as HTMLScriptElement | null;
        if (existingScript) {
          await new Promise<void>((resolve, reject) => {
            const existingScriptTimeout = window.setTimeout(() => reject(new Error('Google Maps script initialization timed out')), 12000);
            const done = () => { window.clearTimeout(existingScriptTimeout); resolve(); };
            existingScript.addEventListener('load', done, { once: true });
            existingScript.addEventListener('error', () => { window.clearTimeout(existingScriptTimeout); reject(new Error('Google Maps script failed')); }, { once: true });
            if (window.google?.maps) done();
          });
        } else {
          await new Promise<void>((resolve, reject) => {
            script = document.createElement('script');
            script.id = 'kurali-google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Google Maps script failed to load'));
            document.head.appendChild(script);
            timeoutId = window.setTimeout(() => reject(new Error('Google Maps initialization timed out')), 12000);
          });
        }
      }
      if (!mounted || !mapRef.current || !window.google?.maps) return;
      map.current = new window.google.maps.Map(mapRef.current, {
        center: buyerPoint || DEFAULT_KURALI,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        map: map.current,
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: { strokeColor: '#047857', strokeOpacity: 0.9, strokeWeight: 6 },
      });
      window.google.maps.event.addListenerOnce(map.current, 'idle', () => {
        if (mapReadyTimeoutId !== undefined) window.clearTimeout(mapReadyTimeoutId);
        if (mounted) { mapReadyRef.current = true; setMapReady(true); }
      });
      mapReadyTimeoutId = window.setTimeout(() => {
        if (mounted && !mapReadyRef.current) setGoogleMapsFailed(true);
      }, 12000);
    };

    loadMaps().catch(() => { if (mounted) setGoogleMapsFailed(true); });
    return () => {
      mounted = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (mapReadyTimeoutId !== undefined) window.clearTimeout(mapReadyTimeoutId);
      if (window.gm_authFailure !== previousAuthFailure) window.gm_authFailure = previousAuthFailure;
      if (script?.parentNode && !window.google?.maps) script.parentNode.removeChild(script);
    };
  // Map is recreated when the order or fallback destination changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, fallbackBuyerPoint?.lat, fallbackBuyerPoint?.lng, mapsKey]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const data = await trackingApi.getLiveTracking(orderId);
      if (!cancelled && data) setTracking(data);
    };
    setTracking(null);
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [orderId]);

  useEffect(() => {
    if (!map.current || !window.google?.maps || !mapReady) return;
    if (buyerPoint) {
      if (!buyerMarker.current) buyerMarker.current = new window.google.maps.Marker({ map: map.current, position: buyerPoint, label: 'C', title: 'Customer destination' });
      else buyerMarker.current.setPosition(buyerPoint);
    }
    if (riderPoint) {
      if (!riderMarker.current) riderMarker.current = new window.google.maps.Marker({ map: map.current, position: riderPoint, label: 'R', title: 'Delivery partner current location' });
      else riderMarker.current.setPosition(riderPoint);
    }
    if (pickupAddress && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: pickupAddress }, (results: any[], statusValue: string) => {
        if (statusValue === 'OK' && results?.[0] && map.current) {
          const position = results[0].geometry.location;
          if (!sellerMarker.current) sellerMarker.current = new window.google.maps.Marker({ map: map.current, position, label: 'S', title: 'Seller pickup location' });
          else sellerMarker.current.setPosition(position);
        }
      });
    }
    if (riderPoint && routeDestination && window.google.maps.DirectionsService && directionsRenderer.current) {
      setRouteError(false);
      const directions = new window.google.maps.DirectionsService();
      directions.route({
        origin: riderPoint || (typeof routeOrigin === 'object' ? routeOrigin : String(routeOrigin)),
        destination: typeof routeDestination === 'object' ? routeDestination : String(routeDestination),
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      }, (result: any, routeStatus: string) => {
        if (routeStatus === 'OK' && result?.routes?.[0]?.legs?.[0]) {
          directionsRenderer.current?.setDirections(result);
          const leg = result.routes[0].legs[0];
          setRouteDistance(leg.distance?.text || null);
          setRouteDuration(leg.duration?.text || null);
          setRouteError(false);
        } else {
          directionsRenderer.current?.set('directions', null);
          setRouteDistance(riderPoint && buyerPoint ? `~${distanceKm(riderPoint, buyerPoint).toFixed(1)} km straight-line` : null);
          setRouteDuration(null);
          setRouteError(true);
        }
      });
    }
  }, [mapReady, buyerPoint?.lat, buyerPoint?.lng, riderPoint?.lat, riderPoint?.lng, pickupAddress, buyerAddress, routeDestination, routeOrigin]);

  useEffect(() => {
    if (!mapReady || !window.google?.maps || !pickupAddress || !(buyerPoint || buyerAddress)) return;
    const directions = new window.google.maps.DirectionsService();
    directions.route({
      origin: pickupAddress,
      destination: buyerPoint || buyerAddress,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result: any, routeStatus: string) => {
      if (routeStatus === 'OK' && result?.routes?.[0]?.legs?.[0]) {
        setSellerCustomerDistance(result.routes[0].legs[0].distance?.text || null);
      } else {
        setSellerCustomerDistance(null);
      }
    });
  }, [mapReady, pickupAddress, buyerAddress, buyerPoint?.lat, buyerPoint?.lng]);

  const navigationUrl = useMemo(() => {
    const destination = enRouteToCustomer ? buyerAddress : pickupAddress;
    const origin = riderPoint ? `${riderPoint.lat},${riderPoint.lng}` : undefined;
    if (!destination) return 'https://www.google.com/maps';
    return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  }, [enRouteToCustomer, buyerAddress, pickupAddress, riderPoint?.lat, riderPoint?.lng]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="relative h-56 sm:h-72 bg-slate-100">
        {useOpenStreetMap ? (
          <iframe title="Delivery route map" className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${fallbackPoint.lat}%2C${fallbackPoint.lng}`} />
        ) : (
          <>
            <div ref={mapRef} className="absolute inset-0" />
            {!mapReady && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 text-sm font-semibold text-slate-600">Loading live map…</div>}
          </>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-extrabold shadow"><Navigation className="h-3.5 w-3.5 text-amber-600" /> Rider current location</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-extrabold shadow"><MapPin className="h-3.5 w-3.5 text-emerald-700" /> Customer</span>
          {pickupAddress && <span className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-extrabold shadow"><MapPin className="h-3.5 w-3.5 text-blue-700" /> Seller pickup</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800"><Route className="h-4 w-4 text-emerald-700" /> {enRouteToCustomer ? 'Route to customer' : 'Route to seller pickup'}</p>
          <p className="text-[11px] text-slate-600">{routeDistance ? `Rider route: ${routeDistance}${routeDuration ? ` · ETA ${routeDuration}` : ''}` : riderPoint && buyerPoint ? `Approx. ${distanceKm(riderPoint, buyerPoint).toFixed(1)} km straight-line to customer` : 'Waiting for GPS and route details…'}</p>
          {sellerCustomerDistance && <p className="text-[11px] text-slate-600">Seller → customer: {sellerCustomerDistance} by road</p>
          {routeError && <p className="text-[10px] text-amber-700">Road route unavailable here; open navigation for turn-by-turn directions.</p>}
          {!riderPoint && <p className="text-[10px] text-slate-500">Rider GPS is not available yet. Allow location access on the delivery device.</p>}
        </div>
        <a href={navigationUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800">
          <Navigation className="h-4 w-4" /> Start navigation
        </a>
        <span className="flex w-full items-center gap-1 text-[10px] font-semibold text-slate-500"><RefreshCw className="h-3 w-3" /> GPS refreshes every 5 seconds while the delivery app is active</span>
      </div>
    </div>
  );
};
