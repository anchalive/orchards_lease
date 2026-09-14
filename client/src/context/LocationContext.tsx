import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Orchard } from '@/types';
import { getDistanceInfo, type Coordinates, type DistanceInfo } from '@/lib/distance';

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported';

export interface UserLocation extends Coordinates {
  name?: string;
  isCustom?: boolean;
}

interface LocationContextType {
  userLocation: UserLocation | null;
  status: LocationStatus;
  error: string | null;
  requestLocation: () => Promise<void>;
  setCustomLocation: (lat: number, lng: number, name?: string) => void;
  clearLocation: () => void;
  getDistanceTo: (orchard: Orchard) => DistanceInfo | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = 'orchard_user_location';

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [status, setStatus] = useState<LocationStatus>(() => {
    if (userLocation) return 'granted';
    if (!('geolocation' in navigator)) return 'unsupported';
    return 'idle';
  });

  const [error, setError] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      if (userLocation) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userLocation));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [userLocation]);

  const requestLocation = async () => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      setError('Geolocation is not supported by your browser');
      return;
    }

    setStatus('locating');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'Current Location',
          isCustom: false,
        };
        setUserLocation(loc);
        setStatus('granted');
      },
      (err) => {
        setStatus('denied');
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location access was denied. You can manually enter your location.');
        } else {
          setError('Unable to retrieve location.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  };

  const setCustomLocation = (lat: number, lng: number, name = 'Custom Location') => {
    setUserLocation({ lat, lng, name, isCustom: true });
    setStatus('granted');
    setError(null);
  };

  const clearLocation = () => {
    setUserLocation(null);
    setStatus('idle');
    setError(null);
  };

  const getDistanceTo = (orchard: Orchard): DistanceInfo | null => {
    if (!userLocation) return null;
    return getDistanceInfo(userLocation.lat, userLocation.lng, orchard);
  };

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        status,
        error,
        requestLocation,
        setCustomLocation,
        clearLocation,
        getDistanceTo,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return ctx;
}
