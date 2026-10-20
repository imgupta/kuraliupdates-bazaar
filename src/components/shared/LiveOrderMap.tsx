import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';
import { trackingApi } from '../../services/domains/trackingApi';

interface LiveOrderMapProps {
  orderId: string;
  fallbackBuyer?: { latitude?: number; longitude?: number };
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
  if (latitude === null || latitude === undefined || latitude === '' ||
      longitude === null || longitude === undefined || longitude === '') return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  // Reject the common (0, 0) placeholder rather than displaying a misleading location.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
};

export const LiveOrderMap: React.FC<LiveOrderMapProps> = ({ orderId, fallbackBuyer }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const buyerMarker = useRef<any>(null);
  const riderMarker = useRef<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [googleMapsFailed, setGoogleMapsFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const fallbackBuyerPoint = toPoint(fallbackBuyer?.latitude, fallbackBuyer?.longitude);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;
    let script: HTMLScriptElement | null = null;
    const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

    map.current = null;
    buyerMarker.current = null;
    riderMarker.current = null;
    setMapReady(false);
    setGoogleMapsFailed(false);

    if (!key) {
      setGoogleMapsFailed(true);
      return () => { mounted = false; };
    }

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      previousAuthFailure?.();
      if (mounted) {
        setGoogleMapsFailed(true);
        setMapReady(false);
        map.current = null;
      }
    };

    const loadMaps = async () => {
      if (!window.google?.maps) {
        await new Promise<void>((resolve, reject) => {
          script = document.createElement('script');
          script.id = 'kurali-google-maps-script';
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Google Maps script failed to load'));
          document.head.appendChild(script);
          timeoutId = window.setTimeout(() => reject(new Error('Google Maps initialization timed out')), 10000);
        });
      }

      if (!mounted || !mapRef.current || !window.google?.maps) return;
      const center = fallbackBuyerPoint || DEFAULT_KURALI;
      map.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      // Mark the map ready only after Google has rendered its first idle frame.
      window.google.maps.event.addListenerOnce(map.current, 'idle', () => {
        if (mounted && !googleMapsFailed) setMapReady(true);
      });
    };

    loadMaps().catch(() => {
      if (mounted) {
        setGoogleMapsFailed(true);
        setMapReady(false);
        map.current = null;
      }
    });

    return () => {
      mounted = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (window.gm_authFailure !== previousAuthFailure) window.gm_authFailure = previousAuthFailure;
      // Do not remove a script that another component may be using.
      if (script && script.parentNode && script.id === 'kurali-google-maps-script' && !window.google?.maps) {
        script.parentNode.removeChild(script);
      }
    };
  }, [orderId, fallbackBuyerPoint?.lat, fallbackBuyerPoint?.lng]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const data = await trackingApi.getLiveTracking(orderId);
        if (!cancelled && data) setTracking(data);
      } catch (error) {
        // Keep the address map visible if live tracking is temporarily unavailable.
        console.warn('Unable to refresh live order tracking', error);
      }
    };
    setTracking(null);
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderId]);

  const buyerPoint = toPoint(tracking?.buyerLatitude, tracking?.buyerLongitude) || fallbackBuyerPoint;
  const riderPoint = toPoint(tracking?.agentLatitude, tracking?.agentLongitude);

  useEffect(() => {
    if (!map.current || !window.google?.maps || !tracking) return;
    if (buyerPoint) {
      if (!buyerMarker.current) {
        buyerMarker.current = new window.google.maps.Marker({
          map: map.current, position: buyerPoint, label: 'B', title: 'Delivery address',
        });
      } else buyerMarker.current.setPosition(buyerPoint);
    }
    if (riderPoint) {
      if (!riderMarker.current) {
        riderMarker.current = new window.google.maps.Marker({
          map: map.current, position: riderPoint, label: 'R', title: 'Delivery partner',
        });
      } else riderMarker.current.setPosition(riderPoint);
    } else if (riderMarker.current) {
      riderMarker.current.setMap(null);
      riderMarker.current = null;
    }

    const points: Point[] = [buyerPoint, riderPoint].filter((point): point is Point => Boolean(point));
    if (points.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach(point => bounds.extend(point));
      map.current.fitBounds(bounds, 60);
    } else if (points.length === 1) {
      map.current.setCenter(points[0]);
    }
  }, [tracking, buyerPoint?.lat, buyerPoint?.lng, riderPoint?.lat, riderPoint?.lng]);

  const fallbackPoint = riderPoint || buyerPoint || DEFAULT_KURALI;
  const bbox = [
    Math.max(-180, fallbackPoint.lng - 0.012),
    Math.max(-90, fallbackPoint.lat - 0.008),
    Math.min(180, fallbackPoint.lng + 0.012),
    Math.min(90, fallbackPoint.lat + 0.008),
  ].join(',');
  const useOpenStreetMap = !import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || googleMapsFailed;

  return (
    <div className="relative h-52 sm:h-64 bg-slate-100">
      {useOpenStreetMap ? (
        <iframe
          title="Live order map"
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${fallbackPoint.lat}%2C${fallbackPoint.lng}`}
        />
      ) : (
        <>
          <div ref={mapRef} className="absolute inset-0" />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 text-sm font-semibold text-slate-600">
              Loading map…
            </div>
          )}
        </>
      )}
      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1.5 text-[10px] font-black shadow">
          <Navigation className="h-3.5 w-3.5 text-amber-600" /> Rider
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1.5 text-[10px] font-black shadow">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Your address
        </span>
      </div>
      <div className="absolute bottom-3 right-3 rounded-xl bg-slate-950/90 px-3 py-2 text-[10px] font-bold text-white shadow">
        <RefreshCw className="mr-1.5 inline h-3 w-3 animate-spin" /> Live location updates every 5 seconds
      </div>
    </div>
  );
};
