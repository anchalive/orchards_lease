import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/format';
import type { Booking, Orchard } from '@/types';

interface RenewalModalProps {
  booking: Booking;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (newEndDate: string, message: string) => void;
}

export function RenewalModal({ booking, submitting, onClose, onConfirm }: RenewalModalProps) {
  const orchard = typeof booking.orchardId === 'object' ? (booking.orchardId as Orchard) : null;
  const currentEndDate = new Date(booking.endDate).toISOString().split('T')[0];

  const defaultNextDate = new Date(new Date(booking.endDate).setMonth(new Date(booking.endDate).getMonth() + 6))
    .toISOString()
    .split('T')[0];

  const [newEndDate, setNewEndDate] = useState(defaultNextDate);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(newEndDate, message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="p-6 space-y-5 w-full max-w-lg bg-cream rounded-2xl shadow-xl border border-sand">
        <div className="flex items-center justify-between border-b border-sand pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-cream">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-ink">Request Lease Renewal</h3>
              <p className="text-xs text-sub">{orchard?.gardenName || 'Current Orchard Lease'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-faint hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-sand bg-paper p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-faint">Current Lease Start:</span>
              <span className="font-bold text-ink">{formatDate(booking.startDate)}</span>
            </div>
            <div className="flex justify-between border-t border-sand/50 pt-2">
              <span className="text-faint">Current Expiry Date:</span>
              <span className="font-bold text-forest">{formatDate(booking.endDate)}</span>
            </div>
            {orchard && (
              <div className="flex justify-between border-t border-sand/50 pt-2">
                <span className="text-faint">Standard Rate:</span>
                <span className="font-bold text-terra">{formatCurrency(orchard.price)} / {orchard.rentType}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-sub mb-1.5">
              Extended Expiry Date
            </label>
            <Input
              type="date"
              min={currentEndDate}
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-sub mb-1.5">
              Note to Owner (Optional)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="E.g., Requesting a 6-month extension for the upcoming seasonal crop harvest..."
              className="h-20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Submit Renewal Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}