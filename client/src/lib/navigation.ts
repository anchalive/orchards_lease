export type MapAppId = 'google' | 'apple' | 'waze' | 'osm' | 'mappls';
export type TravelMode = 'driving' | 'transit' | 'bicycling' | 'walking';

export interface MapAppOption {
  id: MapAppId;
  name: string;
  description: string;
  iconBg: string;
  textColor: string;
  badge?: string;
}

export const MAP_APP_OPTIONS: MapAppOption[] = [
  {
    id: 'google',
    name: 'Google Maps',
    description: 'Popular choice for driving, transit & turn-by-turn navigation',
    iconBg: 'bg-emerald-600',
    textColor: 'text-emerald-700',
    badge: 'Recommended',
  },
  {
    id: 'apple',
    name: 'Apple Maps',
    description: 'Best for iOS & macOS native navigation',
    iconBg: 'bg-blue-600',
    textColor: 'text-blue-700',
  },
  {
    id: 'waze',
    name: 'Waze',
    description: 'Community-based real-time traffic & road updates',
    iconBg: 'bg-cyan-500',
    textColor: 'text-cyan-700',
  },
  {
    id: 'mappls',
    name: 'Mappls (MapMyIndia)',
    description: 'Detailed Indian regional maps & turn-by-turn navigation',
    iconBg: 'bg-indigo-600',
    textColor: 'text-indigo-700',
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    description: 'Open source community driven mapping platform',
    iconBg: 'bg-teal-600',
    textColor: 'text-teal-700',
  },
];

export interface ModeEstimate {
  mode: TravelMode;
  label: string;
  icon: string;
  speedKmH: number;
  roadDistanceKm: number;
  travelTimeMin: number;
  formattedDistance: string;
  formattedTime: string;
}

/** Mode speed averages (km/h) for estimates */
const SPEED_CONFIG: Record<TravelMode, { label: string; icon: string; speed: number; roadMultiplier: number }> = {
  driving:   { label: 'Drive',   icon: '🚗', speed: 50,  roadMultiplier: 1.28 },
  transit:   { label: 'Transit', icon: '🚌', speed: 32,  roadMultiplier: 1.35 },
  bicycling: { label: 'Cycle',   icon: '🚴', speed: 15,  roadMultiplier: 1.18 },
  walking:   { label: 'Walk',    icon: '🚶', speed: 4.8, roadMultiplier: 1.12 },
};

/**
 * Calculates mode estimates from straight-line distance (km)
 */
export function getModeEstimates(straightKm: number): ModeEstimate[] {
  const modes: TravelMode[] = ['driving', 'transit', 'bicycling', 'walking'];

  return modes.map((mode) => {
    const cfg = SPEED_CONFIG[mode];
    const roadKm = straightKm * cfg.roadMultiplier;
    const timeMin = Math.round((roadKm / cfg.speed) * 60);

    const formattedDist = roadKm < 1 ? `${Math.round(roadKm * 1000)} m` : `${roadKm.toFixed(1)} km`;

    let formattedTime = '';
    if (timeMin < 60) {
      formattedTime = `~${Math.max(1, timeMin)} min`;
    } else {
      const hrs = (timeMin / 60).toFixed(1);
      formattedTime = `~${hrs} hrs`;
    }

    return {
      mode,
      label: cfg.label,
      icon: cfg.icon,
      speedKmH: cfg.speed,
      roadDistanceKm: roadKm,
      travelTimeMin: timeMin,
      formattedDistance: formattedDist,
      formattedTime,
    };
  });
}

/**
 * Generates external navigation link URL for selected map app
 */
export function getNavigationUrl(
  app: MapAppId,
  destLat: number,
  destLng: number,
  destName?: string,
  originLat?: number,
  originLng?: number,
  mode: TravelMode = 'driving'
): string {
  switch (app) {
    case 'google': {
      const googleModes: Record<TravelMode, string> = {
        driving: 'driving',
        transit: 'transit',
        bicycling: 'bicycling',
        walking: 'walking',
      };
      const modeParam = googleModes[mode] || 'driving';
      if (originLat && originLng) {
        return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=${modeParam}`;
      }
      return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=${modeParam}`;
    }

    case 'apple': {
      const appleModes: Record<TravelMode, string> = {
        driving: 'd',
        transit: 'r',
        bicycling: 'c',
        walking: 'w',
      };
      const dirflg = appleModes[mode] || 'd';
      if (originLat && originLng) {
        return `https://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=${dirflg}`;
      }
      return `https://maps.apple.com/?daddr=${destLat},${destLng}&dirflg=${dirflg}`;
    }

    case 'waze': {
      return `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
    }

    case 'mappls': {
      if (originLat && originLng) {
        return `https://www.mappls.com/direction?start=${originLat},${originLng}&destination=${destLat},${destLng}`;
      }
      return `https://www.mappls.com/direction?destination=${destLat},${destLng}`;
    }

    case 'osm': {
      const osmEngine: Record<TravelMode, string> = {
        driving: 'graphhopper_car',
        transit: 'graphhopper_car',
        bicycling: 'graphhopper_bicycle',
        walking: 'graphhopper_foot',
      };
      const engine = osmEngine[mode] || 'graphhopper_car';
      if (originLat && originLng) {
        return `https://www.openstreetmap.org/directions?engine=${engine}&route=${originLat}%2C${originLng}%3B${destLat}%2C${destLng}`;
      }
      return `https://www.openstreetmap.org/?mlat=${destLat}&mlon=${destLng}#map=14/${destLat}/${destLng}`;
    }

    default:
      return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
  }
}
