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
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}

type Point = { lat: number; lng: number };
const DEFAULT_CENTER: Point = { lat: 30.903, lng: 76.426 };

const validPoint = (latitude: unknown, longitude: unknown): Point | null => {
  if (latitude === null || latitude === undefined || latitude === '' ||
      longitude === null || longitude === undefined || longitude === '') return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};

const reverseGeocodeOsm = async (latitude: number, longitude: number): Promise<DeliveryLocation> => {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '18',
    addressdetails: '1',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('OpenStreetMap address lookup failed');
  const result = await response.json();
  return {
    formattedAddress: result.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    placeId: result.place_id ? `osm:${result.place_id}` : '',
    latitude,
    longitude,
  };
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapInstance = useRef<any>(null);
  const marker = useRef<any>(null);
  const autocomplete = useRef<any>(null);
  const [ready, setReady] = useState(Boolean(window.google?.maps));
  const [fallbackMode, setFallbackMode] = useState(!import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim());
  const [loading, setLoading] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [searchText, setSearchText] = useState(value?.formattedAddress || '');
  const point = validPoint(value?.latitude, value?.longitude) || DEFAULT_CENTER;
  const bbox = [
    Math.max(-180, point.lng - 0.012),
    Math.max(-90, point.lat - 0.008),
    Math.min(180, point.lng + 0.012),
    Math.min(90, point.lat + 0.008),
  ].join(',');

  useEffect(() => {
    let active = true;
    let timeoutId: number | undefined;
    let script: HTMLScriptElement | null = null;
    const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
    const previousAuthFailure = window.gm_authFailure;

    if (!key) {
      setFallbackMode(true);
      setPermissionMessage('Using OpenStreetMap because Google Maps is not configured.');
      return () => { active = false; };
    }

    window.gm_authFailure = () => {
      previousAuthFailure?.();
      if (active) {
        setFallbackMode(true);
        setReady(false);
        setPermissionMessage('Google Maps could not authorize this key. OpenStreetMap is available instead.');
      }
    };

    if (window.google?.maps) {
      setReady(true);
      setFallbackMode(false);
    } else {
      const load = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-kurali-google-maps]');
        if (existing) {
          if (window.google?.maps) {
            resolve();
            return;
          }
          existing.addEventListener('load', () => resolve(), { once: true });
          existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), { once: true });
        } else {
          script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.dataset.kuraliGoogleMaps = 'true';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Google Maps script failed to load'));
          document.head.appendChild(script);
        }
        timeoutId = window.setTimeout(() => reject(new Error('Google Maps initialization timed out')), 10000);
      });
      load.then(() => {
        if (active && window.google?.maps) {
          setReady(true);
          setFallbackMode(false);
        } else if (active) {
          setFallbackMode(true);
          setPermissionMessage('Google Maps did not initialize. OpenStreetMap is available instead.');
        }
      }).catch(() => {
        if (active) {
          setFallbackMode(true);
          setReady(false);
          setPermissionMessage('Unable to load Google Maps. OpenStreetMap is available instead.');
        }
      });
    }

    return () => {
      active = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (window.gm_authFailure !== previousAuthFailure) window.gm_authFailure = previousAuthFailure;
      if (script?.parentNode && !window.google?.maps) script.parentNode.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!ready || fallbackMode || !mapRef.current || !window.google?.maps) return;
    const center = validPoint(value?.latitude, value?.longitude) || DEFAULT_CENTER;
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
      await updateFromCoordinates(position.lat(), position.lng());
    });
    if (searchRef.current && window.google.maps.places) {
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
        setSearchText(location.formattedAddress);
        onChange(location);
      });
    }
    return () => {
      if (autocomplete.current && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(autocomplete.current);
      if (marker.current && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(marker.current);
    };
  }, [ready, fallbackMode]);

  useEffect(() => {
    if (!mapInstance.current || !marker.current || !value || fallbackMode) return;
    const position = { lat: value.latitude, lng: value.longitude };
    mapInstance.current.setCenter(position);
    marker.current.setPosition(position);
  }, [value?.latitude, value?.longitude, fallbackMode]);

  const updateFromCoordinates = async (latitude: number, longitude: number) => {
    setLoading(true);
    setPermissionMessage('');
    try {
      if (!fallbackMode && window.google?.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
        const result = response.results?.[0];
        const location = {
          formattedAddress: result?.formatted_address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          placeId: result?.place_id || '',
          latitude,
          longitude,
        };
        setSearchText(location.formattedAddress);
        onChange(location);
      } else {
        const location = await reverseGeocodeOsm(latitude, longitude);
        setSearchText(location.formattedAddress);
        onChange(location);
      }
    } catch {
      const location = {
        formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        placeId: '',
        latitude,
        longitude,
      };
      setSearchText(location.formattedAddress);
      onChange(location);
      setPermissionMessage('Address lookup failed; coordinates were saved. You can continue or search for an address.');
    } finally {
      setLoading(false);
    }
  };

  const searchOsmAddress = async () => {
    const query = searchText.trim();
    if (!query) {
      setPermissionMessage('Enter an address or landmark to search.');
      return;
    }
    setLoading(true);
    setPermissionMessage('');
    try {
      const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', countrycodes: 'in' });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('OpenStreetMap address search failed');
      const results = await response.json();
      if (!results.length) {
        setPermissionMessage('No matching address found. Try a nearby landmark or use Locate me.');
        return;
      }
      const result = results[0];
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      const location = {
        formattedAddress: result.display_name || query,
        placeId: result.place_id ? `osm:${result.place_id}` : '',
        latitude,
        longitude,
      };
      setSearchText(location.formattedAddress);
      onChange(location);
    } catch {
      setPermissionMessage('Address search is temporarily unavailable. You can still use Locate me.');
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
        if (!fallbackMode && mapInstance.current && marker.current) {
          mapInstance.current.setCenter({ lat: latitude, lng: longitude });
          mapInstance.current.setZoom(18);
          marker.current.setPosition({ lat: latitude, lng: longitude });
        }
        void updateFromCoordinates(latitude, longitude);
      },
      error => {
        setLoading(false);
        setPermissionMessage(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Search your address instead.'
          : 'Unable to get your current location. Search your address or try again.');
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
            <input
              ref={searchRef}
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && fallbackMode) { event.preventDefault(); void searchOsmAddress(); } }}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white"
              placeholder="Search flat, building, street or landmark"
            />
          </div>
          {fallbackMode && (
            <button type="button" onClick={() => void searchOsmAddress()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-800 disabled:opacity-50">
              Search
            </button>
          )}
          <button type="button" onClick={useCurrentLocation} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
            <Crosshair className="w-4 h-4" /> Locate me
          </button>
        </div>
      </div>
      {fallbackMode ? (
        <iframe
          title="Delivery location map"
          className="h-56 w-full border-0 bg-slate-100 sm:h-64"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${point.lat}%2C${point.lng}`}
        />
      ) : (
        <div ref={mapRef} className="h-56 bg-slate-100 sm:h-64" />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Pinned address</p>
            <p className="text-sm font-semibold text-slate-800">{value?.formattedAddress || 'Search an address or use your current location'}</p>
          </div>
        </div>
        {fallbackMode && <p className="text-[10px] text-slate-500">Map fallback: OpenStreetMap. Search an address or use Locate me to set the pin.</p>}
        {permissionMessage && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">{permissionMessage}</p>}
        {value && <p className="text-[10px] text-slate-400">Coordinates: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}{loading ? ' • updating…' : ''}</p>}
      </div>
    </section>
  );
};
