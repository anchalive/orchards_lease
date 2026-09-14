import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// @ts-ignore
import L from 'leaflet';
import { Navigation, Compass, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { RouteNavigationModal } from './RouteNavigationModal';
import type { Orchard } from '@/types';

// Fix default Leaflet icon assets in React
const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface OrchardMapProps {
  latitude?: number;
  longitude?: number;
  gardenName: string;
  district: string;
  state: string;
  address?: string;
  orchard?: Orchard;
}

// Fallback coordinates for district centers if coordinates are not provided
const defaultCoordinates: Record<string, [number, number]> = {
  default: [20.5937, 78.9629], // India Center
};

export function OrchardMap({
  latitude,
  longitude,
  gardenName,
  district,
  state,
  address,
  orchard,
}: OrchardMapProps) {
  const [navModalOpen, setNavModalOpen] = useState(false);

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number' && latitude !== 0 && longitude !== 0;
  
  // Use provided coordinates or general fallback
  const position: [number, number] = hasCoords
    ? [latitude!, longitude!]
    : defaultCoordinates.default;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${position[0]},${position[1]}`;

  // Synthetic Orchard object if full object is not passed
  const targetOrchard: Orchard = orchard || ({
    _id: 'map_orchard',
    gardenName,
    district,
    state,
    address,
    latitude: position[0],
    longitude: position[1],
  } as any);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-sand bg-cream shadow-sm">
        <div className="flex items-center justify-between border-b border-sand/60 px-5 py-3 bg-paper/50">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-forest" />
            <span className="text-sm font-bold text-ink">Location &amp; Map Navigation</span>
          </div>
          <button
            onClick={() => setNavModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest text-cream text-xs font-bold hover:bg-forest-dark transition-all shadow-xs"
          >
            <Compass className="h-3.5 w-3.5" />
            Route Navigation
          </button>
        </div>

        <div className="relative h-[320px] w-full z-0">
          <MapContainer
            center={position}
            zoom={hasCoords ? 13 : 6}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position} icon={customIcon}>
              <Popup>
                <div className="p-1 text-center">
                  <strong className="block text-sm text-forest font-serif">{gardenName}</strong>
                  <span className="text-xs text-gray-600">
                    {address ? `${address}, ` : ''}{district}, {state}
                  </span>
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <button
                      onClick={() => setNavModalOpen(true)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-forest px-3 py-1 text-xs text-white font-semibold"
                    >
                      <Navigation className="h-3 w-3" /> Start Navigation
                    </button>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 underline font-semibold"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        <div className="p-4 bg-cream border-t border-sand/60 text-xs text-sub flex justify-between items-center">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-terra" /> {address ? `${address}, ` : ''}{district}, {state}
          </span>
          <span className="font-mono text-faint">
            {position[0].toFixed(4)}° N, {position[1].toFixed(4)}° E
          </span>
        </div>
      </div>

      {/* Navigation Modal */}
      <RouteNavigationModal
        orchard={targetOrchard}
        isOpen={navModalOpen}
        onClose={() => setNavModalOpen(false)}
      />
    </>
  );
}