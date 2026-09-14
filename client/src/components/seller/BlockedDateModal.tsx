import React, { useState } from 'react';
import { X, Calendar, Wrench, Sprout, Lock, AlertCircle } from 'lucide-react';
import { availabilityService } from '@/services/availability.service';
import type { BlockedDate, BlockedDateReason } from '@/types';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/apiClient';

interface BlockedDateModalProps {
  orchardId: string;
  existingBlock?: BlockedDate | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BlockedDateModal: React.FC<BlockedDateModalProps> = ({
  orchardId,
  existingBlock,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const isEditing = !!existingBlock?._id;

  const [startDate, setStartDate] = useState(
    existingBlock?.startDate ? new Date(existingBlock.startDate).toISOString().slice(0, 10) : ''
  );
  const [endDate, setEndDate] = useState(
    existingBlock?.endDate ? new Date(existingBlock.endDate).toISOString().slice(0, 10) : ''
  );
  const [reason, setReason] = useState<BlockedDateReason>(existingBlock?.reason || 'Maintenance');
  const [note, setNote] = useState(existingBlock?.note || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Please select both start date and end date.');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('Start date must be before end date.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && existingBlock?._id) {
        await availabilityService.updateBlockedDate(orchardId, existingBlock._id, {
          startDate,
          endDate,
          reason,
          note,
        });
        toast.success('Blocked period updated successfully');
      } else {
        await availabilityService.createBlockedDate(orchardId, {
          startDate,
          endDate,
          reason,
          note,
        });
        toast.success('Blocked period created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[rgba(28,36,22,.5)] p-4 backdrop-blur-[3px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[500px] animate-fadeup overflow-hidden rounded-3xl bg-cream shadow-pop border border-sand">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-chip px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-light/20 text-forest">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-ink">
                {isEditing ? 'Edit Blocked Period' : 'Block Dates for Orchard'}
              </h2>
              <p className="text-xs text-faint">Specify period for maintenance, harvest, or owner use</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-sand bg-cream text-sub hover:bg-chip transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
              <AlertCircle className="h-4 w-4 flex-none text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-faint mb-2">
              Reason for Blocking
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Maintenance' as const, label: 'Maintenance', icon: Wrench, color: 'hover:border-amber-400' },
                { id: 'Harvest' as const, label: 'Harvest Block', icon: Sprout, color: 'hover:border-purple-400' },
                { id: 'Personal' as const, label: 'Personal Use', icon: Lock, color: 'hover:border-slate-400' },
              ].map((item) => {
                const IconComp = item.icon;
                const isSelected = reason === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReason(item.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-forest bg-forest text-cream shadow-sm'
                        : `border-sand bg-white text-ink ${item.color}`
                    }`}
                  >
                    <IconComp className="h-4 w-4 mb-1" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-faint mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm font-semibold text-ink focus:border-forest focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-faint mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm font-semibold text-ink focus:border-forest focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-faint mb-1.5">
              Reason Details / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Scheduled orchard pruning and organic fertilizer treatment..."
              className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm text-ink placeholder:text-faint/70 focus:border-forest focus:outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-chip pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sand bg-white px-4 py-2.5 text-xs font-bold text-ink hover:bg-chip"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-cream hover:bg-forest-dark disabled:opacity-60 transition-colors shadow-sm"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Block' : 'Block Period'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockedDateModal;
