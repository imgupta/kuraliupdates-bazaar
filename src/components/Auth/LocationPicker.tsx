import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin, Search, ShieldCheck } from 'lucide-react';

export interface DeliveryLocation {
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  value: DeliveryLocation | null;
  onChange: (location: DeliveryLocation) => void;
}

declare global {
  interface Window { google?: any; }
}

const DEFAULT_CENTER = { lat: 30.903, lng: 76.426 };

export const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapInstance = useRef<any>(null);
  const marker = useRef<any>(null);
  const autocomplete = useRef<any>(null);
  const [ready, setReady] = useState(Boolean(window.google?.maps));
  const [loading, setLoading] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!key) {
      setPermissionMessage('Maps is not configured yet. Add VITE_GOOGLE_MAPS_API_KEY in Vercel.');
      return;
    }
    if (window.google?.maps) {
      setReady(true);
      return;
    }
    const existing = document.querySelector('script[data-kurali-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => setReady(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.kuraliGoogleMaps = 'true';
    script.onload = () => setReady(true);
    script.onerror = () => setPermissionMessage('Unable to load Google Maps. Please check the Maps API key and enabled APIs.');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    const center = value ? { lat: value.latitude, lng: value.longitude } : DEFAULT_CENTER;
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: value ? 17 : 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
    marker.current = new window.google.maps.Marker({
      map: mapInstance.current,
      position: center,
      draggable: true,
      title: 'Delivery location',
    });
    marker.current.addListener('dragend', async () => {
      const position = marker.current.getPosition();
      await reverseGeocode(position.lat(), position.lng());
    });
    if (searchRef.current) {
      autocomplete.current = new window.google.maps.places.Autocomplete(searchRef.current, {
        fields: ['place_id', 'formatted_address', 'geometry'],
        componentRestrictions: { country: 'in' },
      });
      autocomplete.current.addListener('place_changed', () => {
        const place = autocomplete.current.getPlace();
        if (!place.geometry?.location) return;
        const location = {
          formattedAddress: place.formatted_address || '',
          placeId: place.place_id || '',
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        };
        mapInstance.current.setCenter({ lat: location.latitude, lng: location.longitude });
        mapInstance.current.setZoom(18);
        marker.current.setPosition({ lat: location.latitude, lng: location.longitude });
        onChange(location);
      });
    }
    return () => {
      if (autocomplete.current && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(autocomplete.current);
      if (marker.current && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(marker.current);
    };
  }, [ready]);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    setLoading(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
      const result = response.results?.[0];
      onChange({
        formattedAddress: result?.formatted_address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        placeId: result?.place_id || '',
        latitude,
        longitude,
      });
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    setPermissionMessage('');
    if (!navigator.geolocation) {
      setPermissionMessage('Location services are not supported on this device.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        mapInstance.current?.setCenter({ lat: latitude, lng: longitude });
        mapInstance.current?.setZoom(18);
        marker.current?.setPosition({ lat: latitude, lng: longitude });
        reverseGeocode(latitude, longitude);
      },
      error => {
        setLoading(false);
        setPermissionMessage(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. You can still search your address or drag the pin.'
          : 'Unable to get your current location. Search your address or drag the pin.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">Set your delivery location</p>
            <p className="text-[11px] text-slate-500 mt-1">Search your address, use your location, then adjust the pin exactly where the rider should arrive.</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        </div>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input ref={searchRef} className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white" placeholder="Search flat, building, street or landmark" />
          </div>
          <button type="button" onClick={useCurrentLocation} disabled={!ready || loading} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
            <Crosshair className="w-4 h-4" /> Locate me
          </button>
        </div>
      </div>
      <div ref={mapRef} className="h-56 sm:h-64 bg-slate-100" />
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Pinned address</p>
            <p className="text-sm font-semibold text-slate-800">{value?.formattedAddress || 'Search an address or drop the pin on your exact location'}</p>
          </div>
        </div>
        {permissionMessage && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">{permissionMessage}</p>}
        {value && <p className="text-[10px] text-slate-400">Coordinates: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}{loading ? ' • updating…' : ''}</p>}
      </div>
    </section>
  );
};