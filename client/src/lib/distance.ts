import type { Orchard } from '@/types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistanceInfo {
  straightKm: number;
  roadKm: number;
  travelTimeMin: number;
  formattedDistance: string;
  formattedRoadDistance: string;
  formattedTravelTime: string;
}

/** Fallback coordinates for major fruit-producing districts and states in India */
const DISTRICT_CENTROIDS: Record<string, Coordinates> = {
  ratnagiri: { lat: 16.9944, lng: 73.3 },
  devgad: { lat: 16.3833, lng: 73.3833 },
  sindhudurg: { lat: 16.12, lng: 73.68 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  junagadh: { lat: 21.5222, lng: 70.4579 },
  valsad: { lat: 20.61, lng: 72.93 },
  shimla: { lat: 31.1048, lng: 77.1734 },
  kullu: { lat: 31.9579, lng: 77.1095 },
  kinnaur: { lat: 31.651, lng: 78.4752 },
  srinagar: { lat: 34.0837, lng: 74.7973 },
  sopore: { lat: 34.2981, lng: 74.4673 },
  baramulla: { lat: 34.2, lng: 74.34 },
  muzaffarpur: { lat: 26.1209, lng: 85.3647 },
  samastipur: { lat: 25.8627, lng: 85.7811 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  malihabad: { lat: 26.9208, lng: 80.7136 },
  salem: { lat: 11.6643, lng: 78.146 },
  chittoor: { lat: 13.2172, lng: 79.1003 },
  anantapur: { lat: 14.6819, lng: 77.6006 },
  coorg: { lat: 12.3375, lng: 75.8069 },
  wayanad: { lat: 11.6854, lng: 76.132 },
  maharashtra: { lat: 19.7515, lng: 75.7139 },
  gujarat: { lat: 22.2587, lng: 71.1924 },
  'himachal pradesh': { lat: 31.1048, lng: 77.1734 },
  'jammu and kashmir': { lat: 33.7782, lng: 76.5762 },
  bihar: { lat: 25.0961, lng: 85.3131 },
  'uttar pradesh': { lat: 26.8467, lng: 80.9462 },
  'tamil nadu': { lat: 11.1271, lng: 78.6569 },
  'andhra pradesh': { lat: 15.9129, lng: 79.74 },
  karnataka: { lat: 15.3173, lng: 75.7139 },
  kerala: { lat: 10.8505, lng: 76.2711 },
};

/**
 * Calculates straight-line distance using the Haversine formula (returns distance in km)
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Estimates driving road distance from straight-line distance (1.28x average factor) */
export function estimateRoadDistance(straightKm: number): number {
  return straightKm * 1.28;
}

/** Estimates travel time in minutes based on road distance (approx 50 km/h average) */
export function estimateTravelTime(roadKm: number): number {
  const avgSpeedKmH = 50;
  return Math.round((roadKm / avgSpeedKmH) * 60);
}

/** Formats kilometers into readable string (e.g. "850 m", "14.2 km", "120 km") */
export function formatDistance(distKm: number): string {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`;
  }
  if (distKm < 10) {
    return `${distKm.toFixed(1)} km`;
  }
  return `${Math.round(distKm)} km`;
}

/** Formats travel time minutes into readable string (e.g. "~15 min drive", "~2.5 hrs drive") */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `~${Math.max(1, minutes)} min drive`;
  }
  const hrs = (minutes / 60).toFixed(1);
  return `~${hrs} hrs drive`;
}

/** Obtains valid coordinates for an orchard or uses fallback district/state centroid */
export function getOrchardCoordinates(orchard: Orchard): Coordinates | null {
  if (typeof orchard.latitude === 'number' && typeof orchard.longitude === 'number') {
    if (!isNaN(orchard.latitude) && !isNaN(orchard.longitude)) {
      return { lat: orchard.latitude, lng: orchard.longitude };
    }
  }

  const dKey = (orchard.district || '').toLowerCase().trim();
  if (DISTRICT_CENTROIDS[dKey]) {
    return DISTRICT_CENTROIDS[dKey];
  }

  const sKey = (orchard.state || '').toLowerCase().trim();
  if (DISTRICT_CENTROIDS[sKey]) {
    return DISTRICT_CENTROIDS[sKey];
  }

  // Fallback to central India (Nagpur area) if no district match
  return { lat: 21.1458, lng: 79.0882 };
}

/** Full calculation bundle from user position to orchard */
export function getDistanceInfo(
  userLat: number,
  userLng: number,
  orchard: Orchard
): DistanceInfo | null {
  const coords = getOrchardCoordinates(orchard);
  if (!coords) return null;

  const straightKm = calculateHaversineDistance(userLat, userLng, coords.lat, coords.lng);
  const roadKm = estimateRoadDistance(straightKm);
  const travelTimeMin = estimateTravelTime(roadKm);

  return {
    straightKm,
    roadKm,
    travelTimeMin,
    formattedDistance: formatDistance(straightKm),
    formattedRoadDistance: formatDistance(roadKm),
    formattedTravelTime: formatTravelTime(travelTimeMin),
  };
}
