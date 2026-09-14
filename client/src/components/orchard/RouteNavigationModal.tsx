import { useState } from 'react';
import {
  Navigation,
  MapPin,
  ExternalLink,
  Compass,
  Locate,
  X,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import {
  MAP_APP_OPTIONS,
  getModeEstimates,
  getNavigationUrl,
  type MapAppId,
  type TravelMode,
} from '@/lib/navigation';
import { calculateHaversineDistance, getOrchardCoordinates } from '@/lib/distance';
import type { Orchard } from '@/types';

interface RouteNavigationModalProps {
  orchard: Orchard;
  isOpen: boolean;
  onClose: () => void;
}

export function RouteNavigationModal({ orchard, isOpen, onClose }: RouteNavigationModalProps) {
  const { userLocation, status, requestLocation } = useLocation();
  const [selectedMode, setSelectedMode] = useState<TravelMode>('driving');
  const [selectedApp, setSelectedApp] = useState<MapAppId>('google');

  if (!isOpen) return null;

  const orchardCoords = getOrchardCoordinates(orchard);
  const destLat = orchardCoords?.lat ?? orchard.latitude ?? 20.5937;
  const destLng = orchardCoords?.lng ?? orchard.longitude ?? 78.9629;

  // Calculate straight-line distance if user location is available, or fallback
  const userLat = userLocation?.lat;
  const userLng = userLocation?.lng;
  const straightKm = userLat && userLng
    ? calculateHaversineDistance(userLat, userLng, destLat, destLng)
    : 15.5; // Demo fallback straight-line distance if no GPS

  const modeEstimates = getModeEstimates(straightKm);
  const activeEstimate = modeEstimates.find((m) => m.mode === selectedMode) || modeEstimates[0];

  const handleStartNavigation = (appId: MapAppId) => {
    const url = getNavigationUrl(
      appId,
      destLat,
      destLng,
      orchard.gardenName,
      userLat,
      userLng,
      selectedMode
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-cream border border-sand shadow-pop animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand/60 px-6 py-4 bg-white/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-cream shadow-sm">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-ink">Route Navigation</h3>
              <p className="text-xs text-sub">One-click navigation to {orchard.gardenName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-sub hover:bg-sand/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {/* Origin & Destination Route Summary Card */}
          <div className="rounded-2xl border border-sand bg-white p-4 space-y-3 shadow-xs">
            {/* Origin */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-blue-500 ring-4 ring-blue-100 flex-none" />
                <div>
                  <span className="font-semibold text-ink">From: </span>
                  <span className="text-sub">
                    {userLocation ? (userLocation.name || 'Your Location') : 'Current GPS / Device Location'}
                  </span>
                </div>
              </div>
              {!userLocation && (
                <button
                  onClick={requestLocation}
                  disabled={status === 'locating'}
                  className="flex items-center gap-1 font-bold text-forest hover:underline disabled:opacity-50"
                >
                  <Locate className="h-3.5 w-3.5" />
                  {status === 'locating' ? 'Locating...' : 'Detect GPS'}
                </button>
              )}
            </div>

            {/* Connecting Route Line */}
            <div className="ml-1.5 border-l-2 border-dashed border-sand h-3" />

            {/* Destination */}
            <div className="flex items-center gap-2.5 text-xs">
              <MapPin className="h-4 w-4 text-terra flex-none" />
              <div>
                <span className="font-semibold text-ink">To: </span>
                <span className="text-forest font-bold">{orchard.gardenName}</span>
                <span className="text-faint ml-1 font-normal">
                  ({orchard.district}, {orchard.state})
                </span>
              </div>
            </div>

            {userLocation && (
              <div className="pt-2 border-t border-sand/40 flex items-center justify-between text-[11.5px] text-forest font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> User location synced
                </span>
                <span className="font-mono text-faint">
                  {userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°
                </span>
              </div>
            )}
          </div>

          {/* Travel Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
              Select Travel Mode
            </label>
            <div className="grid grid-cols-4 gap-2">
              {modeEstimates.map((est) => {
                const isSelected = selectedMode === est.mode;
                return (
                  <button
                    key={est.mode}
                    onClick={() => setSelectedMode(est.mode)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                      isSelected
                        ? 'border-forest bg-forest text-cream shadow-md scale-[1.02]'
                        : 'border-sand bg-white text-ink hover:bg-chip hover:border-forest/40'
                    }`}
                  >
                    <span className="text-xl mb-1">{est.icon}</span>
                    <span className="text-xs font-bold">{est.label}</span>
                    <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-cream/90 font-medium' : 'text-faint'}`}>
                      {est.formattedTime}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Mode Metrics Banner */}
          <div className="rounded-2xl bg-forest/5 border border-forest/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{activeEstimate.icon}</div>
              <div>
                <div className="text-sm font-bold text-forest">
                  Estimated Travel: {activeEstimate.formattedTime}
                </div>
                <div className="text-xs text-sub">
                  Approx. {activeEstimate.formattedDistance} road route ({activeEstimate.label} speed ~{activeEstimate.speedKmH} km/h)
                </div>
              </div>
            </div>
            <Sparkles className="h-5 w-5 text-forest/40" />
          </div>

          {/* Map Provider Selection */}
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
              Choose Navigation App
            </label>
            <div className="space-y-2">
              {MAP_APP_OPTIONS.map((app) => {
                const isSelected = selectedApp === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app.id)}
                    className={`group flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-forest bg-white shadow-sm ring-2 ring-forest/20'
                        : 'border-sand bg-white/60 hover:bg-white hover:border-sand'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-xs ${app.iconBg}`}
                      >
                        {app.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink">{app.name}</span>
                          {app.badge && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                              {app.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-sub">{app.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartNavigation(app.id);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest text-cream text-xs font-bold hover:bg-forest-dark transition-colors shadow-xs"
                    >
                      Launch
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-sand/60 px-6 py-4 bg-white/70 flex items-center justify-between">
          <span className="text-xs text-faint flex items-center gap-1">
            <Compass className="h-3.5 w-3.5" /> Turn-by-turn route directions
          </span>
          <button
            onClick={() => handleStartNavigation(selectedApp)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest text-cream font-bold text-xs hover:bg-forest-dark transition-all shadow-md"
          >
            Start Navigation in {MAP_APP_OPTIONS.find((a) => a.id === selectedApp)?.name}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
