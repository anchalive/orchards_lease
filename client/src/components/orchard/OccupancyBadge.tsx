import type { OccupancyStatus } from '@/types';

const STYLES: Record<OccupancyStatus, string> = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  leased: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-gray-200 text-gray-700',
};

const LABELS: Record<OccupancyStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  leased: 'Leased',
  maintenance: 'Maintenance',
};

export const OccupancyBadge = ({ status }: { status: OccupancyStatus }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STYLES[status]}`}>
    {LABELS[status]}
  </span>
);