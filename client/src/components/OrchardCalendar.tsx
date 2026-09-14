import React, { useState, useEffect } from 'react';

interface DateRange {
  startDate: string;
  endDate: string;
  note?: string;
}

interface OrchardCalendarProps {
  orchardId: string;
  isOwner?: boolean;
}

export const OrchardCalendar: React.FC<OrchardCalendarProps> = ({ orchardId }) => {
  const [availabilityDates, setAvailabilityDates] = useState<DateRange[]>([]);
  const [blockedDates, setBlockedDates] = useState<DateRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const response = await fetch(`/api/orchards/${orchardId}/availability`);
        const json = await response.json();

        if (response.ok) {
          setAvailabilityDates(json.data.availabilityDates || []);
          setBlockedDates(json.data.blockedDates || []);
        } else {
          setError(json.message || 'Failed to load availability calendar');
        }
      } catch (err) {
        setError('Network error fetching calendar details');
      } finally {
        setLoading(false);
      }
    };

    if (orchardId) fetchAvailability();
  }, [orchardId]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading availability calendar...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Orchard Availability Calendar</h3>

      {/* Available Ranges */}
      <div>
        <h4 className="text-sm font-medium text-green-700 mb-2">Available Lease Periods</h4>
        {availabilityDates.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No specific availability dates set by owner.</p>
        ) : (
          <ul className="space-y-1">
            {availabilityDates.map((range, idx) => (
              <li key={idx} className="text-xs bg-green-50 text-green-800 p-2 rounded border border-green-200">
                {new Date(range.startDate).toLocaleDateString()} &ndash; {new Date(range.endDate).toLocaleDateString()}
                {range.note && <span className="ml-2 text-gray-500">({range.note})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Blocked Ranges */}
      <div>
        <h4 className="text-sm font-medium text-red-700 mb-2">Blocked / Reserved Dates</h4>
        {blockedDates.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No blocked dates.</p>
        ) : (
          <ul className="space-y-1">
            {blockedDates.map((range, idx) => (
              <li key={idx} className="text-xs bg-red-50 text-red-800 p-2 rounded border border-red-200">
                {new Date(range.startDate).toLocaleDateString()} &ndash; {new Date(range.endDate).toLocaleDateString()}
                {range.note && <span className="ml-2 text-gray-500">({range.note})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default OrchardCalendar;